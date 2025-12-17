// ============================================
// 24HRMVP - PROFILE SETUP MODAL
// File: frontend/components/profile/ProfileSetupModal.tsx
// First-time user onboarding
// ============================================

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ProfileSetupModalProps {
  isOpen: boolean;
  username: string;
  onComplete: (data: { displayName: string; bio: string }) => Promise<void>;
}

export function ProfileSetupModal({ isOpen, username, onComplete }: ProfileSetupModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (displayName.length > 50) {
      setError('Display name must be 50 characters or less');
      return;
    }

    if (bio.length > 500) {
      setError('Bio must be 500 characters or less');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onComplete({
        displayName: displayName.trim(),
        bio: bio.trim()
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1E1E1E] rounded-2xl border border-white/10 p-6 sm:p-8 max-w-md w-full"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#04D9FF]/20 to-[#8A00C4]/20 flex items-center justify-center mx-auto mb-4 border border-[#04D9FF]/30">
            <svg className="w-8 h-8 text-[#04D9FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="8" r="4" strokeWidth="2" />
              <path d="M4 20C4 17 7 14 12 14C17 14 20 17 20 20" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to 24HRMVP!</h2>
          <p className="text-[#808080]">
            Let's set up your profile to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username (read-only) */}
          <div>
            <label className="block text-sm font-medium text-[#B0B0B0] mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              disabled
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-[#808080] cursor-not-allowed"
            />
            <p className="text-xs text-[#808080] mt-1">
              Your username is set by your wallet/Farcaster account
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-[#B0B0B0] mb-2">
              Display Name <span className="text-[#FF5C00]">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
              maxLength={50}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-[#808080] focus:border-[#04D9FF] focus:ring-2 focus:ring-[#04D9FF]/20 outline-none transition-all"
              autoFocus
            />
            <p className="text-xs text-[#808080] mt-1">
              {displayName.length}/50 characters
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-[#B0B0B0] mb-2">
              Bio <span className="text-[#808080]">(Optional)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a bit about yourself..."
              maxLength={500}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-[#808080] focus:border-[#04D9FF] focus:ring-2 focus:ring-[#04D9FF]/20 outline-none transition-all resize-none"
            />
            <p className="text-xs text-[#808080] mt-1">
              {bio.length}/500 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-[#FF5C00]/10 border border-[#FF5C00]/30">
              <p className="text-[#FF5C00] text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !displayName.trim()}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-[#04D9FF] to-[#1F51FF] text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              'Complete Setup'
            )}
          </button>

          <p className="text-xs text-center text-[#808080]">
            You can update these details later in your profile settings
          </p>
        </form>
      </motion.div>
    </div>
  );
}
