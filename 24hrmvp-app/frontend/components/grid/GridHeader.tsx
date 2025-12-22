'use client';

// ============================================
// 24HRMVP - GRID HEADER COMPONENT
// File: frontend/components/grid/GridHeader.tsx
// Navigation header for The Grid sections
// ============================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, MessageSquare, Users, Trophy, Radio, LayoutGrid } from 'lucide-react';

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
    tab.href === pathname || (tab.id !== 'overview' && pathname?.startsWith(tab.href))
  )?.id || 'overview';

  return (
    <div className="sticky top-16 z-40 w-full border-b border-white/10 bg-[#0B192A]/90 backdrop-blur-md">
      <div className="container mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
          
          {/* Header Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 border border-neon-cyan/30 shadow-[0_0_15px_rgba(4,217,255,0.15)]">
              <LayoutGrid className="w-6 h-6 text-neon-cyan" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-white tracking-wide">
                The <span className="text-neon-cyan">Grid</span>
              </h1>
              <p className="text-xs text-text-secondary font-mono tracking-wider uppercase">Community Hub</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 no-scrollbar mask-gradient-right">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;
              
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`relative px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 group whitespace-nowrap ${
                    isActive 
                      ? 'text-white bg-white/5 border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.05)]' 
                      : 'text-text-tertiary hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-neon-cyan' : 'group-hover:text-neon-cyan/70'
                  }`} />
                  <span className={`text-sm font-medium ${isActive ? 'font-heading' : 'font-body'}`}>
                    {tab.label}
                  </span>
                  
                  {/* Active Indicator Line */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-80" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
