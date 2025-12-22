'use client';

import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api';
import Header from '@/components/layout/Header';
import Link from 'next/link';
import Image from 'next/image';

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

      {/* HERO SECTION */}
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

      {/* STORY EXPLORER CTA - PROVENANCE SECTION */}
      <section className="container mx-auto px-4 pb-12 relative z-10">
        <div className="chrome-glass-card p-8 relative overflow-hidden group">
          {/* Ambient Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <div className="inline-block px-3 py-1 mb-3 text-xs font-mono font-bold tracking-widest text-neon-cyan border border-neon-cyan/30 rounded bg-neon-cyan/5 uppercase">
                  Provenance Verified
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-text-primary mb-2">
                  Story Protocol <span className="text-neon-cyan">Explorer</span>
                </h2>
                <p className="text-text-secondary text-lg max-w-xl">
                  Explore the registered IP asset and provenance of the 24HRMVP platform on the Story Protocol blockchain.
                </p>
              </div>

              <Link 
                href="https://explorer.story.foundation/ipa/0xD930A890CF9B55937Af3c7cB7A631747b162B585"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-neon inline-flex items-center gap-3 group/btn"
              >
                <span className="relative z-10">Show in Story Explorer</span>
                <svg 
                  className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>

            <div className="flex-1 w-full max-w-md">
              <Link 
                href="https://explorer.story.foundation/ipa/0xD930A890CF9B55937Af3c7cB7A631747b162B585"
                target="_blank"
                rel="noopener noreferrer"
                className="block relative aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl transform transition-all duration-500 hover:scale-[1.02] hover:shadow-neon-cyan/20 group/card"
              >
                <Image
                  src="/Genesis Node_24HRMVP.png"
                  alt="Genesis Node 24HRMVP IP Asset"
                  fill
                  className="object-cover group-hover/card:scale-110 transition-transform duration-500"
                  priority
                />

                {/* Scanlines & Holographic Finish Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] z-20 opacity-20" />
                <div className="absolute inset-0 border border-neon-cyan/30 rounded-xl z-30" />

                {/* Optional: Subtle sheen animation over the image */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-200%] group-hover/card:animate-[shine-sweep_1s_ease-out]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MANIFESTO SECTION */}
      <section className="container mx-auto px-4 pb-12 relative z-10">
        <div className="chrome-glass-card p-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-l from-neon-purple/10 to-neon-blue/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10 flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="flex-1 space-y-4 text-center md:text-right">
              <div>
                <div className="inline-block px-3 py-1 mb-3 text-xs font-mono font-bold tracking-widest text-neon-purple border border-neon-purple/30 rounded bg-neon-purple/5 uppercase">
                  Mission Statement
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-text-primary mb-2">
                  The <span className="text-neon-purple">Manifesto</span>
                </h2>
                <div className="text-text-secondary text-lg max-w-xl ml-auto space-y-4">
                  <p>
                    We are living through a phase change in human capability. One disciplined builder, augmented by frontier models, can now ship what used to require departments.
                  </p>
                  <div className="flex flex-col md:items-end">
                     <p className="font-mono text-sm text-neon-cyan/80 border-l-2 md:border-l-0 md:border-r-2 border-neon-cyan pl-4 md:pl-0 md:pr-4 italic">
                      "Man up. Fees down. Privacy first. Code is law."
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center md:justify-end">
                <Link 
                  href="https://paragraph.com/@24hrmvp/24hrmvpxyz-manifesto"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-neon !border-neon-purple !text-neon-purple hover:!bg-neon-purple/10 inline-flex items-center gap-3 group/btn"
                >
                  <span className="relative z-10">Read the Manifesto</span>
                  <svg 
                    className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full max-w-md">
              <Link 
                href="https://paragraph.com/@24hrmvp/24hrmvpxyz-manifesto"
                target="_blank"
                rel="noopener noreferrer"
                className="block relative aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl transform transition-all duration-500 hover:scale-[1.02] hover:shadow-neon-purple/20 group/card"
              >
                <Image
                  src="/24HRMVP_Cypher_Genesis.png"
                  alt="24HRMVP Cypher Genesis"
                  fill
                  className="object-cover group-hover/card:scale-110 transition-transform duration-500"
                  priority
                />
                
                {/* Glitch Overlay Effect */}
                <div className="absolute inset-0 bg-neon-purple/20 mix-blend-overlay opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] z-20 opacity-20" />
                <div className="absolute inset-0 border border-neon-purple/30 rounded-xl z-30" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* VOTING SECTION */}
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

      {/* FOOTER STATS */}
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
