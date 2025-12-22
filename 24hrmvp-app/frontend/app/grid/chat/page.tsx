// ============================================
// 24HRMVP - CHAT ROOMS LIST PAGE
// File: frontend/app/grid/chat/page.tsx
// FIXED: Use getToken helper instead of token from useAuth
// ============================================

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  MessageSquare, 
  Users, 
  Hash, 
  Plus, 
  Search, 
  Loader2,
  RefreshCw,
  Globe,
  Lock
} from 'lucide-react';
import { useAuth, getToken } from '@/providers/AuthProvider';
import { getApiUrl } from '@/lib/config';
import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';

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
  createdAt: string;
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

function ChatPageContent() {
  const { user } = useAuth();
  
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'PUBLIC' | 'PRIVATE'>('all');

  // ============================================
  // FETCH ROOMS
  // ============================================

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = getApiUrl();
      const token = getToken();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${apiUrl}/api/grid/chat/rooms`, {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat rooms');
      }
      
      const data = await response.json();
      
      let roomsData: ChatRoom[] = [];
      if (data.success && data.rooms) {
        roomsData = data.rooms;
      } else if (Array.isArray(data.rooms)) {
        roomsData = data.rooms;
      } else if (Array.isArray(data)) {
        roomsData = data;
      }
      
      setRooms(roomsData);
      setFilteredRooms(roomsData);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // ============================================
  // FILTER ROOMS
  // ============================================

  useEffect(() => {
    let filtered = [...rooms];
    
    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(room => room.type === filterType);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(room => 
        room.name.toLowerCase().includes(query) ||
        room.description?.toLowerCase().includes(query)
      );
    }
    
    setFilteredRooms(filtered);
  }, [rooms, searchQuery, filterType]);

  // ============================================
  // FORMAT DATE
  // ============================================

  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return 'No activity';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <LoadingSkeleton className="h-12 w-48 mb-6" />
        <LoadingSkeleton className="h-12 w-full mb-4" />
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <LoadingSkeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-16 px-8 bg-[rgba(255,255,255,0.03)] rounded-xl border border-red-500/30">
          <MessageSquare className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Rooms</h2>
          <p className="text-[#808080] mb-6">{error}</p>
          <button
            onClick={fetchRooms}
            className="px-6 py-3 bg-[#04D9FF] text-black font-semibold rounded-lg hover:bg-[#04D9FF]/80 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/grid"
          className="inline-flex items-center gap-2 text-[#808080] hover:text-[#04D9FF] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Grid
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Chat Rooms</h1>
            <p className="text-[#808080]">
              Join conversations with the 24HRMVP community
            </p>
          </div>
          
          {user && (
            <Link
              href="/grid/chat/create"
              className="px-4 py-2 bg-[#04D9FF] text-black font-semibold rounded-lg hover:bg-[#04D9FF]/80 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Room
            </Link>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#808080]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#808080] focus:border-[#04D9FF] focus:outline-none transition-colors"
          />
        </div>
        
        {/* Type Filter */}
        <div className="flex gap-2">
          {(['all', 'PUBLIC', 'PRIVATE'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === type
                  ? 'bg-[#04D9FF] text-black'
                  : 'bg-white/5 text-[#808080] hover:bg-white/10 hover:text-white'
              }`}
            >
              {type === 'all' ? 'All' : type === 'PUBLIC' ? 'Public' : 'Private'}
            </button>
          ))}
        </div>
        
        {/* Refresh */}
        <button
          onClick={fetchRooms}
          className="p-3 bg-white/5 border border-white/10 rounded-lg text-[#808080] hover:text-[#04D9FF] hover:border-[#04D9FF]/50 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Room Stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-2xl font-bold text-[#04D9FF]">{rooms.length}</p>
          <p className="text-sm text-[#808080]">Total Rooms</p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-2xl font-bold text-[#04D9FF]">
            {rooms.filter(r => r.type === 'PUBLIC').length}
          </p>
          <p className="text-sm text-[#808080]">Public</p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-2xl font-bold text-[#04D9FF]">
            {rooms.reduce((sum, r) => sum + r.memberCount, 0)}
          </p>
          <p className="text-sm text-[#808080]">Total Members</p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-2xl font-bold text-[#04D9FF]">
            {rooms.reduce((sum, r) => sum + r.messageCount, 0)}
          </p>
          <p className="text-sm text-[#808080]">Messages</p>
        </div>
      </div>

      {/* Room List */}
      {filteredRooms.length === 0 ? (
        <div className="text-center py-16 px-8 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(4,217,255,0.1)]">
          <MessageSquare className="w-12 h-12 text-[#04D9FF]/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Rooms Found</h2>
          <p className="text-[#808080]">
            {searchQuery ? 'Try a different search term' : 'No chat rooms available yet'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/grid/chat/${room.slug}`}>
                <div className="group p-5 bg-white/5 rounded-xl border border-white/10 hover:border-[#04D9FF]/50 hover:bg-[#04D9FF]/5 transition-all cursor-pointer">
                  <div className="flex items-start gap-4">
                    {/* Room Icon */}
                    <div className="w-12 h-12 rounded-lg bg-[#04D9FF]/10 flex items-center justify-center text-2xl flex-shrink-0">
                      {roomIcons[room.slug] || <Hash className="w-6 h-6 text-[#04D9FF]" />}
                    </div>
                    
                    {/* Room Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white group-hover:text-[#04D9FF] transition-colors truncate">
                          {room.name}
                        </h3>
                        {room.type === 'PRIVATE' ? (
                          <Lock className="w-4 h-4 text-[#808080] flex-shrink-0" />
                        ) : (
                          <Globe className="w-4 h-4 text-[#808080] flex-shrink-0" />
                        )}
                      </div>
                      
                      {room.description && (
                        <p className="text-sm text-[#808080] line-clamp-2 mb-2">
                          {room.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-[#808080]">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {room.messageCount} {room.messageCount === 1 ? 'message' : 'messages'}
                        </span>
                        <span>
                          {formatLastActivity(room.lastMessageAt)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Join Arrow */}
                    <div className="text-[#808080] group-hover:text-[#04D9FF] transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// EXPORT WITH CLIENT WRAPPER
// ============================================

export default function ChatPage() {
  return (
    <ClientOnly fallback={
      <div className="max-w-4xl mx-auto p-6">
        <LoadingSkeleton className="h-12 w-48 mb-6" />
        <LoadingSkeleton className="h-12 w-full mb-4" />
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <LoadingSkeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    }>
      <ChatPageContent />
    </ClientOnly>
  );
}
