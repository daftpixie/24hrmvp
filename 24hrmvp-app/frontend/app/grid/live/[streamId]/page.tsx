// ============================================================================
// 24HRMVP Phase 4: Watch Stream Page
// frontend/app/grid/live/[streamId]/page.tsx
// ============================================================================

// Required for static export with dynamic routes
export function generateStaticParams() {
  return [{ streamId: 'placeholder' }];
}

import WatchStreamClient from './WatchStreamClient';

export default function WatchStreamPage() {
  return <WatchStreamClient />;
}
