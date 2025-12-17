'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReplyingTo {
  id: string;
  content: string;
  author: { username: string };
}

interface ChatInputProps {
  onSend: (content: string, replyToId?: string) => void;
  onTyping?: (isTyping: boolean) => void;
  replyingTo?: ReplyingTo | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Focus textarea when replying
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  // Handle typing indicator
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping?.(false);
    }, 2000);
  };

  const handleSend = () => {
    const content = message.trim();
    if (!content || disabled) return;

    onSend(content, replyingTo?.id);
    setMessage('');
    
    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    onTyping?.(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (value: string) => {
    setMessage(value);
    handleTyping();
  };

  return (
    <div className="border-t border-white/10 bg-[#1E1E1E]/80 backdrop-blur-sm">
      {/* Reply preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-[#04D9FF]/10 border-b border-[#04D9FF]/30 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-[#04D9FF] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="text-sm text-[#04D9FF]">
                Replying to @{replyingTo.author.username}
              </span>
              <span className="text-sm text-gray-400 truncate">
                {replyingTo.content.substring(0, 50)}
                {replyingTo.content.length > 50 ? '...' : ''}
              </span>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="p-4 flex items-end gap-3">
        {/* Attachment button (placeholder for future) */}
        <button
          className="p-2 text-gray-400 hover:text-[#04D9FF] hover:bg-white/10 rounded-lg transition-colors"
          title="Attach file (coming soon)"
          disabled
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={`
              w-full px-4 py-3 rounded-xl resize-none
              bg-white/5 border border-white/10
              text-white placeholder-gray-500
              focus:outline-none focus:border-[#04D9FF]/50 focus:bg-white/10
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            style={{ maxHeight: '150px' }}
          />
          
          {/* Character count (optional, shown when near limit) */}
          {message.length > 3500 && (
            <span className={`absolute right-3 bottom-3 text-xs ${
              message.length > 4000 ? 'text-red-400' : 'text-gray-500'
            }`}>
              {message.length}/4000
            </span>
          )}
        </div>

        {/* Emoji button (placeholder) */}
        <button
          className="p-2 text-gray-400 hover:text-[#04D9FF] hover:bg-white/10 rounded-lg transition-colors"
          title="Emoji (coming soon)"
          disabled
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className={`
            p-3 rounded-xl transition-all duration-200
            ${message.trim() && !disabled
              ? 'bg-[#04D9FF] text-black hover:bg-[#04D9FF]/80 shadow-lg shadow-[#04D9FF]/25'
              : 'bg-white/10 text-gray-500 cursor-not-allowed'
            }
          `}
          title="Send message"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      {/* Typing hint */}
      <div className="px-4 pb-2 text-xs text-gray-500">
        Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-400">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-400">Shift+Enter</kbd> for new line
      </div>
    </div>
  );
}
