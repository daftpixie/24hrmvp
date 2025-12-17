'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface Author {
  id: string;
  username: string;
  displayName: string | null;
  pfpUrl: string | null;
}

interface ReplyTo {
  id: string;
  content: string;
  author: { username: string };
}

interface Message {
  id: string;
  content: string;
  roomId: string;
  authorId: string;
  author: Author;
  replyTo?: ReplyTo | null;
  attachments: string[];
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  createdAt: string;
}

interface ChatMessageProps {
  message: Message;
  isOwnMessage: boolean;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string, pin: boolean) => void;
  canModerate?: boolean;
}

export default function ChatMessage({
  message,
  isOwnMessage,
  onReply,
  onEdit,
  onDelete,
  onPin,
  canModerate = false,
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return d.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.({ ...message, content: editContent });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  if (message.isDeleted) {
    return (
      <div className="px-4 py-2 text-gray-500 italic text-sm">
        [Message deleted]
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        group px-4 py-2 hover:bg-white/5 transition-colors relative
        ${message.isPinned ? 'bg-[#04D9FF]/5 border-l-2 border-[#04D9FF]' : ''}
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Pinned indicator */}
      {message.isPinned && (
        <div className="text-xs text-[#04D9FF] mb-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          Pinned message
        </div>
      )}

      {/* Reply reference */}
      {message.replyTo && (
        <div className="ml-12 mb-1 pl-3 border-l-2 border-gray-600 text-sm">
          <span className="text-[#04D9FF]">@{message.replyTo.author.username}</span>
          <span className="text-gray-500 ml-2 truncate">
            {message.replyTo.content.substring(0, 50)}
            {message.replyTo.content.length > 50 ? '...' : ''}
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {message.author.pfpUrl ? (
            <Image
              src={message.author.pfpUrl}
              alt={message.author.username}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#04D9FF] to-[#8A00C4] flex items-center justify-center text-white font-bold">
              {message.author.username[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={`font-semibold ${isOwnMessage ? 'text-[#04D9FF]' : 'text-white'}`}>
              {message.author.displayName || message.author.username}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(message.createdAt)}
            </span>
            {message.isEdited && (
              <span className="text-xs text-gray-600">(edited)</span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-white/10 border border-[#04D9FF]/30 rounded-lg p-2 text-white text-sm resize-none focus:outline-none focus:border-[#04D9FF]"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-xs bg-[#04D9FF] text-black rounded hover:bg-[#04D9FF]/80"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-xs bg-white/10 text-white rounded hover:bg-white/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-200 mt-1 whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {/* Attachments */}
          {message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#04D9FF] hover:underline flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Attachment {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && !isEditing && (
          <div className="absolute right-4 top-2 flex items-center gap-1 bg-[#1E1E1E] border border-white/10 rounded-lg p-1 shadow-lg">
            <button
              onClick={() => onReply?.(message)}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Reply"
            >
              <svg className="w-4 h-4 text-gray-400 hover:text-[#04D9FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            
            {isOwnMessage && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Edit"
              >
                <svg className="w-4 h-4 text-gray-400 hover:text-[#04D9FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            
            {(isOwnMessage || canModerate) && (
              <button
                onClick={() => onDelete?.(message.id)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            
            {canModerate && (
              <button
                onClick={() => onPin?.(message.id, !message.isPinned)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title={message.isPinned ? 'Unpin' : 'Pin'}
              >
                <svg className={`w-4 h-4 ${message.isPinned ? 'text-[#04D9FF]' : 'text-gray-400 hover:text-[#04D9FF]'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

