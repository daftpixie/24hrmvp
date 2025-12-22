'use client';

export const dynamic = 'force-dynamic'

import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useState } from 'react';
import { useLeaderboard } from '@/hooks/useGrid';
import { useAuth } from '@/providers/AuthProvider';
import { Trophy, Lightbulb, Vote, MessageSquare, Award, Loader2, AlertCircle, ChevronDown, User } from 'lucide-react';

type MetricType = 'points' | 'submissions' | 'votes' | 'forum_score' | 'achievements';
type TimeframeType = 'day' | 'week' | 'month' | 'year' | 'all';

const metrics = [
  { value: 'points' as MetricType, label: 'Points', icon: Trophy },
  { value: 'submissions' as MetricType, label: 'Ideas', icon: Lightbulb },
  { value: 'votes' as MetricType, label: 'Votes', icon: Vote },
  { value: 'forum_score' as MetricType, label: 'Forum', icon: MessageSquare },
  { value: 'achievements' as MetricType, label: 'Achievements', icon: Award },
];

const timeframes = [
  { value: 'day' as TimeframeType, label: 'Today' },
  { value: 'week' as TimeframeType, label: 'This Week' },
  { value: 'month' as TimeframeType, label: 'This Month' },
  { value: 'all' as TimeframeType, label: 'All Time' },
];

function LeaderboardPageContent() {
  const { user } = useAuth();
  const [metric, setMetric] = useState<MetricType>('points');
  const [timeframe, setTimeframe] = useState<TimeframeType>('all');

  const { entries, loading, error } = useLeaderboard({ metric, timeframe, limit: 50 });

  const currentMetric = metrics.find(m => m.value === metric);

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-black';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
    return 'bg-white/10 text-white';
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-display font-bold text-white flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" /> Leaderboard
        </h1>
        <p className="text-text-secondary mt-1">Top contributors and community champions</p>
      </div>

      <div className="bg-surface-1/50 border border-white/10 rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <button key={m.value} onClick={() => setMetric(m.value)} className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${metric === m.value ? 'bg-[#04D9FF]/10 border-[#04D9FF] text-[#04D9FF]' : 'bg-[#1E1E1E] border-white/10 text-[#808080] hover:border-white/30'}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as TimeframeType)}
              className="appearance-none w-full md:w-40 px-4 py-3 bg-[#1E1E1E] border border-white/10 rounded-lg text-white pr-10 focus:outline-none focus:border-[#04D9FF]"
            >
              {timeframes.map((tf) => (
                <option key={tf.value} value={tf.value}>{tf.label}</option>
              ))}
            </select>
            <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to fetch leaderboard: {error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-3 text-sm font-semibold text-text-secondary w-16">Rank</th>
              <th className="p-3 text-sm font-semibold text-text-secondary">User</th>
              <th className="p-3 text-sm font-semibold text-text-secondary text-right">{currentMetric?.label}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-text-secondary">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading rankings...</span>
                  </div>
                </td>
              </tr>
            ) : entries.length > 0 ? (
              entries.map((entry) => {
                const isCurrentUser = user?.fid === entry.user.fid;
                return (
                  <tr key={entry.user.fid} className={`border-b border-white/5 ${isCurrentUser ? 'bg-neon-cyan/5' : ''}`}>
                    <td className="p-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankStyle(entry.rank)}`}>
                        {entry.rank}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {entry.user.pfpUrl ? (
                          <img src={entry.user.pfpUrl} alt={entry.user.username} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-text-secondary" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-text-primary flex items-center gap-2">
                            {entry.user.displayName || entry.user.username}
                            {isCurrentUser && <span className="text-xs bg-neon-cyan text-black px-2 py-0.5 rounded-full font-bold">You</span>}
                          </div>
                          <div className="text-sm text-text-tertiary">@{entry.user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-lg font-bold text-neon-cyan">{entry.score.toLocaleString()}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-12 text-text-secondary">
                  <div className="flex flex-col items-center gap-2">
                    <Trophy className="w-10 h-10 text-text-tertiary" />
                    <span>No rankings yet</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <ClientOnly fallback={<LoadingSkeleton />}>
      <LeaderboardPageContent />
    </ClientOnly>
  );
}
