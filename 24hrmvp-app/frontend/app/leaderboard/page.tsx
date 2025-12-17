'use client';

import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import Header from '@/components/layout/Header';
import { useState } from 'react';
import { useLeaderboard, LeaderboardType } from '@/hooks/useGrid';
import { useAuth } from '@/providers/AuthProvider';
import { Trophy, Lightbulb, Vote, MessageSquare, Award, Loader2, AlertCircle, ChevronDown, Medal } from 'lucide-react';

const leaderboardTabs: { value: LeaderboardType; label: string; icon: any; description: string }[] = [
  { value: 'points', label: 'Overall', icon: Trophy, description: 'Total contribution score' },
  { value: 'submissions', label: 'Ideas', icon: Lightbulb, description: 'Most submitted ideas' },
  { value: 'votes', label: 'Votes', icon: Vote, description: 'Most active voters' },
  { value: 'forum_score', label: 'Engagement', icon: MessageSquare, description: 'Most engaged members' },
];

const timeframeOptions = [
  { value: 'all' as const, label: 'All Time' },
  { value: 'month' as const, label: 'This Month' },
  { value: 'week' as const, label: 'This Week' },
];

function LeaderboardPageContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('points');
  const [timeframe, setTimeframe] = useState<'all' | 'week' | 'month'>('all');
  const [showTimeframe, setShowTimeframe] = useState(false);

  const { entries, loading, error, refresh } = useLeaderboard({
    metric: activeTab,
    timeframe,
    limit: 50
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: Medal, color: 'text-yellow-400', glow: 'shadow-yellow-500/50' };
    if (rank === 2) return { icon: Medal, color: 'text-gray-300', glow: 'shadow-gray-400/50' };
    if (rank === 3) return { icon: Medal, color: 'text-amber-600', glow: 'shadow-amber-600/50' };
    return { icon: Award, color: 'text-[#808080]', glow: '' };
  };

  const currentTab = leaderboardTabs.find(t => t.value === activeTab)!;
  const TabIcon = currentTab.icon;

  return (
    <div className="min-h-screen bg-[#0B192A] text-white">
      <Header />
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#04D9FF] to-[#00FFA3] bg-clip-text text-transparent">
              Leaderboard
            </h1>
            <p className="text-white/60">Top contributors to the 24HRMVP community</p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex justify-end relative">
            <button
              onClick={() => setShowTimeframe(!showTimeframe)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E1E1E] border border-white/10 rounded-lg hover:border-[#04D9FF]/30 transition-colors"
            >
              <span className="text-sm">{timeframeOptions.find(t => t.value === timeframe)?.label}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showTimeframe ? 'rotate-180' : ''}`} />
            </button>
            {showTimeframe && (
              <div className="absolute top-full mt-2 right-0 bg-[#1E1E1E] border border-white/10 rounded-lg overflow-hidden z-10 min-w-[160px]">
                {timeframeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTimeframe(option.value);
                      setShowTimeframe(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                      timeframe === option.value ? 'text-[#04D9FF] bg-[#04D9FF]/10' : 'text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {leaderboardTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-[#04D9FF]/10 border-[#04D9FF]/50 shadow-[0_0_20px_rgba(4,217,255,0.2)]'
                      : 'bg-[#1E1E1E]/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isActive ? 'text-[#04D9FF]' : 'text-white/60'}`} />
                  <div className="text-sm font-medium">{tab.label}</div>
                  <div className="text-xs text-white/40 mt-1">{tab.description}</div>
                </button>
              );
            })}
          </div>

          {/* Current Tab Info */}
          <div className="bg-[#1E1E1E]/60 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <TabIcon className="w-5 h-5 text-[#04D9FF]" />
              <div>
                <h2 className="font-semibold">{currentTab.label} Leaderboard</h2>
                <p className="text-sm text-white/60">{currentTab.description}</p>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-500">{error}</span>
            </div>
          )}

          {/* Loading State */}
          {loading && entries.length === 0 ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <LoadingSkeleton key={i} className="h-20" />
              ))}
            </div>
          ) : entries.length > 0 ? (
            <div className="space-y-3">
              {entries.map((entry) => {
                const badge = getRankBadge(entry.rank);
                const BadgeIcon = badge.icon;
                const isCurrentUser = user?.fid === entry.user.fid;

                return (
                  <div
                    key={entry.user.fid}
                    className={`bg-[#1E1E1E]/60 border rounded-xl p-4 flex items-center gap-4 ${
                      isCurrentUser 
                        ? 'border-[#04D9FF]/50 shadow-[0_0_15px_rgba(4,217,255,0.15)]' 
                        : 'border-white/10'
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className={`flex flex-col items-center min-w-[60px] ${badge.glow ? `shadow-lg ${badge.glow}` : ''}`}>
                      <BadgeIcon className={`w-6 h-6 ${badge.color} mb-1`} />
                      <span className="text-sm font-bold text-white/80">#{entry.rank}</span>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {entry.user.pfpUrl ? (
                        <img
                          src={entry.user.pfpUrl}
                          alt={entry.user.username}
                          className="w-12 h-12 rounded-full border-2 border-white/10"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#04D9FF] to-[#00FFA3] flex items-center justify-center text-black font-bold">
                          {entry.user.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{entry.user.displayName || entry.user.username}</p>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 bg-[#04D9FF]/20 text-[#04D9FF] text-xs rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/60 truncate">@{entry.user.username}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#04D9FF]">{entry.score.toLocaleString()}</div>
                      <div className="text-xs text-white/60">points</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-[#1E1E1E]/60 border border-white/10 rounded-xl">
              <Trophy className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/60 mb-4">No leaderboard data available</p>
              <button
                onClick={refresh}
                className="px-4 py-2 bg-[#04D9FF] hover:bg-[#04D9FF]/90 text-black font-medium rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>
          )}

          {/* Loading More Indicator */}
          {loading && entries.length > 0 && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 text-[#04D9FF] animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <ClientOnly fallback={<LoadingSkeleton className="h-screen" />}>
      <LeaderboardPageContent />
    </ClientOnly>
  );
}
