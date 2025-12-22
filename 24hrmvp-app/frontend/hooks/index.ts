/**
 * Hooks Index
 * 
 * @version 6.0.0
 * 
 * Central export for all custom hooks.
 */

// Auth hooks
export { useRequireAuth, type UseRequireAuthOptions, type RequireAuthResult } from './useRequireAuth';

// Re-export existing hooks
export { default as useForumFeed } from './useForumFeed';
// Fixed: Changed to star exports as these modules likely don't have a default export
export * from './useGrid';
export * from './useLivestream';
export * from './useOnClickOutside';
export { default as usePostMutations } from './usePostMutations';
export * from './useProfile';
export { default as useWebSocket } from './useWebSocket';
