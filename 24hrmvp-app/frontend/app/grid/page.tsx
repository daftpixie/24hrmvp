'use client';

// PRODUCTION FIX: Force dynamic rendering for auth context
export const dynamic = 'force-dynamic'

// ============================================
// 24HRMVP - GRID OVERVIEW PAGE
// File: frontend/app/grid/page.tsx
// NOTE: Header and GridHeader are in app/grid/layout.tsx
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
      color: 'from-cyan-500 to-blue-500',
      stat: `${stats.chatRooms} rooms`,
    },
    {
      id: 'forum',
      title: 'Forum',
      description: 'Discuss ideas and share knowledge',
      icon: MessageSquare,
      href: '/grid/forum',
      color: 'from-purple-500 to-pink-500',
      stat: `${stats.forumPosts} posts`,
    },
    {
      id: 'social',
      title: 'Social Feed',
      description: 'Follow community activity and updates',
      icon: Users,
      href: '/grid/social',
      color: 'from-green-500 to-emerald-500',
      stat: 'Coming soon',
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard',
      description: 'Top contributors and builders',
      icon: Trophy,
      href: '/grid/leaderboard',
      color: 'from-yellow-500 to-orange-500',
      stat: 'View rankings',
    },
    {
      id: 'live',
      title: 'Livestreams',
      description: 'Watch live MVP builds and events',
      icon: Radio,
      href: '/grid/live',
      color: 'from-red-500 to-pink-500',
      stat: 'Coming soon',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-heading font-bold text-white mb-2">
          Welcome to The Grid
        </h2>
        <p className="text-[--text-secondary] max-w-2xl">
          Your community hub for connecting with builders, sharing ideas, and following the 24HRMVP journey.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Chat Rooms', value: stats.chatRooms, icon: MessageCircle },
          { label: 'Active Users', value: stats.activeUsers || '—', icon: Users },
          { label: 'Forum Posts', value: stats.forumPosts || '—', icon: MessageSquare },
          { label: 'Messages', value: stats.totalMessages || '—', icon: Activity },
        ].map((stat, i) => (
          <div 
            key={i}
            className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(4,217,255,0.1)]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[rgba(4,217,255,0.1)] rounded-lg">
                <stat.icon className="w-5 h-5 text-[--neon-cyan]" />
              </div>
              <div>
                <p className="text-2xl font-mono font-bold text-white">{stat.value}</p>
                <p className="text-xs text-[--text-secondary]">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          
          return (
            <Link
              key={feature.id}
              href={feature.href}
              className="group bg-[rgba(255,255,255,0.03)] rounded-2xl border border-[rgba(4,217,255,0.1)] p-6 hover:border-[rgba(4,217,255,0.3)] transition-all hover:transform hover:scale-[1.02]"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              
              <h3 className="text-xl font-heading font-bold text-white mb-2 group-hover:text-[--neon-cyan] transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-[--text-secondary] text-sm mb-4">
                {feature.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-[--text-tertiary]">{feature.stat}</span>
                <ArrowRight className="w-5 h-5 text-[--text-secondary] group-hover:text-[--neon-cyan] group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Activity Feed Teaser */}
      <div className="mt-8 bg-[rgba(255,255,255,0.03)] rounded-2xl border border-[rgba(4,217,255,0.1)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[rgba(4,217,255,0.1)] rounded-lg">
            <Zap className="w-5 h-5 text-[--neon-cyan]" />
          </div>
          <h3 className="font-heading font-bold text-white">Recent Activity</h3>
        </div>
        
        <div className="space-y-3">
          {[
            'New idea submitted: "AI-Powered Code Review Tool"',
            'Voting cycle started for Week 12',
            'MVP "Task Automator" completed and deployed',
          ].map((activity, i) => (
            <div 
              key={i}
              className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.02)] rounded-lg"
            >
              <div className="w-2 h-2 rounded-full bg-[--neon-cyan]" />
              <span className="text-sm text-[--text-secondary]">{activity}</span>
            </div>
          ))}
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
