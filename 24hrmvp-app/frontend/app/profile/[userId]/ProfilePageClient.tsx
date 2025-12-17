'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';
import ClientOnly from '@/components/ClientOnly';

// ============================================
// DYNAMIC IMPORTS (SSR-SAFE)
// ============================================

// Dynamically import Header to avoid SSR issues with useAuth
const Header = dynamic(() => import('@/components/layout/Header'), {
  ssr: false,
  loading: () => (
    <header className="sticky top-0 z-50 w-full h-16 border-b border-white/10 bg-[#0B192A]/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="chrome-text text-2xl font-black tracking-tight">
          24HR<span className="text-[#04D9FF]">MVP</span>
        </div>
        <div className="w-24 h-8 bg-white/5 rounded-lg animate-pulse" />
      </div>
    </header>
  ),
});

// ============================================
// TYPES
// ============================================

interface UserProfile {
  id: string;
  fid: number | null;
  username: string;
  displayName: string | null;
  pfpUrl: string | null;
  bio: string | null;
  custodyAddress: string | null;
  primaryWalletAddress: string | null;
  primaryAuthProvider: 'FARCASTER' | 'SIWE' | 'SIWS';
  membershipTier: string;
  points: number;
  reputation: number;
  level: number;
  isAdmin: boolean;
  createdAt: string;
  lastActiveAt: string;
  stats: {
    ideasSubmitted: number;
    ideasWon: number;
    votesGiven: number;
    votesReceived: number;
    commentsCount: number;
    forumPosts: number;
    chatMessages: number;
    streamsHosted: number;
    achievementCount: number;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
  } | null;
  achievements: ProfileAchievement[];
  wallets: LinkedWallet[];
}

interface ProfileAchievement {
  id: string;
  type: string;
  name: string;
  description: string;
  iconUrl?: string;
  rarity: string;
  earnedAt: string;
}

interface LinkedWallet {
  id: string;
  address: string;
  chainType: 'EVM' | 'SOLANA';
  chainId: number | null;
  isPrimary: boolean;
  label: string | null;
}

interface UserIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  voteCount: number;
  createdAt: string;
}

// ============================================
// ICONS
// ============================================

const UserIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M4 20C4 17 7 14 12 14C17 14 20 17 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const TrophyIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M8 21H16M12 17V21M6 4H18M6 4C6 4 5 4 5 5V8C5 10.2091 6.79086 12 9 12H15C17.2091 12 19 10.2091 19 8V5C19 4 18 4 18 4M6 4V8C6 9.65685 7.34315 11 9 11H15C16.6569 11 18 9.65685 18 8V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const LightbulbIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M9 21H15M12 3C8.68629 3 6 5.68629 6 9C6 11.2208 7.2066 13.1599 9 14.1973V17C9 17.5523 9.44772 18 10 18H14C14.5523 18 15 17.5523 15 17V14.1973C16.7934 13.1599 18 11.2208 18 9C18 5.68629 15.3137 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const VoteIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M14 9V5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 9H6C4.89543 9 4 9.89543 4 11V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V11C20 9.89543 19.1046 9 18 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FireIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C16.4183 22 20 18.4183 20 14C20 10 17 7 15 5C15 8 13 10 12 10C11 10 9 8 9 5C7 7 4 10 4 14C4 18.4183 7.58172 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CalendarIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M3 10H21" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const StarIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WalletIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19 7H5C3.89543 7 3 7.89543 3 9V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V9C21 7.89543 20.1046 7 19 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="16" cy="13" r="1" fill="currentColor"/>
  </svg>
);

const EditIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MessageIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const VideoIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M23 7L16 12L23 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const CopyIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowLeftIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const GridIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function truncateAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

function getMembershipBadge(tier: string): { label: string; color: string } {
  switch (tier.toLowerCase()) {
    case 'gold':
      return { label: 'Gold', color: 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black' };
    case 'silver':
      return { label: 'Silver', color: 'bg-gradient-to-r from-gray-300 to-gray-400 text-black' };
    case 'bronze':
      return { label: 'Bronze', color: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white' };
    case 'premium':
      return { label: 'Premium', color: 'bg-gradient-to-r from-[#04D9FF] to-[#1F51FF] text-white' };
    default:
      return { label: 'Free', color: 'bg-white/10 text-[#808080]' };
  }
}

function getLevelColor(level: number): string {
  if (level >= 50) return 'text-[#FFD700]';
  if (level >= 30) return 'text-[#04D9FF]';
  if (level >= 15) return 'text-[#8A00C4]';
  if (level >= 5) return 'text-[#2CFF05]';
  return 'text-white';
}

function getRarityColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case 'legendary': return 'border-[#FFD700] bg-[#FFD700]/10';
    case 'epic': return 'border-[#8A00C4] bg-[#8A00C4]/10';
    case 'rare': return 'border-[#04D9FF] bg-[#04D9FF]/10';
    case 'uncommon': return 'border-[#2CFF05] bg-[#2CFF05]/10';
    default: return 'border-white/20 bg-white/5';
  }
}

function getStatusColor(status: string): { bg: string; text: string } {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'won':
      return { bg: 'bg-[#2CFF05]/10', text: 'text-[#2CFF05]' };
    case 'pending':
      return { bg: 'bg-[#FFFF00]/10', text: 'text-[#FFFF00]' };
    case 'rejected':
      return { bg: 'bg-[#FF5C00]/10', text: 'text-[#FF5C00]' };
    case 'building':
      return { bg: 'bg-[#04D9FF]/10', text: 'text-[#04D9FF]' };
    default:
      return { bg: 'bg-white/10', text: 'text-[#808080]' };
  }
}

// ============================================
// SUB COMPONENTS
// ============================================

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  color = 'text-[#04D9FF]' 
}: { 
  icon: any; 
  label: string; 
  value: number | string; 
  subValue?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl bg-[#1E1E1E]/60 border border-white/10 p-4 hover:border-white/20 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-[#808080] uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-white font-mono">{value}</p>
          {subValue && <p className="text-xs text-[#808080]">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: ProfileAchievement }) {
  const rarityClass = getRarityColor(achievement.rarity);
  
  return (
    <div className={`rounded-lg border ${rarityClass} p-3 flex items-center gap-3`}>
      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        {achievement.iconUrl ? (
          <img src={achievement.iconUrl} alt={achievement.name} className="w-6 h-6" />
        ) : (
          <TrophyIcon className="w-5 h-5 text-[#FFD700]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white truncate">{achievement.name}</h4>
        <p className="text-xs text-[#808080] truncate">{achievement.description}</p>
      </div>
      <span className="text-xs text-[#808080]">{formatRelativeDate(achievement.earnedAt)}</span>
    </div>
  );
}

function IdeaCard({ idea }: { idea: UserIdea }) {
  const status = getStatusColor(idea.status);
  
  return (
    <Link 
      href={`/ideas/${idea.id}`}
      className="block rounded-lg bg-white/5 border border-white/10 p-4 hover:bg-white/10 hover:border-white/20 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-sm font-semibold text-white line-clamp-1">{idea.title}</h4>
        <span className={`px-2 py-0.5 text-xs rounded-full ${status.bg} ${status.text}`}>
          {idea.status}
        </span>
      </div>
      <p className="text-xs text-[#808080] line-clamp-2 mb-3">{idea.description}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#04D9FF]">{idea.category}</span>
        <span className="text-[#808080] flex items-center gap-1">
          <VoteIcon className="w-3 h-3" />
          {idea.voteCount}
        </span>
      </div>
    </Link>
  );
}

function WalletCard({ wallet }: { wallet: LinkedWallet }) {
  const [copied, setCopied] = useState(false);
  
  const copyAddress = async () => {
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          wallet.chainType === 'SOLANA' ? 'bg-[#9945FF]/20' : 'bg-[#627EEA]/20'
        }`}>
          <WalletIcon className={`w-5 h-5 ${
            wallet.chainType === 'SOLANA' ? 'text-[#9945FF]' : 'text-[#627EEA]'
          }`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-mono text-sm">
              {truncateAddress(wallet.address)}
            </span>
            {wallet.isPrimary && (
              <span className="px-2 py-0.5 text-xs rounded bg-[#04D9FF]/20 text-[#04D9FF]">
                Primary
              </span>
            )}
          </div>
          <p className="text-xs text-[#808080]">
            {wallet.label || wallet.chainType}
          </p>
        </div>
      </div>
      <button
        onClick={copyAddress}
        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        title="Copy address"
      >
        {copied ? (
          <CheckIcon className="w-4 h-4 text-[#2CFF05]" />
        ) : (
          <CopyIcon className="w-4 h-4 text-[#808080]" />
        )}
      </button>
    </div>
  );
}

// ============================================
// EDIT PROFILE MODAL
// ============================================

function EditProfileModal({ 
  profile, 
  onClose, 
  onSave 
}: { 
  profile: UserProfile;
  onClose: () => void;
  onSave: (data: { displayName?: string; bio?: string }) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      await onSave({ displayName, bio });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#1E1E1E] rounded-2xl border border-white/10 p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-6">Edit Profile</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#808080] mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#808080] focus:outline-none focus:border-[#04D9FF] transition-colors"
              maxLength={50}
            />
          </div>
          
          <div>
            <label className="block text-sm text-[#808080] mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-[#808080] focus:outline-none focus:border-[#04D9FF] transition-colors resize-none"
              maxLength={500}
            />
            <p className="text-xs text-[#808080] mt-1">{bio.length}/500</p>
          </div>
          
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-white/20 text-[#B0B0B0] hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 rounded-lg bg-[#04D9FF] text-black font-semibold hover:bg-[#04D9FF]/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// MAIN PROFILE CONTENT
// ============================================

function ProfileContent() {
  const params = useParams();
  const userId = params?.userId as string;
  
  const { user: currentUser, isAuthenticated } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ideas, setIdeas] = useState<UserIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ideas' | 'achievements' | 'wallets'>('overview');

  // Fetch profile
  useEffect(() => {
    async function fetchProfile() {
      if (!userId) return;
      
      setLoading(true);
      setError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.24hrmvp.xyz';
        const res = await fetch(`${apiUrl}/api/users/${userId}`, {
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('User not found');
          }
          throw new Error('Failed to load profile');
        }

        const data = await res.json();
        if (data.success && data.user) {
          setProfile(data.user);
        } else {
          throw new Error(data.message || 'Failed to load profile');
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId]);

  // Fetch ideas
  useEffect(() => {
    async function fetchIdeas() {
      if (!userId) return;
      
      setIdeasLoading(true);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.24hrmvp.xyz';
        const res = await fetch(`${apiUrl}/api/users/${userId}/ideas?limit=10`, {
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setIdeas(data.ideas || []);
          }
        }
      } catch (err) {
        console.error('Ideas fetch error:', err);
      } finally {
        setIdeasLoading(false);
      }
    }

    fetchIdeas();
  }, [userId]);

  const isOwnProfile = currentUser && profile && (
    currentUser.fid === profile.fid || 
    currentUser.username === profile.username
  );

  const handleSaveProfile = async (data: { displayName?: string; bio?: string }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.24hrmvp.xyz';
    const res = await fetch(`${apiUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to update profile');
    }

    const result = await res.json();
    if (result.success && result.user) {
      setProfile(result.user);
    }
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#0B192A]">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-64 bg-[#1E1E1E]/60 rounded-2xl" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-[#1E1E1E]/60 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#0B192A] flex items-center justify-center">
          <div className="text-center">
            <UserIcon className="w-16 h-16 text-[#808080] mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">User Not Found</h1>
            <p className="text-[#808080] mb-6">{error || 'This profile does not exist.'}</p>
            <Link
              href="/grid"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#04D9FF] text-black font-semibold rounded-lg hover:bg-[#04D9FF]/90 transition-colors"
            >
              <GridIcon className="w-4 h-4" />
              Back to The Grid
            </Link>
          </div>
        </div>
      </>
    );
  }

  const membershipBadge = getMembershipBadge(profile.membershipTier);

  return (
    <>
      {/* Header Navigation */}
      <Header />
      
      <div className="min-h-screen bg-[#0B192A]">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#04D9FF]/10 via-transparent to-[#8A00C4]/10" />
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `linear-gradient(rgba(4,217,255,0.1) 2px, transparent 2px), linear-gradient(90deg, rgba(4,217,255,0.1) 2px, transparent 2px)`,
            backgroundSize: '50px 50px'
          }} />
          
          <div className="container mx-auto px-4 py-12 relative">
            {/* Back button - CHANGED: Now links to The Grid */}
            <Link
              href="/grid"
              className="inline-flex items-center gap-2 text-[#808080] hover:text-[#04D9FF] transition-colors mb-6"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to The Grid
            </Link>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-[#04D9FF]/30 shadow-[0_0_30px_rgba(4,217,255,0.2)]">
                  {profile.pfpUrl ? (
                    <img 
                      src={profile.pfpUrl} 
                      alt={profile.displayName || profile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#04D9FF]/20 to-[#8A00C4]/20 flex items-center justify-center">
                      <UserIcon className="w-16 h-16 text-[#04D9FF]" />
                    </div>
                  )}
                </div>
                {/* Level badge */}
                <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-lg bg-[#1E1E1E] border border-white/20 flex items-center justify-center ${getLevelColor(profile.level)}`}>
                  <span className="font-bold text-sm">{profile.level}</span>
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-white font-display">
                    {profile.displayName || profile.username}
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${membershipBadge.color}`}>
                      {membershipBadge.label}
                    </span>
                    {profile.isAdmin && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-[#808080] mb-3 font-mono">@{profile.username}</p>
                
                {profile.bio && (
                  <p className="text-[#B0B0B0] max-w-xl mb-4">{profile.bio}</p>
                )}
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-[#808080]">
                  {profile.fid && (
                    <span className="flex items-center gap-1">
                      <span className="text-[#8A00C4]">FID:</span> {profile.fid}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    Joined {formatDate(profile.createdAt)}
                  </span>
                  {profile.streak && profile.streak.currentStreak > 0 && (
                    <span className="flex items-center gap-1 text-[#FF5C00]">
                      <FireIcon className="w-4 h-4" />
                      {profile.streak.currentStreak} day streak
                    </span>
                  )}
                </div>

                {/* Edit button for own profile */}
                {isOwnProfile && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-[#04D9FF]/30 text-[#04D9FF] hover:bg-[#04D9FF]/10 transition-colors"
                  >
                    <EditIcon className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="container mx-auto px-4 -mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              icon={StarIcon} 
              label="Points" 
              value={profile.points.toLocaleString()} 
              color="text-[#FFD700]"
            />
            <StatCard 
              icon={LightbulbIcon} 
              label="Ideas" 
              value={profile.stats.ideasSubmitted}
              subValue={`${profile.stats.ideasWon} won`}
              color="text-[#FFFF00]"
            />
            <StatCard 
              icon={VoteIcon} 
              label="Votes" 
              value={profile.stats.votesGiven}
              subValue={`${profile.stats.votesReceived} received`}
              color="text-[#2CFF05]"
            />
            <StatCard 
              icon={TrophyIcon} 
              label="Achievements" 
              value={profile.stats.achievementCount}
              color="text-[#8A00C4]"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="container mx-auto px-4 mt-8">
          <div className="flex gap-2 border-b border-white/10 mb-8 overflow-x-auto">
            {(['overview', 'ideas', 'achievements', 'wallets'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'text-[#04D9FF] border-b-2 border-[#04D9FF] bg-[#04D9FF]/5'
                    : 'text-[#808080] hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* Recent Ideas */}
                <div className="rounded-xl bg-[#1E1E1E]/60 border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <LightbulbIcon className="w-5 h-5 text-[#FFFF00]" />
                      Recent Ideas
                    </h3>
                    <button
                      onClick={() => setActiveTab('ideas')}
                      className="text-sm text-[#04D9FF] hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  {ideas.length > 0 ? (
                    <div className="space-y-3">
                      {ideas.slice(0, 3).map(idea => (
                        <IdeaCard key={idea.id} idea={idea} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#808080]">
                      <LightbulbIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No ideas submitted yet</p>
                    </div>
                  )}
                </div>

                {/* Recent Achievements */}
                <div className="rounded-xl bg-[#1E1E1E]/60 border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <TrophyIcon className="w-5 h-5 text-[#FFD700]" />
                      Achievements
                    </h3>
                    <button
                      onClick={() => setActiveTab('achievements')}
                      className="text-sm text-[#04D9FF] hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  {profile.achievements.length > 0 ? (
                    <div className="space-y-3">
                      {profile.achievements.slice(0, 4).map(achievement => (
                        <AchievementCard key={achievement.id} achievement={achievement} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#808080]">
                      <TrophyIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No achievements yet</p>
                    </div>
                  )}
                </div>

                {/* Activity Stats */}
                <div className="lg:col-span-2 rounded-xl bg-[#1E1E1E]/60 border border-white/10 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Activity Stats</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-white/5 text-center">
                      <MessageIcon className="w-6 h-6 text-[#04D9FF] mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white font-mono">{profile.stats.commentsCount}</p>
                      <p className="text-xs text-[#808080]">Comments</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 text-center">
                      <MessageIcon className="w-6 h-6 text-[#2CFF05] mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white font-mono">{profile.stats.forumPosts}</p>
                      <p className="text-xs text-[#808080]">Forum Posts</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 text-center">
                      <MessageIcon className="w-6 h-6 text-[#FB48C4] mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white font-mono">{profile.stats.chatMessages}</p>
                      <p className="text-xs text-[#808080]">Chat Messages</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 text-center">
                      <VideoIcon className="w-6 h-6 text-[#FF5C00] mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white font-mono">{profile.stats.streamsHosted}</p>
                      <p className="text-xs text-[#808080]">Streams</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'ideas' && (
              <motion.div
                key="ideas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {ideas.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ideas.map(idea => (
                      <IdeaCard key={idea.id} idea={idea} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-[#808080]">
                    <LightbulbIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Ideas Yet</h3>
                    <p>This user hasn't submitted any ideas yet.</p>
                    {isOwnProfile && (
                      <Link
                        href="/submit"
                        className="inline-block mt-4 px-6 py-3 bg-[#04D9FF] text-black font-semibold rounded-lg hover:bg-[#04D9FF]/90 transition-colors"
                      >
                        Submit Your First Idea
                      </Link>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'achievements' && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {profile.achievements.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profile.achievements.map(achievement => (
                      <AchievementCard key={achievement.id} achievement={achievement} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-[#808080]">
                    <TrophyIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Achievements Yet</h3>
                    <p>Start participating to earn achievements!</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'wallets' && (
              <motion.div
                key="wallets"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl"
              >
                <div className="rounded-xl bg-[#1E1E1E]/60 border border-white/10 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <WalletIcon className="w-5 h-5 text-[#04D9FF]" />
                    Connected Wallets
                  </h3>
                  {profile.wallets.length > 0 ? (
                    <div className="space-y-3">
                      {profile.wallets.map(wallet => (
                        <WalletCard key={wallet.id} wallet={wallet} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#808080]">
                      <WalletIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No wallets connected</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {showEditModal && profile && (
            <EditProfileModal
              profile={profile}
              onClose={() => setShowEditModal(false)}
              onSave={handleSaveProfile}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ============================================
// MAIN EXPORT
// ============================================

export default function ProfilePage() {
  return (
    <ClientOnly>
      <ProfileContent />
    </ClientOnly>
  );
}
