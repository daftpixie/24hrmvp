'use client';

// ============================================
// 24HRMVP - VOTE PAGE (FIXED v2)
// File: frontend/app/vote/page.tsx
// Fix: Uses getApiUrl() instead of process.env directly
// ============================================

import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import VotePurchaseModal from '@/components/vote/VotePurchaseModal';
import VoteCreditBadge from '@/components/vote/VoteCreditBadge';
import IdeaCard from '@/components/vote/IdeaCard';
import VoteRankings from '@/components/vote/VoteRankings';
import { getApiUrl } from '@/lib/config';

interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  complexity: string;
  voteCount: number;
  targetAudience?: string;
  coreFeatures?: string[];
  technicalRequirements?: string;
  expectedTimeline?: string;
  successMetrics?: string;
  fileAttachments?: Array<{
    filename: string;
    url: string;
    type: string;
    size: number;
  }>;
  fileCount: number;
  isPremiumBoosted: boolean;
  boostLevel: number;
  submittedBy: {
    username: string;
    displayName?: string;
    pfpUrl?: string;
  };
  createdAt: string;
  hasVoted?: boolean;
}

// Inner content component - only rendered on client
function VotePageContent() {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      
      // Use centralized config - NEVER undefined
      const apiUrl = getApiUrl();
      
      // Get auth token safely
      const token = typeof window !== 'undefined' 
        ? (sessionStorage.getItem('24hrmvp_access_token') || localStorage.getItem('farcaster_token'))
        : null;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(
        `${apiUrl}/api/ideas?status=approved&sortBy=voteCount`,
        {
          method: 'GET',
          headers,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setIdeas(data.ideas || []);
      }
    } catch (err) {
      console.error('Failed to fetch ideas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (ideaId: string) => {
    try {
      // Use centralized config
      const apiUrl = getApiUrl();
      
      // Get auth token safely
      const token = typeof window !== 'undefined' 
        ? (sessionStorage.getItem('24hrmvp_access_token') || localStorage.getItem('farcaster_token'))
        : null;
      
      if (!token) {
        console.error('No auth token available');
        return;
      }
      
      const response = await fetch(`${apiUrl}/api/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ ideaId }),
      });

      if (response.ok) {
        // Refresh credits and ideas
        setRefreshTrigger(prev => prev + 1);
        fetchIdeas();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Vote failed:', errorData);
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header with Credit Badge */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-heading font-bold text-[--neon-cyan]">
              Vote on Ideas
            </h1>
            
            <VoteCreditBadge
              onPurchaseClick={() => setShowPurchaseModal(true)}
              refreshTrigger={refreshTrigger}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Ideas List */}
            <div className="lg:col-span-2 space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-48 bg-[rgba(255,255,255,0.05)] rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : ideas.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[--text-secondary] text-lg">
                    No ideas available for voting yet
                  </p>
                </div>
              ) : (
                ideas.map((idea, index) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    onVote={handleVote}
                    rank={index + 1}
                    totalVotes={ideas.reduce((sum, i) => sum + i.voteCount, 0)}
                  />
                ))
              )}
            </div>

            {/* Sidebar with Rankings */}
            <div className="lg:col-span-1">
              <VoteRankings limit={5} refreshInterval={30000} />
            </div>
          </div>

          {/* Purchase Modal */}
          <VotePurchaseModal
            isOpen={showPurchaseModal}
            onClose={() => setShowPurchaseModal(false)}
            userPoints={1000}
            onPurchaseSuccess={() => setRefreshTrigger(prev => prev + 1)}
          />
        </div>
      </div>
    </>
  );
}

// Main export - wraps content in ClientOnly to prevent SSG issues
export default function VotePage() {
  return (
    <ClientOnly fallback={<LoadingSkeleton />}>
      <VotePageContent />
    </ClientOnly>
  );
}
