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
  Lock,
  ChevronRight
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
  builders: '👷',
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
      <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6">
        <LoadingSkeleton className="h-12 w-48 mb-6" />
        <LoadingSkeleton className="h-16 w-full mb-6" />
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <LoadingSkeleton key={i} className="h-24 rounded-xl" />
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
      <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6">
        <div className="chrome-glass-card p-12 text-center">
          <MessageSquare className="w-16 h-16 text-neon-orange mx-auto mb-6" />
          <h2 className="text-2xl font-display font-bold text-white mb-2">Error Loading Rooms</h2>
          <p className="text-text-secondary mb-8">{error}</p>
          <button
            onClick={fetchRooms}
            className="btn-chrome-primary inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 tracking-wide">
              Chat <span className="text-neon-cyan">Rooms</span>
            </h1>
            <p className="text-text-secondary text-lg">
              Join conversations with the 24HRMVP community
            </p>
          </div>
          
          {user && (
            <Link
              href="/grid/chat/create"
              className="btn-neon inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Room
            </Link>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-neon-cyan transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms..."
            className="w-full pl-12 pr-4 py-4 bg-surface-1/50 border border-white/10 rounded-xl text-white placeholder-text-tertiary focus:border-neon-cyan focus:outline-none focus:ring-1 focus:ring-neon-cyan/50 transition-all"
          />
        </div>
        
        <div className="flex gap-4">
          {/* Type Filter */}
          <div className="flex bg-surface-1/50 p-1 rounded-xl border border-white/10">
            {(['all', 'PUBLIC', 'PRIVATE'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-6 py-3 rounded-lg font-heading font-medium transition-all ${
                  filterType === type
                    ? 'bg-neon-cyan/10 text-neon-cyan shadow-[0_0_10px_rgba(4,217,255,0.2)]'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                {type === 'all' ? 'All' : type === 'PUBLIC' ? 'Public' : 'Private'}
              </button>
            ))}
          </div>
          
          {/* Refresh */}
          <button
            onClick={fetchRooms}
            className="px-4 bg-surface-1/50 border border-white/10 rounded-xl text-text-secondary hover:text-neon-cyan hover:border-neon-cyan/50 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Room Stats HUD */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Rooms', value: rooms.length, color: 'text-neon-cyan' },
          { label: 'Public', value: rooms.filter(r => r.type === 'PUBLIC').length, color: 'text-neon-blue' },
          { label: 'Total Members', value: rooms.reduce((sum, r) => sum + r.memberCount, 0), color: 'text-neon-purple' },
          { label: 'Messages', value: rooms.reduce((sum, r) => sum + r.messageCount, 0), color: 'text-neon-pink' },
        ].map((stat, i) => (
          <div key={i} className="p-4 bg-surface-1/30 rounded-xl border border-white/5 backdrop-blur-sm">
            <p className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs uppercase tracking-wider text-text-tertiary font-bold mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Room List */}
      {filteredRooms.length === 0 ? (
        <div className="chrome-glass-card p-12 text-center">
          <MessageSquare className="w-16 h-16 text-text-tertiary mx-auto mb-6 opacity-50" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">No Rooms Found</h2>
          <p className="text-text-secondary">
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
                <div className="group relative p-6 bg-surface-1/40 rounded-xl border border-white/10 overflow-hidden transition-all duration-300 hover:border-neon-cyan/50 hover:shadow-[0_0_20px_rgba(4,217,255,0.1)] hover:bg-surface-1/60">
                  {/* Hover Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10 flex items-start gap-6">
                    {/* Room Icon */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                      {roomIcons[room.slug] || <Hash className="w-6 h-6 text-neon-cyan" />}
                    </div>
                    
                    {/* Room Info */}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-heading font-bold text-white group-hover:text-neon-cyan transition-colors truncate">
                          {room.name}
                        </h3>
                        {room.type === 'PRIVATE' ? (
                          <div className="flex items-center gap-1 text-xs font-mono text-neon-orange bg-neon-orange/10 px-2 py-0.5 rounded border border-neon-orange/20">
                            <Lock className="w-3 h-3" /> PRIVATE
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-mono text-neon-blue bg-neon-blue/10 px-2 py-0.5 rounded border border-neon-blue/20">
                            <Globe className="w-3 h-3" /> PUBLIC
                          </div>
                        )}
                      </div>
                      
                      {room.description && (
                        <p className="text-text-secondary text-sm line-clamp-2 mb-3 max-w-2xl">
                          {room.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-6 text-xs text-text-tertiary font-mono">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-neon-cyan/70" />
                          <span className="text-white/80">{room.memberCount}</span> members
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-neon-purple/70" />
                          <span className="text-white/80">{room.messageCount}</span> messages
                        </span>
                        <span className="flex items-center gap-1.5 border-l border-white/10 pl-6">
                          Active: <span className="text-neon-green">{formatLastActivity(room.lastMessageAt)}</span>
                        </span>
                      </div>
                    </div>
                    
                    {/* Join Arrow */}
                    <div className="self-center pr-4">
                      <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-text-tertiary group-hover:text-black group-hover:bg-neon-cyan group-hover:border-neon-cyan transition-all duration-300">
                        <ChevronRight className="w-5 h-5" />
                      </div>
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
      <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6">
        <LoadingSkeleton className="h-12 w-48 mb-6" />
        <LoadingSkeleton className="h-16 w-full mb-6" />
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <LoadingSkeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    }>
      <ChatPageContent />
    </ClientOnly>
  );
}
