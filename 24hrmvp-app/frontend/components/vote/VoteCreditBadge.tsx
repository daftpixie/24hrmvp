'use client';

// ============================================
// 24HRMVP - VOTE CREDIT BADGE (FIXED)
// File: frontend/components/vote/VoteCreditBadge.tsx
// Shows user's vote credit balance with purchase option
// ============================================

import { useState, useEffect } from 'react';
import { Coins, Plus, Loader2 } from 'lucide-react';
import { getApiUrl } from '@/lib/config';

interface VoteCreditBadgeProps {
  onPurchaseClick: () => void;
  refreshTrigger?: number;
}

export default function VoteCreditBadge({ 
  onPurchaseClick, 
  refreshTrigger = 0 
}: VoteCreditBadgeProps) {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCredits();
  }, [refreshTrigger]);

  const fetchCredits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use centralized config - NEVER undefined
      const apiUrl = getApiUrl();
      
      // Get auth token safely
      const token = typeof window !== 'undefined' 
        ? (sessionStorage.getItem('24hrmvp_access_token') || localStorage.getItem('farcaster_token'))
        : null;
      
      if (!token) {
        // Not logged in - show 0 credits
        setCredits(0);
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${apiUrl}/api/vote-purchase/credits`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        // Handle non-200 responses gracefully
        if (response.status === 401) {
          setCredits(0);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setCredits(data.credits || 0);
      } else {
        setCredits(0);
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
      setError('Unable to load credits');
      setCredits(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Credit Display */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.05)] rounded-xl border border-[rgba(4,217,255,0.2)]">
        <Coins className="w-5 h-5 text-[--neon-cyan]" />
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[--text-secondary]" />
        ) : error ? (
          <span className="text-[--text-secondary] text-sm">--</span>
        ) : (
          <span className="font-mono font-bold text-[--neon-cyan]">
            {credits.toLocaleString()}
          </span>
        )}
        <span className="text-[--text-secondary] text-sm">credits</span>
      </div>

      {/* Purchase Button */}
      <button
        onClick={onPurchaseClick}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[--neon-cyan] to-[--neon-blue] text-[--bg-deepest] font-semibold rounded-xl hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" />
        <span>Get More</span>
      </button>
    </div>
  );
}
