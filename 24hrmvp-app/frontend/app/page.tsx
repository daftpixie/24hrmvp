'use client';

import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api';
import Header from '@/components/layout/Header';
import Link from 'next/link';

interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  voteCount: number;
  submittedBy: {
    username: string;
    displayName?: string;
    pfpUrl?: string;
  };
}

function HomeContent() {
  const { isAuthenticated } = useAuth();
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [topIdeas, setTopIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const cycleResult = await apiClient.getActiveCycle();
      if (cycleResult.success) {
        setActiveCycle(cycleResult.cycle);
        setTopIdeas(cycleResult.cycle.ideas.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-deepest">
      <Header />
      
      <div className="laser-grid"></div>

      <section className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="hero-title text-6xl md:text-7xl font-display font-black mb-6">
            Build Your MVP in
            <br />
            <span className="text-neon-cyan">24 Hours</span>
          </h1>
          <p className="text-xl text-text-secondary mb-8 font-body">
            Community-driven platform where ideas become reality.
            <br />
            Submit, vote, and watch AI build winning projects.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/submit" className="btn-chrome-primary px-8 py-3 inline-block">
                  Submit Idea
                </Link>
                <Link href="/vote" className="btn-neon px-8 py-3 inline-block">
                  Vote Now
                </Link>
              </>
            ) : (
              <div className="text-text-secondary">
                Connect your wallet to participate
              </div>
            )}
          </div>
        </div>
      </section>

      {activeCycle ? (
        <section className="container mx-auto px-4 py-12 relative z-10">
          <div className="chrome-glass-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-heading font-bold text-text-primary">
                Current Cycle: {activeCycle.name}
              </h2>
              <div className="text-right">
                <p className="text-sm text-text-secondary">Time Remaining</p>
                <p className="text-2xl font-mono font-bold text-neon-cyan">
                  {activeCycle.hoursRemaining}h
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-text-secondary">
                Loading ideas...
              </div>
            ) : topIdeas.length > 0 ? (
              <div className="space-y-4">
                {topIdeas.map((idea, index) => (
                  <Link key={idea.id} href={`/ideas/${idea.id}`} className="block">
                    <div className="data-card hover:border-neon-cyan transition-all cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl font-mono font-bold text-neon-cyan">
                              #{index + 1}
                            </span>
                            <h3 className="text-lg font-heading font-semibold text-text-primary">
                              {idea.title}
                            </h3>
                          </div>
                          <p className="text-text-secondary text-sm line-clamp-2 mb-3">
                            {idea.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            {idea.submittedBy.pfpUrl && (
                              <img
                                src={idea.submittedBy.pfpUrl}
                                alt={idea.submittedBy.username}
                                className="w-5 h-5 rounded-full"
                              />
                            )}
                            <span className="text-text-tertiary">
                              by {idea.submittedBy.displayName || idea.submittedBy.username}
                            </span>
                            <span className="text-text-tertiary">•</span>
                            <span className="px-2 py-1 bg-surface-1 rounded text-neon-cyan">
                              {idea.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-mono font-bold text-neon-cyan">
                            {idea.voteCount}
                          </div>
                          <div className="text-xs text-text-secondary">votes</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                No ideas yet. Be the first to submit!
              </div>
            )}

            <div className="mt-6 text-center">
              <Link href="/ideas" className="text-neon-cyan hover:underline font-heading">
                View All Ideas →
              </Link>
            </div>
          </div>
        </section>
      ) : !isLoading && (
        <section className="container mx-auto px-4 py-12 relative z-10">
          <div className="chrome-glass-card p-8 text-center">
            <p className="text-text-secondary text-lg">
              No active voting cycle at the moment.
            </p>
            <p className="text-text-tertiary text-sm mt-2">
              Check back soon for the next cycle!
            </p>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="data-card text-center">
            <div className="data-card-value">24h</div>
            <p className="text-text-secondary mt-2">Build Time</p>
          </div>
          <div className="data-card text-center">
            <div className="data-card-value">100%</div>
            <p className="text-text-secondary mt-2">Community Driven</p>
          </div>
          <div className="data-card text-center">
            <div className="data-card-value">AI</div>
            <p className="text-text-secondary mt-2">Powered Build</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <ClientOnly fallback={<LoadingSkeleton />}>
      <HomeContent />
    </ClientOnly>
  );
}