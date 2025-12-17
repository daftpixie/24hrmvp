'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageSquare, Users, Hash, Lock, Globe, RefreshCw } from 'lucide-react';
import { getApiUrl } from '@/lib/config';

interface ChatRoom {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: 'PUBLIC' | 'PRIVATE' | 'DIRECT';
  memberCount: number;
  messageCount: number;
  lastMessageAt: string | null;
  isActive: boolean;
}

interface ChatRoomListProps {
  selectedRoomId?: string;
}

const roomIcons: Record<string, string> = {
  general: '💬',
  ideas: '💡',
  builders: '🔧',
  announcements: '📢',
  help: '❓',
};

export default function ChatRoomList({ selectedRoomId }: ChatRoomListProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/chat/rooms`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat rooms');
      }
      const data = await response.json();
      setRooms(data.rooms || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

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

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No chat rooms available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
                  <div className="text-2xl">
                    {roomIcons[room.slug] || <Hash className="w-6 h-6 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold transition-colors ${
                        isSelected ? 'text-[#04D9FF]' : 'text-white group-hover:text-[#04D9FF]'
                      }`}>
                        {room.name}
                      </h3>
                      {room.type === 'PRIVATE' ? (
                        <Lock className="w-3.5 h-3.5 text-gray-500" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </div>
                    {room.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                        {room.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {room.memberCount} members
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {room.messageCount} messages
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
