// ============================================
// 24HRMVP - CHAT ROOM COMPONENT (PRODUCTION READY)
// File: frontend/components/grid/ChatRoom.tsx
// FIXED: Use getToken helper instead of token from useAuth
// FIXED: Updated API paths to /api/grid/chat/*
// ============================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth, getToken } from '@/providers/AuthProvider';
import { Send, Loader2, Users, Hash, AlertCircle, RefreshCw } from 'lucide-react';
import { getApiUrl } from '@/lib/config';

// ============================================
// TYPES
// ============================================

interface ChatRoomProps {
  room: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    type: string;
    memberCount: number;
    messageCount: number;
  };
  currentUserId: string;
  currentUsername: string;
}

interface Message {
  id: string;
  content: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  createdAt: string;
  isEdited?: boolean;
  isPinned?: boolean;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChatRoom({ room, currentUserId, currentUsername }: ChatRoomProps) {
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current token
  const token = getToken();

  // WebSocket connection
  const {
    isConnected,
    send,
    on,
    error: wsError
  } = useWebSocket({
    autoConnect: true,
    userId: currentUserId,
    username: currentUsername,
    token: token || undefined
  });

  // ============================================
  // LOAD MESSAGE HISTORY
  // ============================================

  const loadHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      setError(null);
      
      const apiUrl = getApiUrl();
      const currentToken = getToken();
      
      // Build headers with auth token if available
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }
      
      // Use /api/grid/chat/ path
      const response = await fetch(`${apiUrl}/api/grid/chat/rooms/${room.id}/messages?limit=50`, {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading chat history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [room.id]);

  useEffect(() => {
    if (room.id) {
      loadHistory();
    }
  }, [room.id, loadHistory]);

  // ============================================
  // WEBSOCKET ROOM MANAGEMENT
  // ============================================

  useEffect(() => {
    if (isConnected && room.id && send) {
      // Join the chat room
      send('chat:join', { roomId: room.id });
      
      return () => {
        send('chat:leave', { roomId: room.id });
      };
    }
  }, [isConnected, room.id, send]);

  // ============================================
  // WEBSOCKET MESSAGE HANDLERS
  // ============================================

  useEffect(() => {
    if (!on) return;
    
    // Handle new messages
    const handleNewMessage = (message: Message) => {
      if (message.authorId !== currentUserId) {
        setMessages(prev => [...prev, message]);
      }
    };
    
    // Handle edited messages
    const handleEditedMessage = (data: { messageId: string; content: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, content: data.content, isEdited: true }
          : msg
      ));
    };
    
    // Handle deleted messages
    const handleDeletedMessage = (data: { messageId: string }) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
    };
    
    const unsubscribeNew = on('chat:message', handleNewMessage);
    const unsubscribeEdit = on('chat:messageEdited', handleEditedMessage);
    const unsubscribeDelete = on('chat:messageDeleted', handleDeletedMessage);
    
    return () => {
      if (unsubscribeNew) unsubscribeNew();
      if (unsubscribeEdit) unsubscribeEdit();
      if (unsubscribeDelete) unsubscribeDelete();
    };
  }, [on, currentUserId]);

  // ============================================
  // AUTO-SCROLL
  // ============================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============================================
  // SEND MESSAGE (HTTP + WebSocket)
  // ============================================

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = messageInput.trim();
    if (!content || !currentUserId) return;

    try {
      setIsSending(true);
      setError(null);
      
      const apiUrl = getApiUrl();
      const currentToken = getToken();
      
      // Send via HTTP API for persistence (with JWT auth)
      const response = await fetch(`${apiUrl}/api/grid/chat/rooms/${room.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      const data = await response.json();
      
      if (data.success && data.message) {
        // Add message to local state immediately
        setMessages(prev => [...prev, data.message]);
        setMessageInput('');
        inputRef.current?.focus();
        
        // Also broadcast via WebSocket for real-time sync to other clients
        if (send && isConnected) {
          send('chat:message', {
            roomId: room.id,
            message: data.message
          });
        }
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // ============================================
  // FORMAT TIMESTAMP
  // ============================================

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex flex-col h-full bg-[#0B192A]/50">
      {/* Room Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1E1E1E]/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#04D9FF]/10 flex items-center justify-center">
            <Hash className="w-5 h-5 text-[#04D9FF]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{room.name}</h2>
            {room.description && (
              <p className="text-xs text-[#808080]">{room.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-[#808080]">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {room.memberCount}
          </div>
          <div className={`flex items-center gap-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {(error || wsError) && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error || wsError}
          </div>
          <button
            onClick={loadHistory}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#04D9FF] animate-spin mx-auto mb-2" />
              <p className="text-[#808080] text-sm">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Hash className="w-12 h-12 text-[#04D9FF]/30 mx-auto mb-3" />
              <p className="text-[#808080]">No messages yet</p>
              <p className="text-sm text-[#808080]/70">Be the first to say something!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwnMessage = message.authorId === currentUserId || 
                                   message.author?.id === currentUserId;
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#04D9FF] to-[#8A00C4] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {message.author?.pfpUrl ? (
                      <img
                        src={message.author.pfpUrl}
                        alt={message.author.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-sm font-medium">
                        {(message.author?.username || 'U')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  {/* Message Content */}
                  <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${isOwnMessage ? 'text-[#04D9FF]' : 'text-white'}`}>
                        {message.author?.displayName || message.author?.username || 'Unknown'}
                      </span>
                      <span className="text-xs text-[#808080]">
                        {formatTimestamp(message.createdAt)}
                      </span>
                      {message.isEdited && (
                        <span className="text-xs text-[#808080]">(edited)</span>
                      )}
                    </div>
                    <div className={`px-4 py-2 rounded-lg ${
                      isOwnMessage 
                        ? 'bg-[#04D9FF]/20 text-white' 
                        : 'bg-white/5 text-[#B0B0B0]'
                    }`}>
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-[#1E1E1E]/80">
        {!currentUserId ? (
          <div className="text-center py-3 text-[#808080]">
            Sign in to send messages
          </div>
        ) : (
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={`Message #${room.name}...`}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#808080] focus:border-[#04D9FF] focus:outline-none transition-colors"
              disabled={isSending}
              maxLength={4000}
            />
            <button
              type="submit"
              disabled={isSending || !messageInput.trim() || !isConnected}
              className="px-4 py-3 bg-[#04D9FF] text-black rounded-lg hover:bg-[#04D9FF]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
