'use client';

import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Send, Loader2, Users, Hash } from 'lucide-react';
import { getApiUrl } from '@/lib/config';

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
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  createdAt: string;
}

export default function ChatRoom({ room, currentUserId, currentUsername }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isConnected,
    send,
    on,
    error: wsError
  } = useWebSocket({
    autoConnect: true,
    userId: currentUserId,
    username: currentUsername
  });

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/chat/rooms/${room.id}/messages?limit=50`);
        
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    if (room.id) {
      loadHistory();
    }
  }, [room.id]);

  useEffect(() => {
    if (isConnected && room.id && send) {
      send('join-room', { roomId: room.id });
      return () => {
        send('leave-room', { roomId: room.id });
      };
    }
  }, [isConnected, room.id, send]);

  useEffect(() => {
    if (!on) return;
    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };
    const unsubscribe = on('new-message', handleNewMessage);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [on]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = messageInput.trim();
    if (!content || !send || !isConnected) return;

    try {
      setIsSending(true);
      const success = send('message', {
        roomId: room.id,
        content,
        userId: currentUserId,
        username: currentUsername
      });

      if (success) {
        setMessageInput('');
        inputRef.current?.focus();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#0B192A]/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1E1E1E]/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#04D9FF]/10 flex items-center justify-center">
            <Hash className="w-5 h-5 text-[#04D9FF]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{room.name}</h2>
            {room.description && <p className="text-xs text-[#808080]">{room.description}</p>}
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#04D9FF] animate-spin mx-auto mb-2" />
              <p className="text-[#808080] text-sm">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[#808080]">
              <Hash className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm mt-1">Be the first to say something!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.userId === currentUserId;
            return (
              <div key={message.id} className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                <img 
                  src={message.user?.pfpUrl || '/default-avatar.png'} 
                  alt={message.user?.username || 'User'} 
                  className="w-10 h-10 rounded-full border border-white/20 flex-shrink-0" 
                />
                <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {!isOwnMessage && (
                      <span className="font-semibold text-white text-sm">
                        {message.user?.displayName || message.user?.username || 'Anonymous'}
                      </span>
                    )}
                    <span className="text-xs text-[#808080]">{formatTimestamp(message.createdAt)}</span>
                  </div>
                  <div className={`inline-block px-4 py-2 rounded-lg ${
                    isOwnMessage 
                      ? 'bg-[#04D9FF]/20 border border-[#04D9FF]/30 text-white' 
                      : 'bg-white/5 border border-white/10 text-white'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {wsError && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/30 text-red-400 text-sm">
          Connection error: {wsError}
        </div>
      )}

      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-[#1E1E1E]/80">
        <div className="flex gap-2">
          <input 
            ref={inputRef} 
            type="text" 
            value={messageInput} 
            onChange={(e) => setMessageInput(e.target.value)} 
            placeholder={isConnected ? `Message #${room.name}` : 'Connecting...'} 
            disabled={!isConnected || isSending} 
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#808080] focus:outline-none focus:border-[#04D9FF]/50 focus:bg-white/10 transition-colors disabled:opacity-50" 
            maxLength={2000} 
          />
          <button 
            type="submit" 
            disabled={!isConnected || !messageInput.trim() || isSending} 
            className="px-4 py-2 bg-[#04D9FF] text-black rounded-lg hover:bg-[#04D9FF]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-[#808080] mt-2">Press Enter to send • {messageInput.length}/2000</p>
      </form>
    </div>
  );
}
