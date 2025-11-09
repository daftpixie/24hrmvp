'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Link from 'next/link';

interface VotingCycle {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  daysRemaining: number;
  ideas: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    voteCount: number;
    submittedBy: {
      username: string;
      displayName: string | null;
    };
  }>;
}

export default function Home() {
  const [cycle, setCycle] = useState<VotingCycle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/voting-cycles/active`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCycle(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-6 py-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <h1 className="font-display text-7xl font-black mb-6 bg-gradient-to-r from-[#A8A9AD] via-[#E3E3E3] to-[#A8A9AD] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(4,217,255,0.5)]">
          24HR MVP
        </h1>
        <p className="font-heading text-2xl text-[--text-secondary] mb-8 max-w-3xl mx-auto">
          Community-driven 24-hour MVP development platform powered by AI
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/submit">
            <Button variant="chrome">Submit Idea</Button>
          </Link>
          <Link href="/vote">
            <Button variant="neon">Vote Now</Button>
          </Link>
        </div>
      </motion.div>

      {/* Active Voting Cycle */}
      {loading ? (
        <div className="text-center text-[--text-secondary]">Loading...</div>
      ) : cycle ? (
        <div>
          <div className="mb-8 text-center">
            <h2 className="font-heading text-3xl font-bold text-[--neon-cyan] mb-2">
              Active Voting Cycle
            </h2>
            <p className="text-[--text-secondary]">
              {cycle.daysRemaining} days remaining
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cycle.ideas.slice(0, 6).map((idea, index) => (
              <motion.div
                key={idea.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card>
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 text-xs font-mono font-bold bg-[rgba(4,217,255,0.2)] text-[--neon-cyan] rounded-full border border-[--neon-cyan]">
                      {idea.category}
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-bold mb-3 text-[--text-primary]">
                    {idea.title}
                  </h3>
                  <p className="text-[--text-secondary] text-sm mb-4 line-clamp-3">
                    {idea.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[--text-tertiary]">
                      by @{idea.submittedBy.username}
                    </span>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-[--neon-cyan]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                      </svg>
                      <span className="font-mono text-lg font-bold text-[--neon-cyan]">
                        {idea.voteCount}
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/vote">
              <Button variant="neon">View All Ideas →</Button>
            </Link>
          </div>
        </div>
      ) : (
        <Card className="text-center">
          <p className="text-[--text-secondary]">No active voting cycle</p>
        </Card>
      )}
    </div>
  );
}
