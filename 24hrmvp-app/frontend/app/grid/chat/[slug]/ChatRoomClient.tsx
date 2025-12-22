// ============================================
// 24HRMVP - CHAT ROOM CLIENT COMPONENT
// File: frontend/app/grid/chat/[slug]/ChatRoomClient.tsx
// FIXED: Use isLoading instead of loading from useAuth
// FIXED: Use getToken helper instead of token from useAuth
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, AlertCircle, RefreshCw, Users, MessageSquare } from 'lucide-react';
import ChatRoom from '@/components/grid/ChatRoom';
import ChatRoomList from '@/components/grid/ChatRoomList';
import { useAuth, getToken } from '@/providers/AuthProvider';
import { getApiUrl } from '@/lib/config';
import ClientOnly from '@/components/ClientOnly';

// ============================================
// TYPES
// ============================================

interface ChatRoomData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  memberCount: number;
  messageCount: number;
  createdAt: string;
  iconUrl?: string;
}

interface ChatRoomClientProps {
  slug: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

function ChatRoomClientContent({ slug }: ChatRoomClientProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [room, setRoom] = useState<ChatRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // FETCH ROOM DATA
  // ============================================

  const fetchRoom = useCallback(async () => {
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
      
      const response = await fetch(`${apiUrl}/api/grid/chat/rooms/${slug}`, {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Chat room not found');
        }
        throw new Error('Failed to load chat room');
      }
      
      const data = await response.json();
      
      if (data.success && data.room) {
        setRoom(data.room);
      } else if (data.room) {
        setRoom(data.room);
      } else {
        throw new Error('Invalid room data');
      }
    } catch (err) {
      console.error('Error fetching room:', err);
      setError(err instanceof Error ? err.message : 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      fetchRoom();
    }
  }, [slug, fetchRoom]);

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#04D9FF] animate-spin mx-auto mb-4" />
          <p className="text-[#808080]">Loading chat room...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center py-16 px-8 bg-[rgba(255,255,255,0.03)] rounded-xl border border-red-500/30">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            {error === 'Chat room not found' ? 'Room Not Found' : 'Error Loading Room'}
          </h2>
          <p className="text-[#808080] mb-6">{error}</p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/grid/chat"
              className="px-6 py-3 bg-[rgba(255,255,255,0.05)] text-white rounded-lg border border-[rgba(4,217,255,0.2)] hover:border-[rgba(4,217,255,0.4)] transition-colors"
            >
              Back to Chat
            </Link>
            <button
              onClick={fetchRoom}
              className="px-6 py-3 bg-[#04D9FF] text-black font-semibold rounded-lg hover:bg-[#04D9FF]/80 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // NO ROOM DATA
  // ============================================

  if (!room) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center py-16 px-8 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(4,217,255,0.1)]">
          <MessageSquare className="w-12 h-12 text-[#04D9FF]/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Room Not Available</h2>
          <p className="text-[#808080] mb-6">This chat room could not be loaded.</p>
          <Link
            href="/grid/chat"
            className="px-6 py-3 bg-[#04D9FF] text-black font-semibold rounded-lg hover:bg-[#04D9FF]/80 transition-colors inline-block"
          >
            Browse All Rooms
          </Link>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="h-full flex">
      {/* Sidebar - Room List (hidden on mobile) */}
      <aside className="hidden lg:block w-80 border-r border-white/10 bg-[#1E1E1E]/50 overflow-y-auto">
        <div className="p-4">
          <Link
            href="/grid"
            className="inline-flex items-center gap-2 text-[#808080] hover:text-[#04D9FF] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Grid
          </Link>
          <h2 className="text-lg font-semibold text-white mb-4">Chat Rooms</h2>
          <ChatRoomList selectedRoomId={room.id} />
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-3 p-4 border-b border-white/10 bg-[#1E1E1E]/80">
          <Link
            href="/grid/chat"
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#808080]" />
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-white">{room.name}</h1>
            <div className="flex items-center gap-3 text-xs text-[#808080]">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {room.memberCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {room.messageCount}
              </span>
            </div>
          </div>
        </div>

        {/* Chat Room Component */}
        <div className="flex-1 min-h-0">
          <ChatRoom
            room={room}
            currentUserId={user?.id || ''}
            currentUsername={user?.username || 'Guest'}
          />
        </div>
      </main>
    </div>
  );
}

// ============================================
// EXPORT WITH CLIENT WRAPPER
// ============================================

export default function ChatRoomClient({ slug }: ChatRoomClientProps) {
  return (
    <ClientOnly fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#04D9FF] animate-spin mx-auto mb-4" />
          <p className="text-[#808080]">Loading...</p>
        </div>
      </div>
    }>
      <ChatRoomClientContent slug={slug} />
    </ClientOnly>
  );
}
