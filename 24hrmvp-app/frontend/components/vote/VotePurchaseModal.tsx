'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Coins, CreditCard, Loader2, Check, Sparkles } from 'lucide-react';
import { getApiUrl } from '@/lib/config';

interface PricingTier {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  popular?: boolean;
  bonusCredits?: number;
}

interface VotePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPoints: number;
  onPurchaseSuccess: () => void;
}

export default function VotePurchaseModal({
  isOpen,
  onClose,
  userPoints,
  onPurchaseSuccess,
}: VotePurchaseModalProps) {
  const [pricing, setPricing] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackPricing: PricingTier[] = [
    { id: 'basic', name: 'Starter', credits: 5, price: 1.99, currency: 'USD' },
    { id: 'popular', name: 'Popular', credits: 25, price: 7.99, currency: 'USD', popular: true, bonusCredits: 5 },
    { id: 'pro', name: 'Pro', credits: 100, price: 24.99, currency: 'USD', bonusCredits: 25 },
  ];

  const fetchPricing = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/vote-purchase/pricing`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.success && Array.isArray(data.tiers) && data.tiers.length) {
        setPricing(data.tiers as PricingTier[]);
        const popular = (data.tiers as PricingTier[]).find(t => t.popular);
        setSelectedTier(popular ? popular.id : (data.tiers[0] as PricingTier).id);
      } else {
        setPricing(fallbackPricing);
        setSelectedTier('popular');
      }
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
      setError('Unable to load pricing');
      setPricing(fallbackPricing);
      setSelectedTier('popular');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchPricing();
  }, [isOpen, fetchPricing]);

  const handlePurchase = async () => {
    if (!selectedTier) return;
    try {
      setPurchasing(true);
      setError(null);

      const apiUrl = getApiUrl();
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('24hrmvp_access_token') || localStorage.getItem('farcaster_token')
          : null;

      if (!token) {
        setError('Please sign in to purchase credits');
        return;
      }

      const res = await fetch(`${apiUrl}/api/vote-purchase/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ tierId: selectedTier }),
      });

      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error?.message || 'Failed to start checkout');
      }
    } catch (err) {
      console.error('Purchase failed:', err);
      setError('Failed to process purchase');
    } finally {
      setPurchasing(false);
    }
  };

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal container */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="vote-purchase-title"
              className="relative w-full max-w-3xl rounded-2xl border border-[rgba(4,217,255,0.2)] bg-[--bg-primary] shadow-[0_0_40px_rgba(4,217,255,0.2)]"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[rgba(4,217,255,0.2)] p-6">
                <div>
                  <h2 id="vote-purchase-title" className="text-2xl font-heading font-bold text-[--neon-cyan]">
                    Get Vote Credits
                  </h2>
                  <p className="mt-1 text-sm text-[--text-secondary]">Power up your voting influence</p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-lg p-2 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
                >
                  <X className="h-6 w-6 text-[--text-secondary]" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-[--neon-cyan]" />
                    <span className="ml-3 text-sm text-[--text-secondary]">Loading pricing…</span>
                  </div>
                ) : (
                  <>
                    {/* Pricing Tiers */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {pricing.map((tier) => {
                        const active = selectedTier === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setSelectedTier(tier.id)}
                            className={`group relative rounded-xl border-2 p-4 text-left transition-all ${
                              active
                                ? 'border-[--neon-cyan] bg-[rgba(4,217,255,0.10)]'
                                : 'border-[rgba(255,255,255,0.10)] hover:border-[rgba(4,217,255,0.30)]'
                            }`}
                          >
                            {tier.popular && (
                              <span className="absolute -top-3 left-4 rounded-full bg-gradient-to-r from-[--neon-orange] to-[--neon-pink] px-3 py-1 text-xs font-bold text-white shadow-[0_0_20px_rgba(251,72,196,0.45)]">
                                POPULAR
                              </span>
                            )}

                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-[--neon-cyan]" />
                                  <h3 className="font-heading text-lg font-semibold text-[--text-primary]">
                                    {tier.name}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-[--text-secondary]">
                                  <Coins className="h-4 w-4 text-[--neon-cyan]" />
                                  <span className="font-mono font-bold text-[--neon-cyan]">{tier.credits}</span>
                                  <span>credits</span>
                                  {tier.bonusCredits && (
                                    <span className="ml-2 rounded bg-[rgba(4,217,255,0.15)] px-2 py-0.5 text-[--neon-cyan]">
                                      +{tier.bonusCredits} bonus
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="font-heading text-xl font-bold text-[--text-primary]">
                                  {formatPrice(tier.price, tier.currency)}
                                </div>
                                <div className="text-xs text-[--text-tertiary]">{tier.currency}</div>
                              </div>
                            </div>

                            {active && (
                              <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-[rgba(4,217,255,0.12)] p-1">
                                <Check className="h-5 w-5 text-[--neon-cyan]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {error && (
                      <div className="rounded-lg border border-[rgba(255,92,0,0.35)] bg-[rgba(255,92,0,0.10)] p-3 text-[--neon-orange]">
                        {error}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-[--text-secondary]">
                        <CreditCard className="h-4 w-4 text-[--neon-cyan]" />
                        <span>Secure checkout via Stripe</span>
                      </div>

                      <button
                        onClick={handlePurchase}
                        disabled={!selectedTier || purchasing}
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[--neon-cyan] to-[--neon-blue] px-5 py-2 font-heading font-bold text-[--bg-primary] transition-all hover:shadow-[0_0_20px_rgba(4,217,255,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {purchasing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing…
                          </>
                        ) : (
                          <>
                            <Coins className="h-4 w-4" />
                            Purchase Credits
                          </>
                        )}
                      </button>
                    </div>

                    {userPoints > 0 && (
                      <div className="rounded-lg border border-[rgba(4,217,255,0.2)] bg-[rgba(4,217,255,0.06)] p-3 text-sm text-[--text-secondary]">
                        You have{' '}
                        <span className="font-mono font-bold text-[--neon-cyan]">
                          {userPoints.toLocaleString()}
                        </span>{' '}
                        platform points. Redeem points for credits in your profile settings.
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
