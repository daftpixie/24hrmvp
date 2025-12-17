'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { TrendingUp, ArrowUp } from 'lucide-react';

interface VoteUpdate {
  ideaId: string;
  newVoteCount: number;
  delta: number;
  timestamp: string;
}

interface RealTimeVotesProps {
  ideaId?: string;
  onVoteUpdate?: (update: VoteUpdate) => void;
}

export default function RealTimeVotes({ ideaId, onVoteUpdate }: RealTimeVotesProps) {
  const [recentUpdates, setRecentUpdates] = useState<VoteUpdate[]>([]);
  const { isConnected, onVoteUpdate: subscribeVoteUpdate } = useWebSocket();

  useEffect(() => {
    if (!subscribeVoteUpdate) return;

    const unsubscribe = subscribeVoteUpdate((data: VoteUpdate) => {
      // Filter for specific idea if ideaId provided
      if (ideaId && data.ideaId !== ideaId) return;

      // Add to recent updates
      setRecentUpdates(prev => {
        const newUpdates = [data, ...prev].slice(0, 10);
        return newUpdates;
      });

      // Call callback if provided
      if (onVoteUpdate) {
        onVoteUpdate(data);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribeVoteUpdate, ideaId, onVoteUpdate]);

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <TrendingUp className="w-4 h-4" />
        <span>Real-time updates offline</span>
      </div>
    );
  }

  if (recentUpdates.length === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <TrendingUp className="w-4 h-4 text-[#04D9FF]" />
        <span>Watching for votes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-[#04D9FF]">
        <TrendingUp className="w-4 h-4" />
        <span>Live Updates</span>
      </div>
      <div className="space-y-1">
        {recentUpdates.slice(0, 5).map((update, index) => (
          <div 
            key={`${update.ideaId}-${update.timestamp}-${index}`}
            className="flex items-center gap-2 text-sm text-gray-400 animate-fade-in"
          >
            <ArrowUp className={`w-3 h-3 ${update.delta > 0 ? 'text-green-400' : 'text-red-400'}`} />
            <span>
              {update.delta > 0 ? '+' : ''}{update.delta} vote{Math.abs(update.delta) !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-500">
              {new Date(update.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
