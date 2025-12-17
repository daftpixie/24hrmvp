'use client';

// ============================================
// 24HRMVP - GRID HEADER COMPONENT
// File: frontend/components/grid/GridHeader.tsx
// Navigation header for The Grid sections
// ============================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  MessageCircle, 
  MessageSquare, 
  Users, 
  Trophy,
  Radio,
  LayoutGrid
} from 'lucide-react';

interface GridHeaderProps {
  activeTab?: 'overview' | 'chat' | 'forum' | 'social' | 'leaderboard' | 'live';
}

const tabs = [
  { id: 'overview', label: 'Overview', href: '/grid', icon: LayoutGrid },
  { id: 'chat', label: 'Chat', href: '/grid/chat', icon: MessageCircle },
  { id: 'forum', label: 'Forum', href: '/grid/forum', icon: MessageSquare },
  { id: 'social', label: 'Social', href: '/grid/social', icon: Users },
  { id: 'leaderboard', label: 'Leaderboard', href: '/grid/leaderboard', icon: Trophy },
  { id: 'live', label: 'Live', href: '/grid/live', icon: Radio },
];

export default function GridHeader({ activeTab }: GridHeaderProps) {
  const pathname = usePathname();
  
  // Determine active tab from pathname if not provided
  const currentTab = activeTab || tabs.find(tab => 
    tab.href === pathname || 
    (tab.id !== 'overview' && pathname?.startsWith(tab.href))
  )?.id || 'overview';

  return (
    <div className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(4,217,255,0.1)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[--neon-cyan] to-[--neon-purple] flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-white">The Grid</h1>
              <p className="text-xs text-[--text-secondary]">Community Hub</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === currentTab;
            
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[rgba(4,217,255,0.1)] text-[--neon-cyan] border-b-2 border-[--neon-cyan]'
                    : 'text-[--text-secondary] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[--neon-cyan]' : ''}`} />
                <span>{tab.label}</span>
                {tab.id === 'live' && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
