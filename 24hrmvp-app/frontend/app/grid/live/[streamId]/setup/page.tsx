// ============================================================================
// 24HRMVP Phase 4: Stream Setup Page
// frontend/app/grid/live/[streamId]/setup/page.tsx
// ============================================================================

// Required for static export with dynamic routes
export function generateStaticParams() {
  return [{ streamId: 'placeholder' }];
}

import StreamSetupClient from './StreamSetupClient';

export default function StreamSetupPage() {
  return <StreamSetupClient />;
}
