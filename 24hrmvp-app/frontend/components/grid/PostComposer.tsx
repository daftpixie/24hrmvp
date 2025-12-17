// ============================================
// THE GRID - POST COMPOSER COMPONENT
// File: frontend/components/grid/PostComposer.tsx
// Rich text editor for creating forum posts
// ============================================

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PostType, CreatePostData } from '../../lib/types/grid';

const postTypes: { value: PostType; label: string; icon: string; description: string }[] = [
  { value: 'DISCUSSION', label: 'Discussion', icon: '💬', description: 'Start a conversation' },
  { value: 'QUESTION', label: 'Question', icon: '❓', description: 'Ask the community' },
  { value: 'SHOWCASE', label: 'Showcase', icon: '🚀', description: 'Share your work' },
  { value: 'FEEDBACK', label: 'Feedback', icon: '💡', description: 'Request input' },
];

interface PostComposerProps {
  onSubmit: (data: CreatePostData) => Promise<any>;
  parentId?: string;
  ideaId?: string;
  isReply?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  className?: string;
}

export const PostComposer: React.FC<PostComposerProps> = ({
  onSubmit,
  parentId,
  ideaId,
  isReply = false,
  placeholder = 'What\'s on your mind?',
  autoFocus = false,
  onCancel,
  className = '',
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<PostType>('DISCUSSION');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(isReply || autoFocus);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isReply && !title.trim()) {
      setError('Title is required');
      return;
    }

    if (!content.trim() || content.length < 10) {
      setError('Content must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const data: CreatePostData = {
        title: isReply ? 'Reply' : title.trim(),
        content: content.trim(),
        type: isReply ? undefined : type,
        parentId,
        ideaId,
        tags: isReply ? undefined : tags,
      };

      const result = await onSubmit(data);

      if (result.success) {
        // Reset form
        setTitle('');
        setContent('');
        setTags([]);
        setIsExpanded(false);
        setShowPreview(false);
      } else {
        setError(result.error || 'Failed to create post');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, content, type, tags, parentId, ideaId, isReply, onSubmit]);

  const handleAddTag = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      
      if (tag && !tags.includes(tag) && tags.length < 5) {
        setTags([...tags, tag]);
        setTagInput('');
      }
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  }, [tags]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    // Auto-resize textarea
    if (contentRef.current) {
      contentRef.current.style.height = 'auto';
      contentRef.current.style.height = `${contentRef.current.scrollHeight}px`;
    }
  }, []);

  // Simple markdown preview
  const renderPreview = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className={`post-composer ${className}`}>
      {/* Collapsed state (click to expand) */}
      {!isExpanded && !isReply && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-4 text-left bg-surface-1 border border-gray-700/50 rounded-xl hover:border-cyan-500/30 transition-colors"
        >
          <div className="flex items-center gap-3 text-gray-400">
            <span className="text-2xl">✏️</span>
            <span>{placeholder}</span>
          </div>
        </button>
      )}

      {/* Expanded composer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="composer-form"
          >
            {/* Post type selector (not for replies) */}
            {!isReply && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Post Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {postTypes.map((pt) => (
                    <button
                      key={pt.value}
                      type="button"
                      onClick={() => setType(pt.value)}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        type === pt.value
                          ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                          : 'border-gray-700/50 hover:border-gray-600 text-gray-400'
                      }`}
                    >
                      <span className="text-lg mr-2">{pt.icon}</span>
                      <span className="text-sm font-medium">{pt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Title (not for replies) */}
            {!isReply && (
              <div className="mb-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Post title..."
                  maxLength={300}
                  className="w-full px-4 py-3 bg-transparent border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 text-lg font-medium"
                  autoFocus={autoFocus}
                />
                <div className="mt-1 text-xs text-gray-500 text-right">
                  {title.length}/300
                </div>
              </div>
            )}

            {/* Content textarea */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-400">
                  {isReply ? 'Your reply' : 'Content'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
              </div>

              {showPreview ? (
                <div 
                  className="min-h-[150px] p-4 bg-gray-800/50 rounded-lg prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderPreview(content) || '<span class="text-gray-500">Nothing to preview</span>' }}
                />
              ) : (
                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={handleTextareaChange}
                  placeholder={isReply ? 'Write your reply...' : 'Write your post... (Markdown supported)'}
                  className="w-full min-h-[150px] px-4 py-3 bg-transparent border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                  autoFocus={isReply || autoFocus}
                />
              )}
              
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Supports **bold**, *italic*, `code`</span>
                <span>{content.length}/50000</span>
              </div>
            </div>

            {/* Tags (not for replies) */}
            {!isReply && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Tags (up to 5)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-md text-sm"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-400 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {tags.length < 5 && (
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Add tag and press Enter..."
                    className="w-full px-3 py-2 bg-transparent border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 text-sm"
                    maxLength={50}
                  />
                )}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Formatting hints */}
                <span className="text-xs text-gray-500 hidden sm:inline">
                  Press Enter for line break
                </span>
              </div>

              <div className="flex items-center gap-2">
                {(onCancel || !isReply) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onCancel) onCancel();
                      else setIsExpanded(false);
                    }}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || (!isReply && !title.trim()) || content.length < 10}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium rounded-lg hover:from-cyan-400 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="loading-spinner-sm" />
                      Posting...
                    </span>
                  ) : isReply ? (
                    'Reply'
                  ) : (
                    'Create Post'
                  )}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <style jsx>{`
        .composer-form {
          background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 30, 0.95));
          border: 1px solid rgba(4, 217, 255, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .bg-surface-1 {
          background: rgba(46, 46, 46, 0.5);
        }

        .inline-code {
          background: rgba(4, 217, 255, 0.1);
          color: #04D9FF;
          padding: 0.1rem 0.3rem;
          border-radius: 4px;
          font-family: 'Space Mono', monospace;
        }

        .prose-invert strong {
          color: #fff;
        }

        .prose-invert em {
          color: #B0B0B0;
        }

        .loading-spinner-sm {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PostComposer;
