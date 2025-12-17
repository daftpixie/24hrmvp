// ============================================
// 24HRMVP - THE GRID SOCIAL AGGREGATION SERVICE
// File: backend/src/services/socialAggregation.ts
// Multi-platform social content aggregation
// ============================================

import { prisma } from '../db/client';
import { SocialPlatform } from '@prisma/client';
import {
  ISocialAggregationService,
  SocialFeedParams,
  SocialFeedResponse,
  SocialPostDTO,
} from '../types/grid';
import { neynarService } from './neynar';
import { cache, gridCache } from './redis';

/**
 * Social aggregation service for multi-platform content
 * 
 * Aggregates content from:
 * - Farcaster (via Neynar API)
 * - Twitter/X (future - requires $200/mo API)
 * - Instagram (future - requires Business account)
 * - TikTok (future - limited API)
 */
export class SocialAggregationService implements ISocialAggregationService {
  /**
   * Get aggregated social feed
   */
  async getFeed(params: SocialFeedParams): Promise<SocialFeedResponse> {
    const {
      platform = 'all',
      channelId,
      authorFid,
      hashtag,
      featured,
      page = 1,
      limit = 20,
    } = params;

    // Check cache
    const cacheKey = gridCache.keys.socialFeed(
      platform === 'all' ? undefined : platform,
      channelId
    );
    
    if (!authorFid && !hashtag && !featured) {
      const cached = await cache.get<SocialFeedResponse>(cacheKey);
      if (cached && cached.pagination.page === page) {
        return cached;
      }
    }

    // Build query
    const where: any = {
      isHidden: false,
    };

    if (platform !== 'all') {
      where.platform = platform;
    }

    if (channelId) {
      where.channelId = channelId;
    }

    if (authorFid) {
      where.authorFid = authorFid;
    }

    if (hashtag) {
      where.hashtags = { has: hashtag };
    }

    if (featured) {
      where.isFeatured = true;
    }

    // Get posts from database
    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.socialPost.count({ where }),
    ]);

    const postDTOs = posts.map(this.mapToDTO);

    const response: SocialFeedResponse = {
      posts: postDTOs,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };

    // Cache for 5 minutes
    if (!authorFid && !hashtag && !featured) {
      await cache.set(cacheKey, response, gridCache.ttl.feed);
    }

    return response;
  }

  /**
   * Get trending posts
   */
  async getTrending(channelId?: string, limit: number = 10): Promise<SocialPostDTO[]> {
    const cacheKey = gridCache.keys.trending(channelId || 'all');
    const cached = await cache.get<SocialPostDTO[]>(cacheKey);
    if (cached) return cached;

    // Get posts sorted by engagement in last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const where: any = {
      isHidden: false,
      publishedAt: { gte: since },
    };

    if (channelId) {
      where.channelId = channelId;
    }

    const posts = await prisma.socialPost.findMany({
      where,
      orderBy: [
        { likes: 'desc' },
        { reposts: 'desc' },
        { replies: 'desc' },
      ],
      take: limit,
    });

    const postDTOs = posts.map(this.mapToDTO);
    await cache.set(cacheKey, postDTOs, gridCache.ttl.trending);

    return postDTOs;
  }

  /**
   * Sync Farcaster channel to database
   * 
   * @param channelId Farcaster channel ID
   * @returns Number of posts synced
   */
  async syncFarcasterChannel(channelId: string): Promise<number> {
    if (!neynarService.isConfigured()) {
      console.warn('Neynar not configured, skipping sync');
      return 0;
    }

    try {
      const feed = await neynarService.getChannelFeed(channelId, undefined, 50);
      let synced = 0;

      for (const cast of feed.casts) {
        // Extract hashtags from text
        const hashtagMatches = cast.text.match(/#\w+/g) || [];
        const hashtags = hashtagMatches.map((h) => h.toLowerCase());

        // Extract mentions
        const mentions = cast.mentioned_profiles?.map((p) => p.username) || [];

        // Extract media URLs from embeds
        const mediaUrls = cast.embeds
          .filter((e) => e.url && (e.url.includes('image') || e.url.includes('video')))
          .map((e) => e.url as string);

        // Upsert to database
        await prisma.socialPost.upsert({
          where: {
            platform_externalId: {
              platform: SocialPlatform.FARCASTER,
              externalId: cast.hash,
            },
          },
          update: {
            content: cast.text,
            likes: cast.reactions.likes_count,
            reposts: cast.reactions.recasts_count,
            replies: cast.replies.count,
            fetchedAt: new Date(),
          },
          create: {
            platform: SocialPlatform.FARCASTER,
            externalId: cast.hash,
            authorFid: cast.author.fid,
            authorUsername: cast.author.username,
            authorDisplayName: cast.author.display_name,
            authorAvatar: cast.author.pfp_url,
            content: cast.text,
            mediaUrls,
            hashtags,
            mentions,
            channelId: cast.channel?.id,
            castHash: cast.hash,
            parentHash: cast.parent_hash,
            likes: cast.reactions.likes_count,
            reposts: cast.reactions.recasts_count,
            replies: cast.replies.count,
            publishedAt: new Date(cast.timestamp),
            externalUrl: `https://warpcast.com/${cast.author.username}/${cast.hash.slice(0, 10)}`,
          },
        });

        synced++;
      }

      // Invalidate cache
      await gridCache.invalidateSocialFeed(SocialPlatform.FARCASTER);

      return synced;
    } catch (error) {
      console.error('Error syncing Farcaster channel:', error);
      return 0;
    }
  }

  /**
   * Feature a post (admin action)
   */
  async featurePost(postId: string): Promise<void> {
    await prisma.socialPost.update({
      where: { id: postId },
      data: { isFeatured: true },
    });

    await gridCache.invalidateSocialFeed();
  }

  /**
   * Hide a post (moderation action)
   */
  async hidePost(postId: string): Promise<void> {
    await prisma.socialPost.update({
      where: { id: postId },
      data: { isHidden: true },
    });

    await gridCache.invalidateSocialFeed();
  }

  /**
   * Get posts by hashtag
   */
  async getByHashtag(hashtag: string, limit: number = 20): Promise<SocialPostDTO[]> {
    const normalizedTag = hashtag.toLowerCase().replace(/^#/, '');

    const posts = await prisma.socialPost.findMany({
      where: {
        isHidden: false,
        hashtags: { has: normalizedTag },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    return posts.map(this.mapToDTO);
  }

  /**
   * Get posts by author FID
   */
  async getByAuthor(fid: number, limit: number = 20): Promise<SocialPostDTO[]> {
    const posts = await prisma.socialPost.findMany({
      where: {
        isHidden: false,
        authorFid: fid,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    return posts.map(this.mapToDTO);
  }

  /**
   * Refresh engagement metrics for recent posts
   */
  async refreshEngagementMetrics(): Promise<number> {
    if (!neynarService.isConfigured()) {
      return 0;
    }

    // Get posts from last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const posts = await prisma.socialPost.findMany({
      where: {
        platform: SocialPlatform.FARCASTER,
        publishedAt: { gte: since },
      },
      select: {
        id: true,
        castHash: true,
      },
    });

    let updated = 0;

    for (const post of posts) {
      if (!post.castHash) continue;

      try {
        const cast = await neynarService.getCast(post.castHash);
        if (cast) {
          await prisma.socialPost.update({
            where: { id: post.id },
            data: {
              likes: cast.reactions.likes_count,
              reposts: cast.reactions.recasts_count,
              replies: cast.replies.count,
              fetchedAt: new Date(),
            },
          });
          updated++;
        }
      } catch (error) {
        console.error(`Error updating metrics for ${post.castHash}:`, error);
      }

      // Rate limit: 100ms between requests
      await new Promise((r) => setTimeout(r, 100));
    }

    return updated;
  }

  /**
   * Map database model to DTO
   */
  private mapToDTO(post: any): SocialPostDTO {
    return {
      id: post.id,
      platform: post.platform,
      externalId: post.externalId,
      author: {
        fid: post.authorFid,
        username: post.authorUsername,
        displayName: post.authorDisplayName,
        avatar: post.authorAvatar,
      },
      content: post.content,
      mediaUrls: post.mediaUrls,
      hashtags: post.hashtags,
      mentions: post.mentions,
      engagement: {
        likes: post.likes,
        reposts: post.reposts,
        replies: post.replies,
        impressions: post.impressions,
      },
      channelId: post.channelId,
      externalUrl: post.externalUrl,
      isFeatured: post.isFeatured,
      publishedAt: post.publishedAt,
    };
  }
}

// Export singleton instance
export const socialAggregationService = new SocialAggregationService();
export default socialAggregationService;
