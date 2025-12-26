'use client';

/**
 * 24HRMVP Main Platform - Analytics Hook
 * 
 * File: frontend/hooks/useAnalytics.ts
 * 
 * Self-hosted Plausible Analytics at analytics.24hrmvp.xyz
 */

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { usePlausible } from 'next-plausible';
import type { 
  PlatformEvent, 
  PropsForEvent,
  AuthEventProps,
  IdeaEventProps,
  VoteEventProps,
  VotePurchaseEventProps,
  GridEventProps,
  ProfileEventProps,
  ProjectEventProps,
  NavEventProps,
  CTAClickProps,
  SocialLinkProps,
  ScrollDepthProps,
  ErrorEventProps,
  AuthMethod,
  GridSection,
} from '@/lib/types/analytics';

// ============================================================================
// MAIN ANALYTICS HOOK
// ============================================================================

export function useAnalytics() {
  const plausible = usePlausible();
  const pathname = usePathname();
  
  const scrollMilestones = useRef<Set<number>>(new Set());
  const pageEntryTime = useRef<number>(Date.now());

  const trackEvent = useCallback(<E extends PlatformEvent>(
    eventName: E,
    props?: PropsForEvent<E>
  ) => {
    plausible(eventName, { props: props as Record<string, unknown> });
  }, [plausible]);

  // ===========================================================================
  // AUTHENTICATION TRACKING
  // ===========================================================================

  const trackAuth = useCallback((
    action: 'started' | 'method_selected' | 'wallet_connected' | 'wallet_failed' | 
            'farcaster_started' | 'farcaster_success' | 'farcaster_failed' |
            'siwe_started' | 'siwe_success' | 'siwe_failed' |
            'logout' | 'session_restored',
    props?: AuthEventProps
  ) => {
    const eventMap: Record<string, PlatformEvent> = {
      started: 'Auth Started',
      method_selected: 'Auth Method Selected',
      wallet_connected: 'Wallet Connected',
      wallet_failed: 'Wallet Connect Failed',
      farcaster_started: 'Farcaster Auth Started',
      farcaster_success: 'Farcaster Auth Success',
      farcaster_failed: 'Farcaster Auth Failed',
      siwe_started: 'SIWE Sign Started',
      siwe_success: 'SIWE Sign Success',
      siwe_failed: 'SIWE Sign Failed',
      logout: 'User Logged Out',
      session_restored: 'Session Restored',
    };
    
    trackEvent(eventMap[action], props);
  }, [trackEvent]);

  // ===========================================================================
  // IDEA SUBMISSION TRACKING
  // ===========================================================================

  const trackIdea = useCallback((
    action: 'page_viewed' | 'draft_started' | 'draft_saved' | 
            'submitted' | 'failed' | 'category_selected',
    props?: IdeaEventProps
  ) => {
    const eventMap: Record<string, PlatformEvent> = {
      page_viewed: 'Submit Page Viewed',
      draft_started: 'Idea Draft Started',
      draft_saved: 'Idea Draft Saved',
      submitted: 'Idea Submitted',
      failed: 'Idea Submission Failed',
      category_selected: 'Idea Category Selected',
    };
    
    trackEvent(eventMap[action], props);
  }, [trackEvent]);

  // ===========================================================================
  // VOTING TRACKING
  // ===========================================================================

  const trackVote = useCallback((
    action: 'page_viewed' | 'cast' | 'failed' | 'credits_low',
    props?: VoteEventProps
  ) => {
    const eventMap: Record<string, PlatformEvent> = {
      page_viewed: 'Vote Page Viewed',
      cast: 'Vote Cast',
      failed: 'Vote Failed',
      credits_low: 'Vote Credits Low',
    };
    
    trackEvent(eventMap[action], props);
  }, [trackEvent]);

  const trackVotePurchase = useCallback((
    action: 'modal_opened' | 'started' | 'completed' | 'failed',
    props?: VotePurchaseEventProps
  ) => {
    const eventMap: Record<string, PlatformEvent> = {
      modal_opened: 'Vote Purchase Modal Opened',
      started: 'Vote Purchase Started',
      completed: 'Vote Purchase Completed',
      failed: 'Vote Purchase Failed',
    };
    
    trackEvent(eventMap[action], props);
  }, [trackEvent]);

  // ===========================================================================
  // THE GRID TRACKING
  // ===========================================================================

  const trackGrid = useCallback((
    action: 'hub_viewed' | 'section_entered' | 'chat_joined' | 
            'message_sent' | 'message_failed' |
            'forum_viewed' | 'post_created' | 'post_voted' | 'post_bookmarked' |
            'live_viewed' | 'stream_started' | 'stream_joined' | 'stream_left' |
            'social_viewed',
    props?: GridEventProps
  ) => {
    const eventMap: Record<string, PlatformEvent> = {
      hub_viewed: 'Grid Hub Viewed',
      section_entered: 'Grid Section Entered',
      chat_joined: 'Chat Room Joined',
      message_sent: 'Chat Message Sent',
      message_failed: 'Chat Message Failed',
      forum_viewed: 'Forum Viewed',
      post_created: 'Forum Post Created',
      post_voted: 'Forum Post Voted',
      post_bookmarked: 'Forum Post Bookmarked',
      live_viewed: 'Live Hub Viewed',
      stream_started: 'Livestream Started',
      stream_joined: 'Livestream Joined',
      stream_left: 'Livestream Left',
      social_viewed: 'Social Feed Viewed',
    };
    
    trackEvent(eventMap[action], props);
  }, [trackEvent]);

  // ===========================================================================
  // PROFILE TRACKING
  // ===========================================================================

  const trackProfile = useCallback((
    action: 'viewed' | 'setup_started' | 'setup_completed' | 'updated' | 'own_viewed',
    props?: ProfileEventProps
  ) => {
    const eventMap: Record<string, PlatformEvent> = {
      viewed: 'Profile Viewed',
      setup_started: 'Profile Setup Started',
      setup_completed: 'Profile Setup Completed',
      updated: 'Profile Updated',
      own_viewed: 'Own Profile Viewed',
    };
    
    trackEvent(eventMap[action], props);
  }, [trackEvent]);

  // ===========================================================================
  // PROJECT TRACKING
  // ===========================================================================

  const trackProject = useCallback((
    action: 'page_viewed' | 'card_clicked' | 'demo_launched' | 'repo_clicked',
    props?: ProjectEventProps
  ) => {
    const eventMap: Record<string, PlatformEvent> = {
      page_viewed: 'Projects Page Viewed',
      card_clicked: 'Project Card Clicked',
      demo_launched: 'Project Demo Launched',
      repo_clicked: 'Project Repo Clicked',
    };
    
    trackEvent(eventMap[action], props);
  }, [trackEvent]);

  // ===========================================================================
  // NAVIGATION TRACKING
  // ===========================================================================

  const trackCTA = useCallback((
    button: string,
    location: CTAClickProps['location'],
    destination?: string,
    variant?: string
  ) => {
    trackEvent('CTA Clicked', { button, location, destination, variant });
  }, [trackEvent]);

  const trackNavLink = useCallback((
    destination: string,
    source: NavEventProps['source'],
    label?: string
  ) => {
    trackEvent('Nav Link Clicked', { destination, source, label });
  }, [trackEvent]);

  const trackSocial = useCallback((
    platform: SocialLinkProps['platform'],
    url: string,
    context?: SocialLinkProps['context']
  ) => {
    trackEvent('Social Link Clicked', { platform, url, context });
  }, [trackEvent]);

  const trackExternalLink = useCallback((url: string, text?: string) => {
    trackEvent('External Link Clicked', { url, text });
  }, [trackEvent]);

  // ===========================================================================
  // ENGAGEMENT TRACKING
  // ===========================================================================

  const trackScrollDepth = useCallback((depth: ScrollDepthProps['depth']) => {
    if (!scrollMilestones.current.has(depth)) {
      scrollMilestones.current.add(depth);
      trackEvent('Scroll Depth', { depth, page: pathname });
    }
  }, [trackEvent, pathname]);

  const trackTimeOnPage = useCallback(() => {
    const seconds = Math.round((Date.now() - pageEntryTime.current) / 1000);
    if (seconds > 5) {
      trackEvent('Time on Page', { page: pathname, seconds });
    }
  }, [trackEvent, pathname]);

  const trackFeatureDiscovery = useCallback((feature: string, context: string) => {
    trackEvent('Feature Discovered', { feature, context });
  }, [trackEvent]);

  const trackError = useCallback((props: ErrorEventProps) => {
    trackEvent('Error Encountered', props);
  }, [trackEvent]);

  // Reset on route change
  useEffect(() => {
    scrollMilestones.current.clear();
    pageEntryTime.current = Date.now();
    
    return () => {
      trackTimeOnPage();
    };
  }, [pathname, trackTimeOnPage]);

  return {
    trackEvent,
    trackAuth,
    trackIdea,
    trackVote,
    trackVotePurchase,
    trackGrid,
    trackProfile,
    trackProject,
    trackCTA,
    trackNavLink,
    trackSocial,
    trackExternalLink,
    trackScrollDepth,
    trackTimeOnPage,
    trackFeatureDiscovery,
    trackError,
  };
}

// ============================================================================
// SCROLL DEPTH TRACKER HOOK
// ============================================================================

export function useScrollDepthTracker() {
  const { trackScrollDepth } = useAnalytics();
  const tracked = useRef<Set<number>>(new Set());

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      
      const scrollPercent = (window.scrollY / scrollHeight) * 100;
      const milestones = [25, 50, 75, 100] as const;
      
      for (const milestone of milestones) {
        if (scrollPercent >= milestone && !tracked.current.has(milestone)) {
          tracked.current.add(milestone);
          trackScrollDepth(milestone);
        }
      }
    };

    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [trackScrollDepth]);
}

// ============================================================================
// AUTH TRACKER HOOK
// ============================================================================

export function useAuthTracker(
  isAuthenticated: boolean,
  user: { fid?: number; method?: string } | null,
  isLoading: boolean
) {
  const { trackAuth } = useAnalytics();
  const prevAuth = useRef<boolean>(false);
  const hasTrackedSession = useRef<boolean>(false);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user && !hasTrackedSession.current && !prevAuth.current) {
      hasTrackedSession.current = true;
      trackAuth('session_restored', {
        method: user.method as AuthMethod,
        fid: user.fid,
        isReturning: true,
      });
    }

    if (prevAuth.current && !isAuthenticated) {
      trackAuth('logout');
      hasTrackedSession.current = false;
    }

    prevAuth.current = isAuthenticated;
  }, [isAuthenticated, user, isLoading, trackAuth]);
}

// ============================================================================
// VOTE TRACKER HOOK
// ============================================================================

export function useVoteTracker() {
  const { trackVote, trackVotePurchase } = useAnalytics();

  const onVoteCast = useCallback((
    ideaId: string,
    category: string,
    rank: number,
    creditsRemaining: number
  ) => {
    trackVote('cast', { ideaId, category, rank, creditsRemaining });
    
    if (creditsRemaining <= 2) {
      trackVote('credits_low', { creditsRemaining });
    }
  }, [trackVote]);

  const onVoteFailed = useCallback((ideaId: string, error: string) => {
    trackVote('failed', { ideaId, error });
  }, [trackVote]);

  const onPurchaseComplete = useCallback((
    credits: number,
    paymentMethod: 'stripe' | 'crypto' | 'points',
    amountUsd?: number
  ) => {
    trackVotePurchase('completed', { credits, paymentMethod, amountUsd });
  }, [trackVotePurchase]);

  return { onVoteCast, onVoteFailed, onPurchaseComplete };
}

// ============================================================================
// GRID SECTION TRACKER
// ============================================================================

export function useGridTracker() {
  const { trackGrid } = useAnalytics();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith('/grid')) {
      const section = pathname.split('/')[2] as GridSection | undefined;
      
      if (!section) {
        trackGrid('hub_viewed');
      } else {
        trackGrid('section_entered', { section });
      }
    }
  }, [pathname, trackGrid]);

  return { trackGrid };
}

export default useAnalytics;
