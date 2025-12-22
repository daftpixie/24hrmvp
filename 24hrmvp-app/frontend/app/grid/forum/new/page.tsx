"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'
// Header import removed to fix duplication
import ClientOnly from '@/components/ClientOnly'
// CORRECTED IMPORT PATH BELOW
import apiClient from '@/lib/api/client'
import { 
  MessageSquare, 
  HelpCircle, 
  Rocket, 
  Lightbulb, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Code, 
  X, 
  ChevronLeft, 
  AlertCircle,
  Loader2 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Types
type PostType = 'discussion' | 'question' | 'showcase' | 'feedback'

interface PostTypeOption {
  id: PostType
  label: string
  icon: any
  description: string
  color: string
}

const POST_TYPES: PostTypeOption[] = [
  { 
    id: 'discussion', 
    label: 'Discussion', 
    icon: MessageSquare, 
    description: 'Start a conversation',
    color: 'text-[#04D9FF]'
  },
  { 
    id: 'question', 
    label: 'Question', 
    icon: HelpCircle, 
    description: 'Get help from community',
    color: 'text-[#FF5C00]'
  },
  { 
    id: 'showcase', 
    label: 'Showcase', 
    icon: Rocket, 
    description: 'Show off your work',
    color: 'text-[#8A00C4]'
  },
  { 
    id: 'feedback', 
    label: 'Feedback', 
    icon: Lightbulb, 
    description: 'Suggestions for 24HRMVP',
    color: 'text-[#FB48C4]'
  }
]

function CreatePostContent() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'discussion' as PostType,
    tags: [] as string[]
  })
  
  const [tagInput, setTagInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Optional: Redirect to login or show generic auth message
    }
  }, [isLoading, isAuthenticated, router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (tagInput.trim() && formData.tags.length < 5 && !formData.tags.includes(tagInput.trim())) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }))
        setTagInput('')
      }
    } else if (e.key === 'Backspace' && !tagInput && formData.tags.length > 0) {
      setFormData(prev => ({ ...prev, tags: prev.tags.slice(0, -1) }))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await apiClient.post<{ success: boolean; post: { slug: string } }>(
        '/api/grid/forum', 
        formData
      )
      
      if (response.success && response.post) {
        setCreatedSlug(response.post.slug)
        // Redirect after delay
        setTimeout(() => {
          router.push(`/grid/forum/${response.post.slug}`)
        }, 1500)
      }
    } catch (err: any) {
      console.error('Failed to create post:', err)
      setError(err instanceof Error ? err.message : 'Failed to create post')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B192A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#04D9FF] animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B192A] text-[#FAFAFA] flex flex-col">
        {/* Header removed */}
        <div className="flex-1 container mx-auto px-4 flex items-center justify-center">
          <div className="max-w-md w-full bg-[#1E1E1E]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center shadow-[0_0_40px_rgba(4,217,255,0.1)]">
            <div className="w-16 h-16 bg-[#04D9FF]/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(4,217,255,0.2)]">
              <MessageSquare className="w-8 h-8 text-[#04D9FF]" />
            </div>
            <h2 className="text-2xl font-bold font-display mb-2">Join the Discussion</h2>
            <p className="text-white/60 mb-8 font-body">
              You need to sign in to create forum posts. Join the community and start sharing your ideas!
            </p>
            {/* Auth button would go here usually, implied by Header */}
            <div className="p-4 bg-[#04D9FF]/5 border border-[#04D9FF]/20 rounded-lg">
              <p className="text-sm text-[#04D9FF]">Please connect your wallet to continue.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (createdSlug) {
    return (
      <div className="min-h-screen bg-[#0B192A] text-[#FAFAFA] flex flex-col">
        {/* Header removed */}
        <div className="flex-1 container mx-auto px-4 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-[#1E1E1E]/60 backdrop-blur-xl border border-[#04D9FF]/30 rounded-2xl p-8 text-center shadow-[0_0_40px_rgba(4,217,255,0.15)]"
          >
            <div className="w-16 h-16 bg-[#04D9FF]/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(4,217,255,0.4)]">
              <Rocket className="w-8 h-8 text-[#04D9FF]" />
            </div>
            <h2 className="text-2xl font-bold font-display mb-2">Post Created!</h2>
            <p className="text-white/60 mb-6 font-body">
              Your post has been published to the community forum.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 text-sm text-[#04D9FF] animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirecting you to your new post...</span>
              </div>
              <Link 
                href={`/grid/forum/${createdSlug}`}
                className="text-xs text-white/40 hover:text-white/80 transition-colors mt-4"
              >
                Click here if not redirected
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B192A] text-[#FAFAFA] font-body selection:bg-[#04D9FF]/30">
      {/* Header removed */}
      
      {/* Laser Grid Background Effect */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(4, 217, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(4, 217, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          transform: 'perspective(1000px) rotateX(60deg) translateY(-100px) scale(2)'
        }}
      />

      <main className="container mx-auto px-4 py-8 relative z-10 max-w-4xl">
        <div className="mb-8">
          <Link 
            href="/grid/forum" 
            className="inline-flex items-center gap-2 text-white/60 hover:text-[#04D9FF] transition-colors mb-4 group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono text-sm">Back to Forum</span>
          </Link>
          
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold font-display bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent mb-2"
          >
            Create New Post
          </motion.h1>
          <p className="text-white/60 text-lg">
            Share your thoughts, ask questions, or showcase your work with the community.
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-[#FF5C00]/10 border border-[#FF5C00]/30 rounded-xl flex items-center gap-3 text-[#FF5C00]"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Type Selector */}
          <section>
            <label className="block text-sm font-mono text-white/60 mb-3 uppercase tracking-wider">
              Post Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {POST_TYPES.map((type) => {
                const isSelected = formData.type === type.id
                const Icon = type.icon
                
                return (
                  <motion.button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      relative p-4 rounded-xl border text-left transition-all duration-300
                      ${isSelected 
                        ? 'bg-[#04D9FF]/10 border-[#04D9FF] shadow-[0_0_15px_rgba(4,217,255,0.2)]' 
                        : 'bg-[#1E1E1E]/40 border-white/10 hover:border-white/30'
                      }
                    `}
                  >
                    <div className={`mb-3 ${isSelected ? type.color : 'text-white/40'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className={`font-display font-bold ${isSelected ? 'text-white' : 'text-white/60'}`}>
                        {type.label}
                      </div>
                    </div>
                    
                    {isSelected && (
                      <motion.div
                        layoutId="activeTypeGlow"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 opacity-50"
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      />
                    )}
                  </motion.button>
                )
              })}
            </div>
          </section>

          {/* Main Content Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1E1E1E]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)] relative overflow-hidden"
          >
            {/* Chrome Shine Effect on Card */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="space-y-6">
              {/* Title Input */}
              <div>
                <label className="block text-sm font-mono text-white/60 mb-2 uppercase tracking-wider">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Give your post a clear, catchy title..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-lg font-medium text-white placeholder:text-white/20 focus:outline-none focus:border-[#04D9FF] focus:shadow-[0_0_15px_rgba(4,217,255,0.15)] transition-all duration-300"
                  maxLength={100}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-white/30 font-mono">{formData.title.length}/100</span>
                </div>
              </div>

              {/* Content Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-mono text-white/60 uppercase tracking-wider">
                    Content
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPreview(!isPreview)}
                    className="text-xs font-mono text-[#04D9FF] hover:text-[#8A00C4] transition-colors"
                  >
                    {isPreview ? 'Edit' : 'Preview'}
                  </button>
                </div>

                {isPreview ? (
                  <div className="w-full min-h-[300px] bg-white/5 border border-white/10 rounded-lg p-4 prose prose-invert max-w-none">
                    {/* Simple markdown preview - in real app use a markdown renderer */}
                    <p className="whitespace-pre-wrap">{formData.content || 'Nothing to preview yet...'}</p>
                  </div>
                ) : (
                  <div className="relative">
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Write your post... Markdown supported"
                      className="w-full min-h-[300px] bg-white/5 border border-white/10 rounded-lg p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#04D9FF] focus:shadow-[0_0_15px_rgba(4,217,255,0.15)] transition-all duration-300 font-mono text-sm leading-relaxed resize-y"
                    />
                    <div className="absolute bottom-4 right-4 flex gap-2 text-white/20">
                      <ImageIcon className="w-4 h-4 hover:text-[#04D9FF] cursor-pointer transition-colors" />
                      <LinkIcon className="w-4 h-4 hover:text-[#04D9FF] cursor-pointer transition-colors" />
                      <Code className="w-4 h-4 hover:text-[#04D9FF] cursor-pointer transition-colors" />
                    </div>
                  </div>
                )}
                <div className="flex justify-between mt-2 text-xs text-white/30 font-mono">
                  <span>Supports bold, italic, code</span>
                  <span>{formData.content.length}/50000</span>
                </div>
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-sm font-mono text-white/60 mb-2 uppercase tracking-wider">
                  Tags (Max 5)
                </label>
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex flex-wrap gap-2 focus-within:border-[#04D9FF] focus-within:shadow-[0_0_15px_rgba(4,217,255,0.15)] transition-all duration-300">
                  <AnimatePresence>
                    {formData.tags.map(tag => (
                      <motion.span
                        key={tag}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#04D9FF]/10 border border-[#04D9FF]/30 text-[#04D9FF] text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={formData.tags.length < 5 ? "Add tag and press Enter..." : ""}
                    disabled={formData.tags.length >= 5}
                    className="bg-transparent text-white placeholder:text-white/20 focus:outline-none flex-1 min-w-[150px] font-mono text-sm h-8"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Guidelines & Actions */}
          <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
            <div className="bg-[#8A00C4]/5 border border-[#8A00C4]/20 rounded-xl p-4 text-sm text-white/60">
              <h3 className="text-[#8A00C4] font-bold font-display mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Posting Guidelines
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>Be respectful and constructive in your discussions</li>
                <li>Search for similar topics before posting</li>
                <li>Use clear and descriptive titles</li>
                <li>No spam or self-promotion without context</li>
              </ul>
            </div>

            <div className="flex items-center gap-4 justify-end md:justify-start">
              <Link 
                href="/grid/forum"
                className="px-6 py-3 rounded-lg text-white/60 hover:text-white font-mono text-sm transition-colors"
              >
                Cancel
              </Link>
              
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative px-8 py-3 rounded-full font-display font-bold text-black uppercase tracking-wider
                  bg-gradient-to-r from-[#E3E3E3] via-[#C0C0C3] to-[#A8A9AD]
                  hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-300
                  flex items-center gap-2
                `}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <span>Create Post</span>
                    <Rocket className="w-5 h-5" />
                  </>
                )}
                
                {/* Shine Effect */}
                <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                  <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-20deg] animate-shine" />
                </div>
              </motion.button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}

export default function CreatePostPage() {
  return (
    <ClientOnly>
      <CreatePostContent />
    </ClientOnly>
  )
}
