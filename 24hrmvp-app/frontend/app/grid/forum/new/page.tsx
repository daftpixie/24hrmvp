// ============================================
// 24HRMVP - NEW FORUM POST PAGE
// File: frontend/app/grid/forum/new/page.tsx
// FIXED: Use isLoading instead of loading from useAuth
// FIXED: Safe access to result.post with optional chaining
// ============================================

'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { PostComposer } from '@/components/grid/PostComposer';
import { useAuth } from '@/providers/AuthProvider';
import { createForumPost } from '@/lib/api/grid';
import type { CreatePostData } from '@/lib/api/grid';
import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';

// ============================================
// MAIN COMPONENT
// ============================================

function NewPostContent() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [success, setSuccess] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle post submission
  const handleSubmit = useCallback(async (data: CreatePostData) => {
    setError(null);
    
    try {
      const result = await createForumPost(data);
      
      if (result.success && result.post) {
        setSuccess(true);
        setCreatedSlug(result.post.slug);
        
        // Redirect to the new post after a short delay
        setTimeout(() => {
          router.push(`/grid/forum/post/${result.post?.slug || createdSlug}`);
        }, 1500);
        
        return { success: true };
      } else {
        const errorMsg = result.error || result.message || 'Failed to create post';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [router, createdSlug]);

  // Loading state
  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <LoadingSkeleton className="h-12 w-48 mb-6" />
        <LoadingSkeleton className="h-96" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center py-16 px-8 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(4,217,255,0.1)]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(4,217,255,0.1)] flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-[#04D9FF]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Authentication Required
          </h2>
          <p className="text-[#B0B0B0] mb-6 max-w-md mx-auto">
            You need to sign in with Farcaster to create forum posts. 
            Join the community and start sharing your ideas!
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/grid/forum"
              className="px-6 py-3 bg-[rgba(255,255,255,0.05)] text-white rounded-lg border border-[rgba(4,217,255,0.2)] hover:border-[rgba(4,217,255,0.4)] transition-colors"
            >
              Back to Forum
            </Link>
            <Link
              href="/"
              className="px-6 py-3 bg-gradient-to-r from-[#04D9FF] to-[#1F51FF] text-[#0B192A] font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 px-8 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(44,255,5,0.3)]"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-[rgba(44,255,5,0.1)] flex items-center justify-center"
          >
            <CheckCircle className="w-10 h-10 text-[#2CFF05]" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Post Created Successfully!
          </h2>
          <p className="text-[#B0B0B0] mb-2">
            Your post has been published to the community forum.
          </p>
          <p className="text-sm text-[#808080]">
            Redirecting you to your new post...
          </p>
          {createdSlug && (
            <Link
              href={`/grid/forum/post/${createdSlug}`}
              className="inline-block mt-4 text-[#04D9FF] hover:underline"
            >
              Click here if not redirected
            </Link>
          )}
        </motion.div>
      </div>
    );
  }

  // Main form
  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/grid/forum"
          className="inline-flex items-center gap-2 text-[#B0B0B0] hover:text-[#04D9FF] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Forum
        </Link>
        
        <h1 className="text-3xl font-bold text-white mb-2">
          Create New Post
        </h1>
        <p className="text-[#B0B0B0]">
          Share your thoughts, ask questions, or showcase your work with the community.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-400">Error creating post</p>
              <p className="text-sm text-red-300/80 mt-1">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Post Composer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(4,217,255,0.1)] p-6"
      >
        <PostComposer
          onSubmit={handleSubmit}
          autoFocus={true}
          placeholder="What would you like to share with the community?"
          onCancel={() => router.push('/grid/forum')}
        />
      </motion.div>

      {/* Guidelines */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6 p-4 rounded-lg bg-[rgba(4,217,255,0.05)] border border-[rgba(4,217,255,0.1)]"
      >
        <h3 className="text-sm font-semibold text-[#04D9FF] mb-2">
          Posting Guidelines
        </h3>
        <ul className="text-sm text-[#B0B0B0] space-y-1">
          <li>• Be respectful and constructive in your discussions</li>
          <li>• Use clear, descriptive titles for your posts</li>
          <li>• Tag your posts appropriately for better discoverability</li>
          <li>• Check for existing discussions before creating duplicates</li>
          <li>• Keep content relevant to building and innovation</li>
        </ul>
      </motion.div>
    </div>
  );
}

// ============================================
// EXPORT WITH CLIENT WRAPPER
// ============================================

export default function NewPostPage() {
  return (
    <ClientOnly fallback={
      <div className="max-w-3xl mx-auto p-6">
        <LoadingSkeleton className="h-12 w-48 mb-6" />
        <LoadingSkeleton className="h-96" />
      </div>
    }>
      <NewPostContent />
    </ClientOnly>
  );
}
