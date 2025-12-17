'use client';

// ============================================
// 24HRMVP - FORUM PAGE (FIXED)
// File: frontend/app/grid/forum/page.tsx
// Displays forum posts with filtering and sorting
// ============================================

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useAuth } from '@/providers/AuthProvider';
import { getApiUrl } from '@/lib/config';
import { 
  MessageSquare, 
  ThumbsUp,
  Clock,
  TrendingUp,
  Plus,
  Filter,
  Search,
  RefreshCw,
  MessageCircle,
  User,
  ChevronRight,
  Bookmark,
  Eye
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface ForumPost {
  id: string;
  slug: string;
  title: string | null;
  content: string;
  type: string;
  score: number;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  idea?: {
    id: string;
    title: string;
  } | null;
}

interface ForumFeedResponse {
  success: boolean;
  posts: ForumPost[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

type SortOption = 'hot' | 'new' | 'top';
type FilterOption = 'all' | 'discussion' | 'question' | 'announcement' | 'showcase' | 'feedback';

// ============================================
// FORUM POST CARD COMPONENT
// ============================================

function ForumPostCard({ post }: { post: ForumPost }) {
  const typeColors: Record<string, string> = {
    DISCUSSION: 'from-blue-500 to-cyan-500',
    QUESTION: 'from-purple-500 to-pink-500',
    ANNOUNCEMENT: 'from-yellow-500 to-orange-500',
    SHOWCASE: 'from-green-500 to-emerald-500',
    FEEDBACK: 'from-red-500 to-pink-500',
  };

  const typeLabels: Record<string, string> = {
    DISCUSSION: 'Discussion',
    QUESTION: 'Question',
    ANNOUNCEMENT: 'Announcement',
    SHOWCASE: 'Showcase',
    FEEDBACK: 'Feedback',
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength).trim() + '...';
  };

  return (
    <Link
      href={`/grid/forum/post/${post.slug}`}
      className="block group"
    >
      <div className="bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(4,217,255,0.1)] p-4 hover:border-[rgba(4,217,255,0.3)] transition-all hover:bg-[rgba(255,255,255,0.05)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Author Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[--neon-cyan] to-[--neon-purple] flex items-center justify-center overflow-hidden">
              {post.author.pfpUrl ? (
                <img 
                  src={post.author.pfpUrl} 
                  alt={post.author.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            
            {/* Author Info */}
            <div>
              <p className="font-medium text-white">
                {post.author.displayName || post.author.username}
              </p>
              <p className="text-xs text-[--text-tertiary]">
                @{post.author.username} · {formatDate(post.createdAt)}
              </p>
            </div>
          </div>

          {/* Type Badge */}
          <span className={`px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r ${typeColors[post.type] || typeColors.DISCUSSION} text-white`}>
            {typeLabels[post.type] || 'Discussion'}
          </span>
        </div>

        {/* Title */}
        {post.title && (
          <h3 className="text-lg font-heading font-bold text-white mb-2 group-hover:text-[--neon-cyan] transition-colors">
            {post.isPinned && <span className="text-[--neon-cyan] mr-2">📌</span>}
            {post.title}
          </h3>
        )}

        {/* Content Preview */}
        <p className="text-[--text-secondary] text-sm mb-4 line-clamp-2">
          {truncateContent(post.content)}
        </p>

        {/* Linked Idea */}
        {post.idea && (
          <div className="mb-4 px-3 py-2 bg-[rgba(4,217,255,0.1)] rounded-lg border border-[rgba(4,217,255,0.2)]">
            <p className="text-xs text-[--text-tertiary] mb-1">Related to idea:</p>
            <p className="text-sm text-[--neon-cyan] font-medium">{post.idea.title}</p>
          </div>
        )}

        {/* Footer Stats */}
        <div className="flex items-center gap-4 text-sm text-[--text-tertiary]">
          <div className="flex items-center gap-1">
            <ThumbsUp className="w-4 h-4" />
            <span>{post.score}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{post.replyCount} replies</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{post.viewCount} views</span>
          </div>
          <div className="ml-auto">
            <ChevronRight className="w-5 h-5 text-[--text-secondary] group-hover:text-[--neon-cyan] group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================
// MAIN FORUM CONTENT
// ============================================

function ForumContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('hot');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Fetch posts
  const fetchPosts = useCallback(async (resetPage = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentPage = resetPage ? 1 : page;
      if (resetPage) setPage(1);

      const apiUrl = getApiUrl();
      const params = new URLSearchParams({
        sort,
        page: currentPage.toString(),
        limit: '20',
      });

      if (filter !== 'all') {
        params.append('type', filter.toUpperCase());
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`${apiUrl}/api/grid/forum?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const data: ForumFeedResponse = await response.json();
      
      if (data.success) {
        setPosts(data.posts);
        setHasMore(data.pagination.hasMore);
        setTotal(data.pagination.total);
      } else {
        throw new Error('Failed to load forum posts');
      }
    } catch (err) {
      console.error('Error fetching forum posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [sort, filter, searchQuery, page]);

  // Initial load and refetch on filter/sort changes
  useEffect(() => {
    fetchPosts(true);
  }, [sort, filter]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== '') {
        fetchPosts(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle new post button click
  const handleNewPost = () => {
    if (!user) {
      // TODO: Show auth modal or redirect
      alert('Please sign in to create a post');
      return;
    }
    router.push('/grid/forum/new');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-2">
            Community Forum
          </h1>
          <p className="text-[--text-secondary]">
            Discuss ideas, ask questions, and connect with builders
          </p>
        </div>
        
        <button
          onClick={handleNewPost}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[--neon-cyan] to-[--neon-blue] text-[--bg-deepest] font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          New Post
        </button>
      </div>

      {/* Filters & Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[--text-tertiary]" />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(4,217,255,0.2)] rounded-lg text-white placeholder-[--text-tertiary] focus:border-[--neon-cyan] focus:outline-none transition-colors"
          />
        </div>

        {/* Sort Options */}
        <div className="flex gap-2">
          {[
            { value: 'hot' as SortOption, label: 'Hot', icon: TrendingUp },
            { value: 'new' as SortOption, label: 'New', icon: Clock },
            { value: 'top' as SortOption, label: 'Top', icon: ThumbsUp },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setSort(option.value)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                sort === option.value
                  ? 'bg-[rgba(4,217,255,0.2)] text-[--neon-cyan] border border-[--neon-cyan]'
                  : 'bg-[rgba(255,255,255,0.05)] text-[--text-secondary] border border-transparent hover:bg-[rgba(255,255,255,0.1)]'
              }`}
            >
              <option.icon className="w-4 h-4" />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { value: 'all' as FilterOption, label: 'All' },
          { value: 'discussion' as FilterOption, label: 'Discussions' },
          { value: 'question' as FilterOption, label: 'Questions' },
          { value: 'announcement' as FilterOption, label: 'Announcements' },
          { value: 'showcase' as FilterOption, label: 'Showcases' },
          { value: 'feedback' as FilterOption, label: 'Feedback' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === option.value
                ? 'bg-[--neon-cyan] text-[--bg-deepest]'
                : 'bg-[rgba(255,255,255,0.05)] text-[--text-secondary] hover:bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 mb-6 text-sm text-[--text-tertiary]">
        <span>{total} posts</span>
        <button
          onClick={() => fetchPosts(true)}
          className="flex items-center gap-1 text-[--neon-cyan] hover:underline"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Posts List */}
      {loading && posts.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(4,217,255,0.1)] p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.1)]" />
                <div className="space-y-2">
                  <div className="w-32 h-4 bg-[rgba(255,255,255,0.1)] rounded" />
                  <div className="w-24 h-3 bg-[rgba(255,255,255,0.1)] rounded" />
                </div>
              </div>
              <div className="w-3/4 h-5 bg-[rgba(255,255,255,0.1)] rounded mb-2" />
              <div className="w-full h-4 bg-[rgba(255,255,255,0.1)] rounded mb-2" />
              <div className="w-2/3 h-4 bg-[rgba(255,255,255,0.1)] rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-[--text-tertiary] mx-auto mb-4" />
          <p className="text-[--text-secondary] mb-4">{error}</p>
          <button
            onClick={() => fetchPosts(true)}
            className="px-4 py-2 bg-[rgba(4,217,255,0.2)] text-[--neon-cyan] rounded-lg hover:bg-[rgba(4,217,255,0.3)] transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-[--text-tertiary] mx-auto mb-4" />
          <p className="text-[--text-secondary] mb-4">
            {searchQuery ? 'No posts match your search' : 'No posts yet. Be the first to start a discussion!'}
          </p>
          <button
            onClick={handleNewPost}
            className="px-4 py-2 bg-gradient-to-r from-[--neon-cyan] to-[--neon-blue] text-[--bg-deepest] font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Create First Post
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <ForumPostCard key={post.id} post={post} />
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => {
                  setPage(p => p + 1);
                  fetchPosts();
                }}
                disabled={loading}
                className="px-6 py-2 bg-[rgba(255,255,255,0.05)] text-[--text-secondary] rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// EXPORT
// ============================================

export default function ForumPage() {
  return (
    <ClientOnly fallback={<LoadingSkeleton />}>
      <ForumContent />
    </ClientOnly>
  );
}
