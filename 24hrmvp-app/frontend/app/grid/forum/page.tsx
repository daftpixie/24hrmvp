'use client';

// ============================================
// 24HRMVP - FORUM PAGE
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
  Eye,
  Hash
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
    DISCUSSION: 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20',
    QUESTION: 'text-neon-purple bg-neon-purple/10 border-neon-purple/20',
    ANNOUNCEMENT: 'text-neon-orange bg-neon-orange/10 border-neon-orange/20',
    SHOWCASE: 'text-neon-green bg-neon-green/10 border-neon-green/20',
    FEEDBACK: 'text-neon-pink bg-neon-pink/10 border-neon-pink/20',
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
      <div className="chrome-glass-card p-5 group-hover:scale-[1.01] transition-all duration-300 group-hover:bg-surface-1/60 group-hover:shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Author Avatar */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-inner">
              {post.author.pfpUrl ? (
                <img 
                  src={post.author.pfpUrl} 
                  alt={post.author.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-white/50" />
              )}
            </div>
            
            {/* Author Info */}
            <div>
              <p className="font-heading font-bold text-white group-hover:text-neon-cyan transition-colors">
                {post.author.displayName || post.author.username}
              </p>
              <p className="text-xs font-mono text-text-tertiary">
                @{post.author.username} · <span className="text-text-secondary">{formatDate(post.createdAt)}</span>
              </p>
            </div>
          </div>

          {/* Type Badge */}
          <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded border uppercase tracking-wider ${typeColors[post.type] || typeColors.DISCUSSION}`}>
            {typeLabels[post.type] || 'Discussion'}
          </span>
        </div>

        {/* Title */}
        {post.title && (
          <h3 className="text-xl font-heading font-bold text-white mb-2 leading-tight group-hover:text-neon-cyan transition-colors">
            {post.isPinned && <span className="text-neon-orange mr-2 inline-block animate-pulse">📌</span>}
            {post.title}
          </h3>
        )}

        {/* Content Preview */}
        <p className="text-text-secondary text-sm mb-4 line-clamp-2 leading-relaxed">
          {truncateContent(post.content)}
        </p>

        {/* Linked Idea */}
        {post.idea && (
          <div className="mb-4 px-3 py-2 bg-neon-cyan/5 rounded-lg border border-neon-cyan/20 flex items-center gap-2">
            <div className="w-1 h-8 bg-neon-cyan rounded-full" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold">Related Idea</p>
              <p className="text-sm text-neon-cyan font-bold truncate">{post.idea.title}</p>
            </div>
          </div>
        )}

        {/* Footer Stats */}
        <div className="flex items-center gap-6 text-sm text-text-tertiary font-mono pt-4 border-t border-white/5">
          <div className="flex items-center gap-1.5 group-hover:text-neon-green transition-colors">
            <ThumbsUp className="w-4 h-4" />
            <span>{post.score}</span>
          </div>
          <div className="flex items-center gap-1.5 group-hover:text-neon-blue transition-colors">
            <MessageCircle className="w-4 h-4" />
            <span>{post.replyCount} replies</span>
          </div>
          <div className="flex items-center gap-1.5 group-hover:text-white transition-colors">
            <Eye className="w-4 h-4" />
            <span>{post.viewCount} views</span>
          </div>
          <div className="ml-auto">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary group-hover:bg-neon-cyan group-hover:text-black transition-all">
              <ChevronRight className="w-5 h-5" />
            </div>
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
    <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 tracking-wide">
            Community <span className="text-neon-cyan">Forum</span>
          </h1>
          <p className="text-text-secondary text-lg">
            Discuss ideas, ask questions, and connect with builders
          </p>
        </div>
        
        <button
          onClick={handleNewPost}
          className="btn-neon inline-flex items-center justify-center gap-2 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          <span className="font-heading font-bold">New Post</span>
        </button>
      </div>

      {/* Filters & Sort Bar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-neon-cyan transition-colors" />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface-1/50 border border-white/10 rounded-xl text-white placeholder-text-tertiary focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan/50 transition-all"
          />
        </div>

        {/* Sort Options */}
        <div className="flex bg-surface-1/50 p-1 rounded-xl border border-white/10">
          {[
            { value: 'hot' as SortOption, label: 'Hot', icon: TrendingUp },
            { value: 'new' as SortOption, label: 'New', icon: Clock },
            { value: 'top' as SortOption, label: 'Top', icon: ThumbsUp },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setSort(option.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-heading font-bold text-sm transition-all ${
                sort === option.value
                  ? 'bg-neon-cyan/10 text-neon-cyan shadow-[0_0_10px_rgba(4,217,255,0.2)]'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <option.icon className="w-4 h-4" />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-white/5">
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
            className={`px-4 py-1.5 rounded-full text-sm font-mono font-bold transition-all ${
              filter === option.value
                ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(4,217,255,0.4)]'
                : 'bg-surface-1/50 border border-white/10 text-text-secondary hover:border-white/30 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="text-sm font-mono text-text-tertiary">
          Found <span className="text-white font-bold">{total}</span> posts
        </div>
        <button
          onClick={() => fetchPosts(true)}
          className="flex items-center gap-2 text-xs font-mono text-neon-cyan hover:text-white transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          REFRESH
        </button>
      </div>

      {/* Posts List */}
      {loading && posts.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <LoadingSkeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="chrome-glass-card p-12 text-center">
          <MessageSquare className="w-16 h-16 text-neon-orange mx-auto mb-6" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">Error Loading Posts</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <button
            onClick={() => fetchPosts(true)}
            className="btn-chrome-primary inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="chrome-glass-card p-12 text-center">
          <MessageSquare className="w-16 h-16 text-text-tertiary mx-auto mb-6 opacity-50" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">No Posts Found</h2>
          <p className="text-text-secondary mb-6">
            {searchQuery ? 'No posts match your search' : 'No posts yet. Be the first to start a discussion!'}
          </p>
          <button
            onClick={handleNewPost}
            className="btn-neon inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create First Post
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <ForumPostCard key={post.id} post={post} />
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-8">
              <button
                onClick={() => {
                  setPage(p => p + 1);
                  fetchPosts();
                }}
                disabled={loading}
                className="px-8 py-3 bg-surface-1/50 border border-white/10 text-text-secondary rounded-xl hover:bg-surface-1 hover:text-white hover:border-white/30 transition-all font-heading font-bold disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
                  </span>
                ) : (
                  'Load More Posts'
                )}
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
    <ClientOnly fallback={
      <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6">
        <LoadingSkeleton className="h-12 w-48 mb-8" />
        <LoadingSkeleton className="h-12 w-full mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <LoadingSkeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    }>
      <ForumContent />
    </ClientOnly>
  );
}
