/**
 * PostHog Analytics Client
 * 
 * Free tier: 1M events/month - sufficient for 100-user beta
 * Features:
 * - Product analytics
 * - Session replay
 * - Feature flags
 * - A/B testing
 * 
 * @see https://posthog.com/docs/libraries/next-js
 */

import posthog from 'posthog-js';

// Check if PostHog is configured
const isPostHogEnabled = (): boolean => {
  return typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
};

/**
 * Initialize PostHog client
 * Call this in your app's root component or _app.tsx
 */
export function initPostHog(): void {
  if (!isPostHogEnabled()) {
    console.warn('[PostHog] Not configured - analytics disabled');
    return;
  }

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    
    // Capture pageviews automatically
    capture_pageview: true,
    
    // Capture pageleaves (time on page)
    capture_pageleave: true,
    
    // Session recording configuration
    session_recording: {
      // Mask all text inputs by default for privacy
      maskAllInputs: true,
      // Mask specific elements
      maskTextSelector: '[data-posthog-mask]',
    },
    
    // Disable in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        posthog.opt_out_capturing();
        console.log('[PostHog] Disabled in development');
      }
    },
    
    // Persistence configuration
    persistence: 'localStorage+cookie',
    
    // Bootstrap for faster feature flag loading
    bootstrap: {
      distinctID: undefined, // Will be set when user authenticates
    },
    
    // Advanced configuration
    autocapture: true, // Auto-capture clicks, form submissions
    disable_session_recording: false,
    enable_recording_console_log: false, // Don't record console logs
    
    // Privacy settings
    respect_dnt: true, // Respect Do Not Track
  });
}

/**
 * Identify user after authentication
 * Links all events to this user's FID
 */
export function identifyUser(fid: number, properties?: Record<string, any>): void {
  if (!isPostHogEnabled()) return;
  
  posthog.identify(`fid_${fid}`, {
    fid,
    ...properties,
  });
}

/**
 * Reset user identity (on logout)
 */
export function resetUser(): void {
  if (!isPostHogEnabled()) return;
  posthog.reset();
}

/**
 * Track custom event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
): void {
  if (!isPostHogEnabled()) return;
  posthog.capture(eventName, properties);
}

/**
 * Track page view (if not using automatic capture)
 */
export function trackPageView(url?: string): void {
  if (!isPostHogEnabled()) return;
  posthog.capture('$pageview', url ? { $current_url: url } : undefined);
}

// ============================================================================
// Pre-defined Event Tracking Functions
// ============================================================================

/**
 * Track when user submits an idea
 */
export function trackIdeaSubmission(ideaId: string, category: string): void {
  trackEvent('idea_submitted', { ideaId, category });
}

/**
 * Track when user votes
 */
export function trackVote(ideaId: string, voteType: 'up' | 'down'): void {
  trackEvent('vote_cast', { ideaId, voteType });
}

/**
 * Track chat message sent
 */
export function trackChatMessage(roomId: string): void {
  trackEvent('chat_message_sent', { roomId });
}

/**
 * Track forum post created
 */
export function trackForumPost(postId: string, isReply: boolean): void {
  trackEvent('forum_post_created', { postId, isReply });
}

/**
 * Track onboarding progress
 */
export function trackOnboardingStep(step: string, completed: boolean): void {
  trackEvent('onboarding_step', { step, completed });
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(feature: string): void {
  trackEvent('feature_used', { feature });
}

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flagKey: string): boolean {
  if (!isPostHogEnabled()) return false;
  return posthog.isFeatureEnabled(flagKey) ?? false;
}

/**
 * Get feature flag value (for multivariate flags)
 */
export function getFeatureFlagValue(flagKey: string): string | boolean | undefined {
  if (!isPostHogEnabled()) return undefined;
  return posthog.getFeatureFlag(flagKey);
}

/**
 * Reload feature flags (useful after user properties change)
 */
export function reloadFeatureFlags(): void {
  if (!isPostHogEnabled()) return;
  posthog.reloadFeatureFlags();
}

// ============================================================================
// Session Recording Controls
// ============================================================================

/**
 * Start session recording
 */
export function startSessionRecording(): void {
  if (!isPostHogEnabled()) return;
  posthog.startSessionRecording();
}

/**
 * Stop session recording
 */
export function stopSessionRecording(): void {
  if (!isPostHogEnabled()) return;
  posthog.stopSessionRecording();
}

// Export PostHog instance for advanced usage
export { posthog };

export default {
  initPostHog,
  identifyUser,
  resetUser,
  trackEvent,
  trackPageView,
  trackIdeaSubmission,
  trackVote,
  trackChatMessage,
  trackForumPost,
  trackOnboardingStep,
  trackFeatureUsage,
  isFeatureEnabled,
  getFeatureFlagValue,
  reloadFeatureFlags,
  startSessionRecording,
  stopSessionRecording,
};
