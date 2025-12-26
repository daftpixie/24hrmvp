/**
 * 24HRMVP Main Platform - Analytics Event Types
 * 
 * File: frontend/lib/types/analytics.ts
 * 
 * Self-hosted Plausible Analytics at analytics.24hrmvp.xyz
 */

// ============================================================================
// CORE EVENT DEFINITIONS
// ============================================================================

export type PlatformEvent =
  // Auth Events
  | 'Auth Started'
  | 'Auth Method Selected'
  | 'Wallet Connected'
  | 'Wallet Connect Failed'
  | 'Farcaster Auth Started'
  | 'Farcaster Auth Success'
  | 'Farcaster Auth Failed'
  | 'SIWE Sign Started'
  | 'SIWE Sign Success'
  | 'SIWE Sign Failed'
  | 'User Logged Out'
  | 'Session Restored'
  // Idea Events
  | 'Submit Page Viewed'
  | 'Idea Draft Started'
  | 'Idea Draft Saved'
  | 'Idea Submitted'
  | 'Idea Submission Failed'
  | 'Idea Category Selected'
  // Vote Events
  | 'Vote Page Viewed'
  | 'Vote Cast'
  | 'Vote Failed'
  | 'Vote Credits Low'
  | 'Vote Purchase Modal Opened'
  | 'Vote Purchase Started'
  | 'Vote Purchase Completed'
  | 'Vote Purchase Failed'
  // Grid Events
  | 'Grid Hub Viewed'
  | 'Grid Section Entered'
  | 'Chat Room Joined'
  | 'Chat Message Sent'
  | 'Chat Message Failed'
  | 'Forum Viewed'
  | 'Forum Post Created'
  | 'Forum Post Voted'
  | 'Forum Post Bookmarked'
  | 'Live Hub Viewed'
  | 'Livestream Started'
  | 'Livestream Joined'
  | 'Livestream Left'
  | 'Social Feed Viewed'
  // Profile Events
  | 'Profile Viewed'
  | 'Profile Setup Started'
  | 'Profile Setup Completed'
  | 'Profile Updated'
  | 'Own Profile Viewed'
  // Project Events
  | 'Projects Page Viewed'
  | 'Project Card Clicked'
  | 'Project Demo Launched'
  | 'Project Repo Clicked'
  // Navigation Events
  | 'Page Viewed'
  | 'Nav Link Clicked'
  | 'CTA Clicked'
  | 'External Link Clicked'
  | 'Social Link Clicked'
  | 'Logo Clicked'
  // Engagement Events
  | 'Scroll Depth'
  | 'Time on Page'
  | 'Feature Discovered'
  | 'Error Encountered'
  | 'Help Requested';

// ============================================================================
// EVENT PROPERTY INTERFACES
// ============================================================================

export interface AuthEventProps {
  method?: 'wallet' | 'farcaster' | 'siwe';
  provider?: string;
  fid?: number;
  error?: string;
  isReturning?: boolean;
}

export interface IdeaEventProps {
  ideaId?: string;
  category?: string;
  complexity?: 'simple' | 'moderate' | 'complex';
  titleLength?: number;
  descriptionLength?: number;
  hasAttachments?: boolean;
  error?: string;
}

export interface VoteEventProps {
  ideaId?: string;
  category?: string;
  rank?: number;
  creditsRemaining?: number;
  weight?: number;
  error?: string;
}

export interface VotePurchaseEventProps {
  credits?: number;
  paymentMethod?: 'stripe' | 'crypto' | 'points';
  amountUsd?: number;
  transactionId?: string;
  error?: string;
}

export interface GridEventProps {
  section?: 'chat' | 'forum' | 'live' | 'social' | 'leaderboard';
  roomId?: string;
  roomName?: string;
  contentLength?: number;
  hasMedia?: boolean;
  isReply?: boolean;
  streamId?: string;
  viewerCount?: number;
}

export interface ProfileEventProps {
  profileId?: string;
  isOwnProfile?: boolean;
  completeness?: number;
  fieldsUpdated?: string[];
  ideaCount?: number;
  voteCount?: number;
}

export interface ProjectEventProps {
  projectId?: string;
  projectName?: string;
  status?: 'building' | 'completed' | 'deployed';
  techStack?: string[];
  action?: 'view' | 'demo' | 'repo' | 'share';
}

export interface NavEventProps {
  destination: string;
  source: 'header' | 'footer' | 'sidebar' | 'page' | 'cta' | 'grid-nav';
  label?: string;
}

export interface CTAClickProps {
  button: string;
  location: 'header' | 'hero' | 'vote' | 'submit' | 'grid' | 'profile' | 'footer';
  destination?: string;
  variant?: string;
}

export interface SocialLinkProps {
  platform: 'twitter' | 'farcaster' | 'discord' | 'github' | 'warpcast';
  url: string;
  context?: 'header' | 'footer' | 'profile' | 'share';
}

export interface ScrollDepthProps {
  depth: 25 | 50 | 75 | 100;
  page: string;
}

export interface ErrorEventProps {
  type: 'auth' | 'api' | 'wallet' | 'network' | 'validation' | 'unknown';
  message: string;
  context: string;
  recoverable?: boolean;
}

// ============================================================================
// EVENT PROPERTY MAPPING
// ============================================================================

export interface PlatformEventPropsMap {
  'Auth Started': undefined;
  'Auth Method Selected': AuthEventProps;
  'Wallet Connected': AuthEventProps;
  'Wallet Connect Failed': AuthEventProps;
  'Farcaster Auth Started': undefined;
  'Farcaster Auth Success': AuthEventProps;
  'Farcaster Auth Failed': AuthEventProps;
  'SIWE Sign Started': AuthEventProps;
  'SIWE Sign Success': AuthEventProps;
  'SIWE Sign Failed': AuthEventProps;
  'User Logged Out': undefined;
  'Session Restored': AuthEventProps;
  'Submit Page Viewed': undefined;
  'Idea Draft Started': IdeaEventProps;
  'Idea Draft Saved': IdeaEventProps;
  'Idea Submitted': IdeaEventProps;
  'Idea Submission Failed': IdeaEventProps;
  'Idea Category Selected': IdeaEventProps;
  'Vote Page Viewed': undefined;
  'Vote Cast': VoteEventProps;
  'Vote Failed': VoteEventProps;
  'Vote Credits Low': VoteEventProps;
  'Vote Purchase Modal Opened': undefined;
  'Vote Purchase Started': VotePurchaseEventProps;
  'Vote Purchase Completed': VotePurchaseEventProps;
  'Vote Purchase Failed': VotePurchaseEventProps;
  'Grid Hub Viewed': undefined;
  'Grid Section Entered': GridEventProps;
  'Chat Room Joined': GridEventProps;
  'Chat Message Sent': GridEventProps;
  'Chat Message Failed': GridEventProps;
  'Forum Viewed': undefined;
  'Forum Post Created': GridEventProps;
  'Forum Post Voted': GridEventProps;
  'Forum Post Bookmarked': GridEventProps;
  'Live Hub Viewed': undefined;
  'Livestream Started': GridEventProps;
  'Livestream Joined': GridEventProps;
  'Livestream Left': GridEventProps;
  'Social Feed Viewed': undefined;
  'Profile Viewed': ProfileEventProps;
  'Profile Setup Started': undefined;
  'Profile Setup Completed': ProfileEventProps;
  'Profile Updated': ProfileEventProps;
  'Own Profile Viewed': ProfileEventProps;
  'Projects Page Viewed': undefined;
  'Project Card Clicked': ProjectEventProps;
  'Project Demo Launched': ProjectEventProps;
  'Project Repo Clicked': ProjectEventProps;
  'Page Viewed': { page: string; referrer?: string };
  'Nav Link Clicked': NavEventProps;
  'CTA Clicked': CTAClickProps;
  'External Link Clicked': { url: string; text?: string };
  'Social Link Clicked': SocialLinkProps;
  'Logo Clicked': { destination: string };
  'Scroll Depth': ScrollDepthProps;
  'Time on Page': { page: string; seconds: number };
  'Feature Discovered': { feature: string; context: string };
  'Error Encountered': ErrorEventProps;
  'Help Requested': { topic?: string; context: string };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type PropsForEvent<E extends PlatformEvent> = 
  E extends keyof PlatformEventPropsMap 
    ? PlatformEventPropsMap[E] 
    : Record<string, string | number | boolean>;

export type AuthMethod = 'wallet' | 'farcaster' | 'siwe';
export type GridSection = 'chat' | 'forum' | 'live' | 'social' | 'leaderboard';
export type IdeaCategory = 'defi' | 'nft' | 'dao' | 'social' | 'gaming' | 'infrastructure' | 'tooling' | 'other';
export type ProjectStatus = 'queued' | 'building' | 'completed' | 'deployed' | 'failed';
