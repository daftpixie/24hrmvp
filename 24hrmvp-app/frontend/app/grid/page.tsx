'use client';

// PRODUCTION FIX: Force dynamic rendering for auth context
export const dynamic = 'force-dynamic'

// ============================================
// 24HRMVP - GRID OVERVIEW PAGE
// File: frontend/app/grid/page.tsx
// ============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { getApiUrl } from '@/lib/config';
import { 
  MessageCircle, 
  MessageSquare, 
  Users, 
  Trophy, 
  Radio, 
  Activity, 
  Zap,
  ArrowRight
} from 'lucide-react';

interface GridStats {
  chatRooms: number;
  activeUsers: number;
  forumPosts: number;
  totalMessages: number;
}

function GridOverviewContent() {
  const [stats, setStats] = useState<GridStats>({
    chatRooms: 5,
    activeUsers: 0,
    forumPosts: 0,
    totalMessages: 0
  });

  useEffect(() => {
    // Fetch stats from API
    const fetchStats = async () => {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/grid/stats`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        console.error('Failed to fetch grid stats:', err);
      }
    };

    fetchStats();
  }, []);

  const features = [
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Real-time conversations with the community',
      icon: MessageCircle,
      href: '/grid/chat',
      color: 'text-neon-cyan',
      borderColor: 'group-hover:border-neon-cyan/50',
      stat: `${stats.chatRooms} rooms`,
    },
    {
      id: 'forum',
      title: 'Forum',
      description: 'Discuss ideas and share knowledge',
      icon: MessageSquare,
      href: '/grid/forum',
      color: 'text-neon-purple',
      borderColor: 'group-hover:border-neon-purple/50',
      stat: `${stats.forumPosts} posts`,
    },
    {
      id: 'social',
      title: 'Social Feed',
      description: 'Follow community activity and updates',
      icon: Users,
      href: '/grid/social',
      color: 'text-green-400',
      borderColor: 'group-hover:border-green-400/50',
      stat: 'Coming soon',
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard',
      description: 'Top contributors and builders',
      icon: Trophy,
      href: '/grid/leaderboard',
      color: 'text-yellow-400',
      borderColor: 'group-hover:border-yellow-400/50',
      stat: 'View rankings',
    },
    {
      id: 'live',
      title: 'Livestreams',
      description: 'Watch live MVP builds and events',
      icon: Radio,
      href: '/grid/live',
      color: 'text-neon-pink',
      borderColor: 'group-hover:border-neon-pink/50',
      stat: 'Coming soon',
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Welcome Section */}
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-wide">
          Welcome to <span className="text-neon-cyan">The Grid</span>
        </h1>
        <p className="text-xl text-text-secondary max-w-2xl font-body">
          Your community hub for connecting with builders, sharing ideas, and following the 24HRMVP journey.
        </p>
      </div>

      {/* Stats HUD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Chat Rooms', value: stats.chatRooms, icon: MessageCircle, color: 'text-neon-cyan' },
          { label: 'Active Users', value: stats.activeUsers || '—', icon: Users, color: 'text-neon-blue' },
          { label: 'Forum Posts', value: stats.forumPosts || '—', icon: MessageSquare, color: 'text-neon-purple' },
          { label: 'Messages', value: stats.totalMessages || '—', icon: Activity, color: 'text-neon-pink' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface-1/40 border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:bg-surface-1/60 transition-colors group">
            <div className={`p-3 rounded-lg bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-white">{stat.value}</div>
              <div className="text-xs text-text-tertiary uppercase tracking-wider font-bold">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link 
              key={feature.id} 
              href={feature.href}
              className={`group relative p-6 rounded-2xl bg-surface-1/40 border border-white/10 overflow-hidden transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl hover:bg-surface-1/60 ${feature.borderColor}`}
            >
              {/* Card Glow Effect */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl bg-white/5 ${feature.color} ring-1 ring-white/10 group-hover:ring-white/20 transition-all`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-tertiary group-hover:text-white transform group-hover:translate-x-1 transition-all" />
                </div>
                
                <h3 className="text-xl font-heading font-bold text-white mb-2 group-hover:text-neon-cyan transition-colors">
                  {feature.title}
                </h3>
                
                <p className="text-text-secondary text-sm mb-6 flex-grow">
                  {feature.description}
                </p>
                
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className={`text-xs font-mono ${feature.color}`}>
                    {feature.stat}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${feature.stat === 'Coming soon' ? 'bg-gray-600' : 'bg-green-500 animate-pulse'}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity Ticker */}
      <div className="bg-surface-1/30 border border-white/10 rounded-xl p-4 flex items-center gap-4 overflow-hidden">
        <div className="flex items-center gap-2 text-neon-cyan font-bold whitespace-nowrap px-2 border-r border-white/10">
          <Zap className="w-4 h-4 fill-current" />
          <span className="text-sm font-mono tracking-widest uppercase">Live Activity</span>
        </div>
        <div className="flex-1 overflow-hidden relative h-6">
          <div className="animate-marquee whitespace-nowrap absolute top-0 left-0 flex gap-8 items-center text-sm text-text-secondary">
            {[
              'New idea submitted: "AI-Powered Code Review Tool"',
              'Voting cycle started for Week 12',
              'MVP "Task Automator" completed and deployed',
              'User @crypto_dev joined the chat',
              'New forum discussion: "Scaling Web3 Infrastructure"'
            ].map((activity, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-neon-purple" />
                {activity}
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

export default function GridPage() {
  return (
    <ClientOnly fallback={<LoadingSkeleton />}>
      <GridOverviewContent />
    </ClientOnly>
  );
}
