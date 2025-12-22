// ============================================
// 24HRMVP - CHAT ROOM LIST COMPONENT (PRODUCTION READY)
// File: frontend/components/grid/ChatRoomList.tsx
// FIXED: Use getToken helper instead of token from useAuth
// FIXED: Updated API paths to /api/grid/chat/*
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageSquare, Users, Hash, Lock, Globe, RefreshCw, Plus } from 'lucide-react';
import { useAuth, getToken } from '@/providers/AuthProvider';
import { getApiUrl } from '@/lib/config';

// ============================================
// TYPES
// ============================================

interface ChatRoom {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: 'PUBLIC' | 'PRIVATE' | 'DIRECT' | 'IDEA';
  memberCount: number;
  messageCount: number;
  lastMessageAt: string | null;
  isActive: boolean;
}

interface ChatRoomListProps {
  selectedRoomId?: string;
  showCreateButton?: boolean;
}

// Room icons mapping
const roomIcons: Record<string, string> = {
  general: '💬',
  ideas: '💡',
  development: '🔧',
  builders: '🔧',
  announcements: '📢',
  help: '❓',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChatRoomList({ selectedRoomId, showCreateButton = false }: ChatRoomListProps) {
  const { user } = useAuth();
  
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // FETCH ROOMS
  // ============================================

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = getApiUrl();
      const token = getToken();
      
      // Build headers with auth token if available
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Use /api/grid/chat/ path
      const response = await fetch(`${apiUrl}/api/grid/chat/rooms`, {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat rooms');
      }
      
      const data = await response.json();
      
      // Handle both response formats
      if (data.success && data.rooms) {
        setRooms(data.rooms);
      } else if (Array.isArray(data.rooms)) {
        setRooms(data.rooms);
      } else if (Array.isArray(data)) {
        setRooms(data);
      } else {
        setRooms([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-20 rounded-lg bg-white/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <p className="text-red-400 mb-3">{error}</p>
        <button
          onClick={fetchRooms}
          className="flex items-center gap-2 text-sm text-[#04D9FF] hover:underline"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  // ============================================
  // EMPTY STATE
  // ============================================

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No chat rooms available</p>
        <p className="text-sm mt-1 text-gray-500">Check back soon!</p>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="space-y-3">
      {/* Create Room Button (optional) */}
      {showCreateButton && (
        <Link href="/grid/chat/create">
          <div className="p-4 rounded-lg border border-dashed border-white/20 hover:border-[#04D9FF]/50 hover:bg-[#04D9FF]/5 transition-all cursor-pointer flex items-center justify-center gap-2 text-gray-400 hover:text-[#04D9FF]">
            <Plus className="w-5 h-5" />
            <span>Create Room</span>
          </div>
        </Link>
      )}
      
      {/* Room List */}
      {rooms.map((room, index) => {
        const isSelected = selectedRoomId === room.id;
        
        return (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link href={`/grid/chat/${room.slug}`}>
              <div className={`group p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                isSelected 
                  ? 'bg-[#04D9FF]/10 border-[#04D9FF]/50' 
                  : 'bg-white/5 border-white/10 hover:border-[#04D9FF]/50 hover:bg-[#04D9FF]/5'
              }`}>
                <div className="flex items-start gap-3">
                  {/* Room Icon */}
                  <div className="text-2xl flex-shrink-0">
                    {roomIcons[room.slug] || (
                      <Hash className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  
                  {/* Room Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold transition-colors truncate ${
                        isSelected ? 'text-[#04D9FF]' : 'text-white group-hover:text-[#04D9FF]'
                      }`}>
                        {room.name}
                      </h3>
                      
                      {/* Room Type Indicator */}
                      {room.type === 'PRIVATE' ? (
                        <Lock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      )}
                    </div>
                    
                    {/* Description */}
                    {room.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                        {room.description}
                      </p>
                    )}
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {room.messageCount} {room.messageCount === 1 ? 'message' : 'messages'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Active Indicator */}
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-[#04D9FF] animate-pulse flex-shrink-0" />
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
      
      {/* Refresh Button */}
      <button
        onClick={fetchRooms}
        className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-[#04D9FF] transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh rooms
      </button>
    </div>
  );
}
