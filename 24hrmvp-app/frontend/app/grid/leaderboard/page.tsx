'use client';

export const dynamic = 'force-dynamic'


import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useState } from 'react';
import { useLeaderboard } from '@/hooks/useGrid';
import { useAuth } from '@/providers/AuthProvider';
import { Trophy, Lightbulb, Vote, MessageSquare, Award, Loader2, AlertCircle, ChevronDown } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-[#FFD700]" />Leaderboard
        </h1>
        <p className="text-[#808080] mt-1">Top contributors and community champions</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <button key={m.value} onClick={() => setMetric(m.value)} className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${metric === m.value ? 'bg-[#04D9FF]/10 border-[#04D9FF] text-[#04D9FF]' : 'bg-[#1E1E1E] border-white/10 text-[#808080] hover:border-white/30'}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="relative">
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as TimeframeType)} className="appearance-none w-full md:w-40 px-4 py-3 bg-[#1E1E1E] border border-white/10 rounded-lg text-white pr-10 focus:outline-none focus:border-[#04D9FF]">
            {timeframes.map((tf) => (
              <option key={tf.value} value={tf.value}>{tf.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#808080] pointer-events-none" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />{error}
        </div>
      )}

      <div className="bg-[#1E1E1E]/60 border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-white/5 text-[#808080] text-sm font-medium">
          <div className="col-span-1">Rank</div>
          <div className="col-span-7">User</div>
          <div className="col-span-4 text-right">{currentMetric?.label}</div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#04D9FF]" />
            <p className="text-[#808080] mt-2">Loading rankings...</p>
          </div>
        ) : entries.length > 0 ? (
          <div className="divide-y divide-white/5">
            {entries.map((entry) => {
              const isCurrentUser = user?.fid === entry.user.fid;
              return (
                <div key={entry.user.id} className={`grid grid-cols-12 gap-4 px-4 py-3 items-center ${isCurrentUser ? 'bg-[#04D9FF]/5' : 'hover:bg-white/5'}`}>
                  <div className="col-span-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankStyle(entry.rank)}`}>{entry.rank}</div>
                  </div>
                  <div className="col-span-7 flex items-center gap-3">
                    <img src={entry.user.pfpUrl || '/default-avatar.png'} alt="" className={`w-10 h-10 rounded-full border-2 ${entry.rank <= 3 ? 'border-[#FFD700]' : 'border-white/20'}`} />
                    <div>
                      <p className={`font-medium ${isCurrentUser ? 'text-[#04D9FF]' : 'text-white'}`}>{entry.user.displayName || entry.user.username}{isCurrentUser && <span className="ml-2 text-xs">(You)</span>}</p>
                      <p className="text-[#808080] text-sm">@{entry.user.username}</p>
                    </div>
                  </div>
                  <div className="col-span-4 text-right">
                    <span className={`font-mono font-bold text-lg ${entry.rank === 1 ? 'text-[#FFD700]' : entry.rank === 2 ? 'text-gray-300' : entry.rank === 3 ? 'text-amber-600' : 'text-[#04D9FF]'}`}>{entry.score.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-[#808080]">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No rankings yet</p>
          </div>
        )}
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