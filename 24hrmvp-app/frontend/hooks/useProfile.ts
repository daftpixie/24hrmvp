// ============================================
// 24HRMVP - USE PROFILE HOOK
// File: frontend/hooks/useProfile.ts
// User profile data fetching and management
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

export interface UserProfile {
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
  
  // Stats
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
  
  // Streak info
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
  } | null;
  
  // Recent achievements
  achievements: ProfileAchievement[];
  
  // Linked wallets
  wallets: LinkedWallet[];
}

export interface ProfileAchievement {
  id: string;
  type: string;
  name: string;
  description: string;
  iconUrl?: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  earnedAt: string;
}

export interface LinkedWallet {
  id: string;
  address: string;
  chainType: 'EVM' | 'SOLANA';
  chainId: number | null;
  isPrimary: boolean;
  label: string | null;
}

export interface UserIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  voteCount: number;
  createdAt: string;
  votingCycle: {
    name: string;
    status: string;
  };
}

export interface UserActivity {
  id: string;
  type: 'idea' | 'vote' | 'comment' | 'forum_post' | 'achievement' | 'stream';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ============================================
// PROFILE HOOK
// ============================================

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

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
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refresh: fetchProfile,
  };
}

// ============================================
// USER IDEAS HOOK
// ============================================

export function useUserIdeas(userId?: string, limit: number = 10) {
  const [ideas, setIdeas] = useState<UserIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchIdeas = useCallback(async (offset: number = 0) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.24hrmvp.xyz';
      const res = await fetch(
        `${apiUrl}/api/users/${userId}/ideas?limit=${limit}&offset=${offset}`,
        { credentials: 'include' }
      );

      if (!res.ok) {
        throw new Error('Failed to load ideas');
      }

      const data = await res.json();
      
      if (data.success) {
        if (offset === 0) {
          setIdeas(data.ideas || []);
        } else {
          setIdeas(prev => [...prev, ...(data.ideas || [])]);
        }
        setHasMore(data.hasMore || false);
      }
    } catch (err) {
      console.error('Ideas fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ideas');
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    fetchIdeas(0);
  }, [fetchIdeas]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchIdeas(ideas.length);
    }
  }, [loading, hasMore, ideas.length, fetchIdeas]);

  return {
    ideas,
    loading,
    error,
    hasMore,
    loadMore,
    refresh: () => fetchIdeas(0),
  };
}

// ============================================
// USER ACTIVITY HOOK
// ============================================

export function useUserActivity(userId?: string, limit: number = 20) {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.24hrmvp.xyz';
      const res = await fetch(
        `${apiUrl}/api/users/${userId}/activity?limit=${limit}`,
        { credentials: 'include' }
      );

      if (!res.ok) {
        throw new Error('Failed to load activity');
      }

      const data = await res.json();
      
      if (data.success) {
        setActivities(data.activities || []);
      }
    } catch (err) {
      console.error('Activity fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return {
    activities,
    loading,
    error,
    refresh: fetchActivity,
  };
}

// ============================================
// UPDATE PROFILE HOOK
// ============================================

export function useUpdateProfile() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback(async (data: {
    displayName?: string;
    bio?: string;
    pfpUrl?: string;
  }) => {
    setUpdating(true);
    setError(null);

    try {
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
      return result.user;
    } catch (err) {
      console.error('Update profile error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  return {
    updateProfile,
    updating,
    error,
  };
}
