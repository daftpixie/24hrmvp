// ============================================
// 24HRMVP - THE GRID FORUM SERVICE
// File: backend/src/services/forum.ts
// Forum CRUD operations with ranking
// ============================================

import { prisma } from '../db/client';
import { 
  PostType, 
  ModerationStatus,
  ForumPost,
  Prisma 
} from '@prisma/client';
import {
  IForumService,
  ForumFeedParams,
  CreateForumPostDTO,
  UpdateForumPostDTO,
  ForumPostDTO,
  ForumFeedResponse,
  ForumThreadResponse,
  SortType,
} from '../types/grid';
import { RankingService } from './ranking';
import { cache, gridCache } from './redis';

// Slug generation utility
function generateSlug(title: string | undefined, id: string): string {
  if (title) {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    return `${baseSlug}-${id.substring(0, 8)}`;
  }
  return id;
}

export class ForumService implements IForumService {
  private rankingService: RankingService;

  constructor() {
    this.rankingService = new RankingService();
  }

  /**
   * Create a new forum post
   */
  async createPost(userId: string, data: CreateForumPostDTO): Promise<ForumPostDTO> {
    const id = crypto.randomUUID().replace(/-/g, '').substring(0, 25);
    const slug = generateSlug(data.title, id);

    // Calculate depth if it's a reply
    let depth = 0;
    if (data.parentId) {
      const parent = await prisma.forumPost.findUnique({
        where: { id: data.parentId },
        select: { depth: true },
      });
      if (parent) {
        depth = parent.depth + 1;
      }
    }

    const post = await prisma.forumPost.create({
      data: {
        id,
        slug,
        title: data.title,
        content: data.content,
        type: data.type || PostType.DISCUSSION, // UPPERCASE enum
        authorId: userId,
        parentId: data.parentId,
        ideaId: data.ideaId,
        depth,
        tags: data.tags || [],
        moderationStatus: ModerationStatus.APPROVED, // UPPERCASE enum
      },
      include: {
        author: {
          select: {
            id: true,
            fid: true,
            username: true,
            displayName: true,
            pfpUrl: true,
          },
        },
        _count: {
          select: {
            replies: true,
            votes: true,
            bookmarks: true,
          },
        },
      },
    });

    // Update parent reply count if this is a reply
    if (data.parentId) {
      await prisma.forumPost.update({
        where: { id: data.parentId },
        data: {
          replyCount: { increment: 1 },
          lastReplyAt: new Date(),
        },
      });
    }

    // Invalidate feed caches
    await gridCache.invalidatePost(slug);

    return this.mapToDTO(post);
  }

  /**
   * Get a single post by slug
   */
  async getPost(slug: string, userId?: string): Promise<ForumPostDTO | null> {
    // Check cache first
    const cacheKey = gridCache.keys.forumPost(slug);
    const cached = await cache.get<ForumPostDTO>(cacheKey);
    if (cached && !userId) {
      return cached;
    }

    const post = await prisma.forumPost.findUnique({
      where: { 
        slug,
        moderationStatus: ModerationStatus.APPROVED, // UPPERCASE
      },
      include: {
        author: {
          select: {
            id: true,
            fid: true,
            username: true,
            displayName: true,
            pfpUrl: true,
          },
        },
        _count: {
          select: {
            replies: true,
            votes: true,
            bookmarks: true,
          },
        },
      },
    });

    if (!post) return null;

    // Increment view count
    await prisma.forumPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });

    const dto = this.mapToDTO(post);

    // Get user-specific data if authenticated
    if (userId) {
      const [userVote, bookmark] = await Promise.all([
        prisma.forumPostVote.findUnique({
          where: { userId_postId: { userId, postId: post.id } },
          select: { value: true },
        }),
        prisma.forumBookmark.findUnique({
          where: { userId_postId: { userId, postId: post.id } },
        }),
      ]);

      dto.userVote = userVote?.value ?? null;
      dto.isBookmarked = !!bookmark;
    }

    // Cache without user-specific data
    if (!userId) {
      await cache.set(cacheKey, dto, gridCache.ttl.post);
    }

    return dto;
  }

  /**
   * Update a forum post
   */
  async updatePost(slug: string, userId: string, data: UpdateForumPostDTO): Promise<ForumPostDTO> {
    const post = await prisma.forumPost.findUnique({
      where: { slug },
      select: { id: true, authorId: true },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.authorId !== userId) {
      throw new Error('Not authorized to edit this post');
    }

    const updated = await prisma.forumPost.update({
      where: { id: post.id },
      data: {
        title: data.title,
        content: data.content,
        tags: data.tags,
        isPinned: data.isPinned,
        isLocked: data.isLocked,
      },
      include: {
        author: {
          select: {
            id: true,
            fid: true,
            username: true,
            displayName: true,
            pfpUrl: true,
          },
        },
        _count: {
          select: {
            replies: true,
            votes: true,
            bookmarks: true,
          },
        },
      },
    });

    await gridCache.invalidatePost(slug);

    return this.mapToDTO(updated);
  }

  /**
   * Delete a forum post (soft delete via moderation status)
   */
  async deletePost(slug: string, userId: string): Promise<void> {
    const post = await prisma.forumPost.findUnique({
      where: { slug },
      select: { id: true, authorId: true, parentId: true },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.authorId !== userId) {
      throw new Error('Not authorized to delete this post');
    }

    // Soft delete by setting moderation status to REJECTED
    await prisma.forumPost.update({
      where: { id: post.id },
      data: { moderationStatus: ModerationStatus.REJECTED }, // UPPERCASE
    });

    // Update parent reply count if this was a reply
    if (post.parentId) {
      await prisma.forumPost.update({
        where: { id: post.parentId },
        data: { replyCount: { decrement: 1 } },
      });
    }

    await gridCache.invalidatePost(slug);
  }

  /**
   * Get forum feed with sorting and filtering
   */
  async getFeed(params: ForumFeedParams, userId?: string): Promise<ForumFeedResponse> {
    const {
      sort = 'hot',
      type,
      timeframe = 'week',
      page = 1,
      limit = 20,
      authorId,
      ideaId,
      tags,
    } = params;

    // Build where clause
    const where: Prisma.ForumPostWhereInput = {
      parentId: null, // Top-level posts only
      moderationStatus: ModerationStatus.APPROVED, // UPPERCASE
    };

    if (type) {
      where.type = type;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (ideaId) {
      where.ideaId = ideaId;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    // Apply timeframe filter
    if (timeframe !== 'all') {
      const now = new Date();
      const timeframeMap: Record<string, number> = {
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000,
      };
      where.createdAt = {
        gte: new Date(now.getTime() - timeframeMap[timeframe]),
      };
    }

    // Build order by based on sort type
    const orderBy: Prisma.ForumPostOrderByWithRelationInput[] = this.getSortOrder(sort);

    // Get total count
    const total = await prisma.forumPost.count({ where });

    // Get posts
    const posts = await prisma.forumPost.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            fid: true,
            username: true,
            displayName: true,
            pfpUrl: true,
          },
        },
        _count: {
          select: {
            replies: true,
            votes: true,
            bookmarks: true,
          },
        },
      },
    });

    // Map to DTOs with user-specific data
    const postDTOs = await Promise.all(
      posts.map(async (post) => {
        const dto = this.mapToDTO(post);

        if (userId) {
          const [userVote, bookmark] = await Promise.all([
            prisma.forumPostVote.findUnique({
              where: { userId_postId: { userId, postId: post.id } },
              select: { value: true },
            }),
            prisma.forumBookmark.findUnique({
              where: { userId_postId: { userId, postId: post.id } },
            }),
          ]);

          dto.userVote = userVote?.value ?? null;
          dto.isBookmarked = !!bookmark;
        }

        return dto;
      })
    );

    return {
      posts: postDTOs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Get thread (post with replies)
   */
  async getThread(
    slug: string,
    params: { page?: number; limit?: number },
    userId?: string
  ): Promise<ForumThreadResponse> {
    const { page = 1, limit = 20 } = params;

    const post = await this.getPost(slug, userId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Get replies
    const [replies, total] = await Promise.all([
      prisma.forumPost.findMany({
        where: {
          parentId: post.id,
          moderationStatus: ModerationStatus.APPROVED, // UPPERCASE
        },
        orderBy: [
          { isPinned: 'desc' },
          { wilsonScore: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              fid: true,
              username: true,
              displayName: true,
              pfpUrl: true,
            },
          },
          _count: {
            select: {
              replies: true,
              votes: true,
              bookmarks: true,
            },
          },
        },
      }),
      prisma.forumPost.count({
        where: {
          parentId: post.id,
          moderationStatus: ModerationStatus.APPROVED, // UPPERCASE
        },
      }),
    ]);

    const replyDTOs = await Promise.all(
      replies.map(async (reply) => {
        const dto = this.mapToDTO(reply);

        if (userId) {
          const userVote = await prisma.forumPostVote.findUnique({
            where: { userId_postId: { userId, postId: reply.id } },
            select: { value: true },
          });
          dto.userVote = userVote?.value ?? null;
        }

        return dto;
      })
    );

    return {
      post,
      replies: replyDTOs,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Vote on a post
   */
  async vote(
    postId: string,
    userId: string,
    value: 1 | -1
  ): Promise<{ score: number; userVote: number }> {
    const existingVote = await prisma.forumPostVote.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    const scoreDelta = existingVote ? value - existingVote.value : value;

    await prisma.$transaction(async (tx) => {
      // Upsert vote
      await tx.forumPostVote.upsert({
        where: { userId_postId: { userId, postId } },
        update: { value },
        create: { userId, postId, value },
      });

      // Update post scores
      const updateData: Prisma.ForumPostUpdateInput = {
        score: { increment: scoreDelta },
      };

      if (value === 1 && (!existingVote || existingVote.value !== 1)) {
        updateData.upvotes = { increment: 1 };
        if (existingVote?.value === -1) {
          updateData.downvotes = { decrement: 1 };
        }
      } else if (value === -1 && (!existingVote || existingVote.value !== -1)) {
        updateData.downvotes = { increment: 1 };
        if (existingVote?.value === 1) {
          updateData.upvotes = { decrement: 1 };
        }
      }

      await tx.forumPost.update({
        where: { id: postId },
        data: updateData,
      });
    });

    // Update rankings
    await this.rankingService.updatePostRanking(postId);

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { score: true, slug: true },
    });

    if (post?.slug) {
      await gridCache.invalidatePost(post.slug);
    }

    return {
      score: post?.score ?? 0,
      userVote: value,
    };
  }

  /**
   * Remove vote from a post
   */
  async removeVote(postId: string, userId: string): Promise<{ score: number }> {
    const existingVote = await prisma.forumPostVote.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (!existingVote) {
      const post = await prisma.forumPost.findUnique({
        where: { id: postId },
        select: { score: true },
      });
      return { score: post?.score ?? 0 };
    }

    await prisma.$transaction(async (tx) => {
      await tx.forumPostVote.delete({
        where: { userId_postId: { userId, postId } },
      });

      const updateData: Prisma.ForumPostUpdateInput = {
        score: { decrement: existingVote.value },
      };

      if (existingVote.value === 1) {
        updateData.upvotes = { decrement: 1 };
      } else {
        updateData.downvotes = { decrement: 1 };
      }

      await tx.forumPost.update({
        where: { id: postId },
        data: updateData,
      });
    });

    await this.rankingService.updatePostRanking(postId);

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { score: true, slug: true },
    });

    if (post?.slug) {
      await gridCache.invalidatePost(post.slug);
    }

    return { score: post?.score ?? 0 };
  }

  /**
   * Bookmark a post
   */
  async bookmark(postId: string, userId: string): Promise<void> {
    await prisma.forumBookmark.create({
      data: { userId, postId },
    });
  }

  /**
   * Remove bookmark
   */
  async removeBookmark(postId: string, userId: string): Promise<void> {
    await prisma.forumBookmark.delete({
      where: { userId_postId: { userId, postId } },
    });
  }

  /**
   * Get user's bookmarked posts
   */
  async getUserBookmarks(
    userId: string,
    params: { page?: number; limit?: number }
  ): Promise<ForumFeedResponse> {
    const { page = 1, limit = 20 } = params;

    const [bookmarks, total] = await Promise.all([
      prisma.forumBookmark.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  fid: true,
                  username: true,
                  displayName: true,
                  pfpUrl: true,
                },
              },
              _count: {
                select: {
                  replies: true,
                  votes: true,
                  bookmarks: true,
                },
              },
            },
          },
        },
      }),
      prisma.forumBookmark.count({ where: { userId } }),
    ]);

    const posts = bookmarks
      .filter((b) => b.post.moderationStatus === ModerationStatus.APPROVED) // UPPERCASE
      .map((b) => ({
        ...this.mapToDTO(b.post),
        isBookmarked: true,
      }));

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Get sort order for queries
   */
  private getSortOrder(sort: SortType): Prisma.ForumPostOrderByWithRelationInput[] {
    switch (sort) {
      case 'hot':
        return [{ isPinned: 'desc' }, { hotScore: 'desc' }];
      case 'new':
        return [{ isPinned: 'desc' }, { createdAt: 'desc' }];
      case 'top':
        return [{ isPinned: 'desc' }, { wilsonScore: 'desc' }];
      case 'controversial':
        // Posts with high engagement but close to 50/50 split
        return [{ isPinned: 'desc' }, { replyCount: 'desc' }, { score: 'asc' }];
      default:
        return [{ isPinned: 'desc' }, { hotScore: 'desc' }];
    }
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToDTO(post: any): ForumPostDTO {
    return {
      ...post,
      author: {
        id: post.author.id,
        fid: post.author.fid,
        username: post.author.username,
        displayName: post.author.displayName,
        pfpUrl: post.author.pfpUrl,
      },
      _count: post._count,
      userVote: null,
      isBookmarked: false,
    };
  }
}

// Export singleton instance
export const forumService = new ForumService();
export default forumService;
