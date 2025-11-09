'use client';

import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { useRouter } from 'next/navigation';

export default function SubmitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'developer-tools',
    complexity: 'medium',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('farcaster_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ideas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        router.push('/vote');
      } else {
        alert(data.error || 'Failed to submit idea');
      }
    } catch (error) {
      alert('Failed to submit idea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-12 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-heading text-5xl font-bold text-[--neon-cyan] mb-4">
          Submit Your Idea
        </h1>
        <p className="text-[--text-secondary] text-lg">
          Share your software idea with the community and let them vote!
        </p>
      </motion.div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Idea Title"
            placeholder="AI-Powered Code Review Tool"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            minLength={5}
            maxLength={100}
          />

          <div>
            <label className="block text-sm font-heading text-[--neon-cyan] mb-2">
              Description
            </label>
            <textarea
              className="w-full px-4 py-3 rounded-lg font-body bg-[rgba(255,255,255,0.05)] text-[--text-primary] border-2 border-[rgba(255,255,255,0.1)] focus:bg-[rgba(4,217,255,0.05)] focus:border-[--neon-cyan] focus:shadow-[0_0_0_3px_rgba(4,217,255,0.1),0_0_20px_rgba(4,217,255,0.2)] transition-all duration-300 min-h-32"
              placeholder="Describe your idea in detail..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              minLength={20}
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-heading text-[--neon-cyan] mb-2">
                Category
              </label>
              <select
                className="w-full px-4 py-3 rounded-lg font-body bg-[rgba(255,255,255,0.05)] text-[--text-primary] border-2 border-[rgba(255,255,255,0.1)] focus:border-[--neon-cyan] transition-all"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="developer-tools">Developer Tools</option>
                <option value="productivity">Productivity</option>
                <option value="ai-ml">AI/ML</option>
                <option value="web3">Web3</option>
                <option value="social">Social</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-heading text-[--neon-cyan] mb-2">
                Complexity
              </label>
              <select
                className="w-full px-4 py-3 rounded-lg font-body bg-[rgba(255,255,255,0.05)] text-[--text-primary] border-2 border-[rgba(255,255,255,0.1)] focus:border-[--neon-cyan] transition-all"
                value={formData.complexity}
                onChange={(e) => setFormData({ ...formData, complexity: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <Button variant="chrome" type="submit" disabled={loading} className="w-full">
              {loading ? 'Submitting...' : 'Submit Idea 🚀'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
