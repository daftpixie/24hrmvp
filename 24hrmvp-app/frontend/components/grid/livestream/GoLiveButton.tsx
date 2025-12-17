// ============================================================================
// 24HRMVP Phase 4: Go Live Button & Setup Modal
// frontend/components/grid/livestream/GoLiveButton.tsx
// ============================================================================

'use client';

import { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface GoLiveButtonProps {
  variant?: 'hero' | 'compact';
  className?: string;
}

export default function GoLiveButton({
  variant = 'hero',
  className = '',
}: GoLiveButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    isPublic: true,
    allowChat: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create livestream function
  const createStream = async (data: {
    title: string;
    description: string;
    category: string;
    isPublic: boolean;
    allowChat: boolean;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/livestreams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create stream');
      }
      
      return await res.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create stream';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const stream = await createStream(formData);
      setIsModalOpen(false);
      router.push(`/grid/live/${stream.id}/setup`);
    } catch (err) {
      // Error handled by hook
    }
  };

  // Hero variant - large prominent button
  if (variant === 'hero') {
    return (
      <>
        <motion.button
          onClick={() => setIsModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            relative group px-8 py-4 rounded-xl
            bg-gradient-to-r from-red-600 via-red-500 to-orange-500
            text-white font-semibold text-lg
            shadow-lg shadow-red-600/30
            hover:shadow-xl hover:shadow-red-600/40
            transition-all duration-300
            ${className}
          `}
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {/* Animated glow */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-300" />
          
          <div className="relative flex items-center gap-3">
            {/* Pulsing dot */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            
            <span>Go Live</span>
            
            <svg
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>
        </motion.button>

        <CreateStreamModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreate}
          loading={loading}
          error={error}
        />
      </>
    );
  }

  // Compact variant - smaller button for header
  return (
    <>
      <motion.button
        onClick={() => setIsModalOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          bg-red-600 hover:bg-red-500
          text-white text-sm font-medium
          shadow-md shadow-red-600/20
          transition-all duration-200
          ${className}
        `}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        <span>Go Live</span>
      </motion.button>

      <CreateStreamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreate}
        loading={loading}
        error={error}
      />
    </>
  );
}

// ============================================================================
// Create Stream Modal
// ============================================================================

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    title: string;
    description: string;
    category: string;
    isPublic: boolean;
    allowChat: boolean;
  };
  setFormData: (data: any) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}

function CreateStreamModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  loading,
  error,
}: CreateStreamModalProps) {
  const categories = [
    'Development',
    'Community',
    'Tutorial',
    'AMA',
    'Announcement',
    'Gaming',
    'Music',
    'Other',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="relative w-full max-w-lg rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Background with gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1E1E1E] via-[#2E2E2E] to-[#1E1E1E]" />
              
              {/* Border glow */}
              <div className="absolute inset-0 rounded-2xl border border-[#04D9FF]/30" />
              
              {/* Content */}
              <div className="relative p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2
                        className="text-xl font-bold text-[#FAFAFA]"
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        Create Livestream
                      </h2>
                      <p className="text-sm text-[#B0B0B0]">
                        Set up your stream details
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-[#808080]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Form */}
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-[#FAFAFA] mb-2">
                      Stream Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Enter a catchy title for your stream"
                      className="
                        w-full px-4 py-3 rounded-lg
                        bg-white/5 border border-white/10
                        text-[#FAFAFA] placeholder-[#808080]
                        focus:border-[#04D9FF] focus:ring-1 focus:ring-[#04D9FF]/30
                        transition-all outline-none
                      "
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-[#FAFAFA] mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="What's this stream about?"
                      rows={3}
                      className="
                        w-full px-4 py-3 rounded-lg resize-none
                        bg-white/5 border border-white/10
                        text-[#FAFAFA] placeholder-[#808080]
                        focus:border-[#04D9FF] focus:ring-1 focus:ring-[#04D9FF]/30
                        transition-all outline-none
                      "
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-[#FAFAFA] mb-2">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, category: cat })
                          }
                          className={`
                            px-3 py-1.5 rounded-lg text-sm transition-all
                            ${
                              formData.category === cat
                                ? 'bg-[#04D9FF] text-black font-medium'
                                : 'bg-white/5 text-[#B0B0B0] hover:bg-white/10'
                            }
                          `}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isPublic}
                        onChange={(e) =>
                          setFormData({ ...formData, isPublic: e.target.checked })
                        }
                        className="
                          w-4 h-4 rounded border-white/20
                          text-[#04D9FF] bg-white/5
                          focus:ring-[#04D9FF]/30 focus:ring-offset-0
                        "
                      />
                      <span className="text-sm text-[#B0B0B0]">Public stream</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowChat}
                        onChange={(e) =>
                          setFormData({ ...formData, allowChat: e.target.checked })
                        }
                        className="
                          w-4 h-4 rounded border-white/20
                          text-[#04D9FF] bg-white/5
                          focus:ring-[#04D9FF]/30 focus:ring-offset-0
                        "
                      />
                      <span className="text-sm text-[#B0B0B0]">Enable chat</span>
                    </label>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                  <button
                    onClick={onClose}
                    className="
                      px-4 py-2 rounded-lg
                      text-[#B0B0B0] hover:text-[#FAFAFA]
                      hover:bg-white/5
                      transition-all
                    "
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={onSubmit}
                    disabled={!formData.title || loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="
                      flex items-center gap-2 px-6 py-2 rounded-lg
                      bg-gradient-to-r from-[#04D9FF] to-[#00FEFC]
                      text-black font-semibold
                      shadow-lg shadow-[#04D9FF]/20
                      hover:shadow-xl hover:shadow-[#04D9FF]/30
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all
                    "
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Setup</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[#04D9FF]/30 rounded-tl-2xl pointer-events-none" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-[#04D9FF]/30 rounded-tr-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-[#04D9FF]/30 rounded-bl-2xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-[#04D9FF]/30 rounded-br-2xl pointer-events-none" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
