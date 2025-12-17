'use client';

// ============================================
// 24HRMVP - VOTE RANKINGS (FIXED)
// File: frontend/components/vote/VoteRankings.tsx
// Shows top voted ideas in a sidebar
// ============================================

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Loader2 } from 'lucide-react';
import { getApiUrl } from '@/lib/config';

interface RankedIdea {
  id: string;
  title: string;
  voteCount: number;
  category: string;
  submittedBy: {
    username: string;
    displayName?: string;
    pfpUrl?: string;
  };
}

interface VoteRankingsProps {
  limit?: number;
  refreshInterval?: number;
}

export default function VoteRankings({ 
  limit = 5, 
  refreshInterval = 30000 
}: VoteRankingsProps) {
  const [rankings, setRankings] = useState<RankedIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRankings();
    
    // Auto-refresh rankings
    const interval = setInterval(fetchRankings, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchRankings = async () => {
    try {
      // Don't show loading on refresh, only on initial load
      if (rankings.length === 0) {
        setLoading(true);
      }
      setError(null);
      
      // Use centralized config - NEVER undefined
      const apiUrl = getApiUrl();
      
      const response = await fetch(
        `${apiUrl}/api/ideas?status=approved&sortBy=voteCount&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.ideas) {
        setRankings(data.ideas);
      }
    } catch (err) {
      console.error('Failed to fetch rankings:', err);
      setError('Unable to load rankings');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Trophy className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Trophy className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 text-center text-[--text-secondary]">{rank}</span>;
    }
  };

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/10 to-transparent border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/10 to-transparent border-amber-600/30';
      default:
        return 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.1)]';
    }
  };

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-2xl border border-[rgba(4,217,255,0.1)] p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[rgba(4,217,255,0.1)] rounded-lg">
          <TrendingUp className="w-5 h-5 text-[--neon-cyan]" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-white">Top Rankings</h3>
          <p className="text-xs text-[--text-secondary]">Live vote counts</p>
        </div>
      </div>

      {/* Rankings List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[--neon-cyan]" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-[--text-secondary] text-sm">{error}</p>
            <button 
              onClick={fetchRankings}
              className="mt-2 text-[--neon-cyan] text-sm hover:underline"
            >
              Try again
            </button>
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[--text-secondary] text-sm">No rankings yet</p>
          </div>
        ) : (
          rankings.map((idea, index) => (
            <div
              key={idea.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer ${getRankBgColor(index + 1)}`}
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-8">
                {getRankIcon(index + 1)}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white text-sm truncate">
                  {idea.title}
                </h4>
                <p className="text-xs text-[--text-secondary] truncate">
                  by {idea.submittedBy?.displayName || idea.submittedBy?.username || 'Anonymous'}
                </p>
              </div>
              
              {/* Vote Count */}
              <div className="text-right">
                <span className="font-mono font-bold text-[--neon-cyan]">
                  {idea.voteCount}
                </span>
                <p className="text-xs text-[--text-secondary]">votes</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
