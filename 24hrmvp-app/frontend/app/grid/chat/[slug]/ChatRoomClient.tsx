'use client';

export async function generateStaticParams() {
  return [
    { slug: 'general' },
    { slug: 'ideas' },
    { slug: 'builders' },
    { slug: 'announcements' },
    { slug: 'help' },
  ];
}

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ChatRoom from '@/components/grid/ChatRoom';
import ChatRoomList from '@/components/grid/ChatRoomList';

interface Room {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  memberCount: number;
  messageCount: number;
  maxMembers: number;
  isActive: boolean;
  createdBy: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
}

function ChatRoomPageContent() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  
  // TODO: Get from auth context
  const currentUserId = 'cmiiio6fu0000kn6hvr9dzpb6'; // Placeholder
  const currentUsername = 'mattyh'; // Placeholder

  useEffect(() => {
    if (slug) {
      fetchRoom();
    }
  }, [slug]);

  const fetchRoom = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.24hrmvp.xyz';
      const res = await fetch(`${apiUrl}/api/chat/rooms/${slug}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Room not found');
        }
        throw new Error('Failed to load room');
      }
      
      const data = await res.json();
      setRoom(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B192A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#04D9FF] mx-auto mb-4" />
          <p className="text-gray-400">Loading chat room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-[#0B192A] flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-4">ðŸ˜•</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {error === 'Room not found' ? 'Room Not Found' : 'Error'}
          </h2>
          <p className="text-gray-400 mb-6">
            {error === 'Room not found' 
              ? "The chat room you're looking for doesn't exist or has been deleted."
              : error
            }
          </p>
          <Link
            href="/grid/chat"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#04D9FF] text-black rounded-lg hover:bg-[#04D9FF]/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Chat Rooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B192A] flex">
      {/* Sidebar - Room List */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: showSidebar ? 0 : -300 }}
        className={`
          w-80 flex-shrink-0 border-r border-white/10 bg-[#1E1E1E]/50
          hidden lg:block overflow-y-auto
        `}
      >
        <div className="p-4 border-b border-white/10">
          <Link 
            href="/grid" 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Grid
          </Link>
        </div>
        <div className="p-4">
          <ChatRoomList selectedRoomId={room.id} />
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-3 p-3 border-b border-white/10 bg-[#1E1E1E]/80">
          <Link
            href="/grid/chat"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <span className="text-white font-semibold"># {room.name}</span>
        </div>

        {/* Chat Room Component */}
        <div className="flex-1 overflow-hidden">
          <ChatRoom
            room={room}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
          />
        </div>
      </div>

      {/* Right Sidebar - Room Info (optional, for desktop) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-64 flex-shrink-0 border-l border-white/10 bg-[#1E1E1E]/30 hidden xl:block overflow-y-auto"
      >
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Room Info
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-bold text-white"># {room.name}</h4>
              {room.description && (
                <p className="text-sm text-gray-400 mt-1">{room.description}</p>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Members</span>
                <span className="text-white">{room.memberCount} / {room.maxMembers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Messages</span>
                <span className="text-white">{room.messageCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Created by</span>
                <span className="text-[#04D9FF]">@{room.createdBy.username}</span>
              </div>
            </div>

            {/* Join/Leave Button */}
            <button
              className="w-full mt-4 px-4 py-2 bg-[#04D9FF]/20 border border-[#04D9FF]/50 text-[#04D9FF] rounded-lg hover:bg-[#04D9FF]/30 transition-colors"
              onClick={() => alert('Join/Leave functionality coming soon!')}
            >
              Join Room
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ChatRoomClient() {
  return <ChatRoomPageContent />;
}

