'use client';

// PRODUCTION FIX: Force dynamic rendering for auth context
// This prevents static generation errors with useAuth hook
export const dynamic = 'force-dynamic'


// ============================================
// 24HRMVP - GRID CHAT PAGE (FIXED v2)
// File: frontend/app/grid/chat/page.tsx
// Fix: Removed GridHeader (already in layout.tsx)
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { getApiUrl } from '@/lib/config';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Hash, 
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface ChatRoom {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isPrivate: boolean;
  _count?: {
    messages: number;
    participants: number;
  };
}

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    pfpUrl?: string;
  };
}

function ChatPageContent() {
  const { user, isAuthenticated } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch chat rooms
  const fetchRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      setError(null);
      
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/chat/rooms`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.rooms) {
        setRooms(data.rooms);
        // Auto-select first room if none selected
        if (!selectedRoom && data.rooms.length > 0) {
          setSelectedRoom(data.rooms[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
      setError('Failed to load chat rooms');
    } finally {
      setLoadingRooms(false);
    }
  }, [selectedRoom]);

  // Fetch messages for selected room
  const fetchMessages = useCallback(async (roomId: string, silent = false) => {
    try {
      if (!silent) {
        setLoadingMessages(true);
      }
      
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/api/chat/rooms/${roomId}/messages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      if (!silent) {
        setError('Failed to load messages');
      }
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Send a message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !isAuthenticated || sending) return;

    try {
      setSending(true);
      
      const apiUrl = getApiUrl();
      const token = typeof window !== 'undefined' 
        ? (sessionStorage.getItem('24hrmvp_access_token') || localStorage.getItem('farcaster_token'))
        : null;

      if (!token) {
        setError('Please sign in to send messages');
        return;
      }

      const response = await fetch(`${apiUrl}/api/chat/rooms/${selectedRoom.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setNewMessage('');
        // Refresh messages
        fetchMessages(selectedRoom.id, true);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Load messages when room changes
  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom.id);
      
      // Set up polling for new messages (every 5 seconds)
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(selectedRoom.id, true);
      }, 5000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [selectedRoom, fetchMessages]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
          <button 
            onClick={() => { setError(null); fetchRooms(); }}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-280px)]">
        {/* Room List */}
        <div className="lg:col-span-1 bg-[rgba(255,255,255,0.03)] rounded-2xl border border-[rgba(4,217,255,0.1)] overflow-hidden">
          <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
            <h2 className="font-heading font-bold text-white flex items-center gap-2">
              <Hash className="w-5 h-5 text-[--neon-cyan]" />
              Chat Rooms
            </h2>
          </div>
          
          <div className="overflow-y-auto h-[calc(100%-60px)]">
            {loadingRooms ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-[rgba(255,255,255,0.05)] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-4 text-center text-[--text-secondary]">
                No chat rooms available
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      selectedRoom?.id === room.id
                        ? 'bg-[rgba(4,217,255,0.1)] border border-[--neon-cyan]'
                        : 'hover:bg-[rgba(255,255,255,0.05)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Hash className={`w-4 h-4 ${
                        selectedRoom?.id === room.id ? 'text-[--neon-cyan]' : 'text-[--text-secondary]'
                      }`} />
                      <span className={`font-medium ${
                        selectedRoom?.id === room.id ? 'text-white' : 'text-[--text-secondary]'
                      }`}>
                        {room.name}
                      </span>
                    </div>
                    {room.description && (
                      <p className="mt-1 text-xs text-[--text-tertiary] truncate pl-6">
                        {room.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3 bg-[rgba(255,255,255,0.03)] rounded-2xl border border-[rgba(4,217,255,0.1)] flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-[--neon-cyan]" />
              <div>
                <h3 className="font-heading font-bold text-white">
                  {selectedRoom?.name || 'Select a room'}
                </h3>
                {selectedRoom?.description && (
                  <p className="text-xs text-[--text-secondary]">{selectedRoom.description}</p>
                )}
              </div>
            </div>
            {selectedRoom && (
              <div className="flex items-center gap-2 text-[--text-secondary]">
                <Users className="w-4 h-4" />
                <span className="text-sm">{selectedRoom._count?.participants || 0}</span>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-[--neon-cyan]" />
              </div>
            ) : !selectedRoom ? (
              <div className="flex items-center justify-center h-full text-[--text-secondary]">
                Select a room to start chatting
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[--text-secondary]">
                No messages yet. Be the first to say something!
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex gap-3 ${
                    message.user.id === user?.id ? 'flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[rgba(4,217,255,0.2)] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {message.user.pfpUrl ? (
                      <img 
                        src={message.user.pfpUrl} 
                        alt={message.user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[--neon-cyan] font-bold">
                        {(message.user.displayName || message.user.username || '?')[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`max-w-[70%] ${
                    message.user.id === user?.id ? 'text-right' : ''
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {message.user.displayName || message.user.username}
                      </span>
                      <span className="text-xs text-[--text-tertiary]">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                    <div className={`p-3 rounded-2xl ${
                      message.user.id === user?.id
                        ? 'bg-[--neon-cyan] text-[--bg-deepest]'
                        : 'bg-[rgba(255,255,255,0.1)] text-white'
                    }`}>
                      {message.content}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-[rgba(255,255,255,0.1)]">
            {!isAuthenticated ? (
              <div className="text-center text-[--text-secondary] py-2">
                Please sign in to send messages
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={selectedRoom ? `Message #${selectedRoom.name}` : 'Select a room'}
                  disabled={!selectedRoom || sending}
                  className="flex-1 px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder-[--text-tertiary] focus:outline-none focus:border-[--neon-cyan] disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!selectedRoom || !newMessage.trim() || sending}
                  className="px-4 py-3 bg-[--neon-cyan] text-[--bg-deepest] rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GridChatPage() {
  return (
    <ClientOnly fallback={<LoadingSkeleton />}>
      <ChatPageContent />
    </ClientOnly>
  );
}
