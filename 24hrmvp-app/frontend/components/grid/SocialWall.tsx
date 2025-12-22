"use client"

/**
 * SocialWall Component for 24HRMVP
 * 
 * @version 5.1.0 - Added named export for backward compatibility
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import {
  Heart,
  MessageCircle,
  Share2,
  Twitter,
  Instagram,
  Youtube,
  Filter,
  RefreshCw,
  Clock,
  TrendingUp,
  Hash
} from 'lucide-react'

// Types
export type SocialPlatform = 'twitter' | 'instagram' | 'youtube' | 'farcaster' | 'lens'

export interface SocialPost {
  id: string
  platform: SocialPlatform
  author: {
    name: string
    handle: string
    avatar: string
    url: string
  }
  content: string
  media?: {
    type: 'image' | 'video'
    url: string
    thumbnail?: string
  }[]
  metrics: {
    likes: number
    comments: number
    shares: number
    views?: number
  }
  url: string
  createdAt: string
  tags: string[]
}

interface SocialWallProps {
  initialPosts?: SocialPost[]
}

const PLATFORM_ICONS: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  instagram: Instagram,
  youtube: Youtube,
  farcaster: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 5.373 0 0 5.373 0 12s5.373 12 12 12z" fill="#855DCD" fillOpacity="0.2"/>
      <path d="M18.25 12.75a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0zm-10.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z" fill="#855DCD"/>
      <path d="M16.5 6.75h-9a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 .75.75h9a.75.75 0 0 0 .75-.75v-3a.75.75 0 0 0-.75-.75z" fill="#855DCD"/>
    </svg>
  ),
  lens: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 5.373 0 0 5.373 0 12s5.373 12 12 12z" fill="#00501E" fillOpacity="0.2"/>
      <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="#ABFE2C"/>
    </svg>
  )
}

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  twitter: 'text-[#1DA1F2]',
  instagram: 'text-[#E1306C]',
  youtube: 'text-[#FF0000]',
  farcaster: 'text-[#855DCD]',
  lens: 'text-[#ABFE2C]'
}

function SocialWall({ initialPosts = [] }: SocialWallProps) {
  const [posts, setPosts] = useState<SocialPost[]>(initialPosts)
  const [filter, setFilter] = useState<SocialPlatform | 'all'>('all')
  const [sort, setSort] = useState<'latest' | 'popular'>('latest')
  const [loading, setLoading] = useState(false)

  // Determine displayed posts
  const displayedPosts = posts
    .filter(post => filter === 'all' || post.platform === filter)
    .sort((a, b) => {
      if (sort === 'latest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      return b.metrics.likes - a.metrics.likes
    })

  const handleRefresh = async () => {
    setLoading(true)
    // Simulate fetch
    setTimeout(() => {
      setLoading(false)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 bg-[#1E1E1E]/40 border border-white/10 rounded-xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          {(Object.keys(PLATFORM_ICONS) as SocialPlatform[]).map((platform) => (
            <Button
              key={platform}
              variant={filter === platform ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(platform)}
              className="capitalize"
            >
              {platform}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSort(sort === 'latest' ? 'popular' : 'latest')}
            className="text-[#B0B0B0]"
          >
            {sort === 'latest' ? (
              <Clock className="w-4 h-4 mr-2" />
            ) : (
              <TrendingUp className="w-4 h-4 mr-2" />
            )}
            {sort === 'latest' ? 'Latest' : 'Popular'}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="masonry-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {displayedPosts.map((post) => {
            const Icon = PLATFORM_ICONS[post.platform]
            
            return (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#1E1E1E]/60 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-[#04D9FF]/30 transition-colors group break-inside-avoid mb-6"
              >
                {/* Header */}
                <div className="p-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={post.author.avatar} 
                      alt={post.author.name}
                      className="w-10 h-10 rounded-full border border-white/10" 
                    />
                    <div>
                      <h4 className="font-bold text-sm text-white">{post.author.name}</h4>
                      <p className="text-xs text-[#808080]">{post.author.handle}</p>
                    </div>
                  </div>
                  <a 
                    href={post.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`${PLATFORM_COLORS[post.platform]}`}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                </div>

                {/* Content */}
                <div className="px-4 pb-2">
                  <p className="text-sm text-[#E0E0E0] whitespace-pre-wrap linkify">
                    {post.content}
                  </p>
                  
                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {post.tags.map(tag => (
                        <span key={tag} className="text-xs text-[#04D9FF] flex items-center">
                          <Hash className="w-3 h-3 mr-0.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Media */}
                {post.media && post.media.length > 0 && (
                  <div className="mt-3">
                    {post.media.map((item, idx) => (
                      <div key={idx} className="relative aspect-video bg-black/50">
                        <img 
                          src={item.url} 
                          alt="Post media" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-white/5 flex items-center justify-between text-[#808080] text-xs">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1.5 hover:text-red-400 transition-colors">
                      <Heart className="w-4 h-4" />
                      {post.metrics.likes.toLocaleString()}
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-[#04D9FF] transition-colors">
                      <MessageCircle className="w-4 h-4" />
                      {post.metrics.comments.toLocaleString()}
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-green-400 transition-colors">
                      <Share2 className="w-4 h-4" />
                      {post.metrics.shares.toLocaleString()}
                    </button>
                  </div>
                  
                  <span className="text-[#808080]/60">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {displayedPosts.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-[#808080]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No posts found</h3>
          <p className="text-[#808080]">Try changing your filters or check back later.</p>
        </div>
      )}
    </div>
  )
}

// Named export for backward compatibility
export { SocialWall }

// Default export
export default SocialWall
