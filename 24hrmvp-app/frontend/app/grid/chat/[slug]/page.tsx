// ============================================
// 24HRMVP - CHAT ROOM PAGE
// File: frontend/app/grid/chat/[slug]/page.tsx
// FIXED: Pass slug prop to ChatRoomPageContent
// ============================================

'use client';

import { useParams } from 'next/navigation';
import ClientOnly from '@/components/ClientOnly';
import ChatRoomClient from './ChatRoomClient';

// Main page component
export default function ChatRoomPage() {
  const params = useParams();
  const slug = params?.slug as string;

  return (
    <ClientOnly fallback={
      <div className="min-h-screen bg-[#0B192A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#04D9FF] mx-auto mb-4" />
          <p className="text-gray-400">Loading chat room...</p>
        </div>
      </div>
    }>
      <ChatRoomClient slug={slug} />
    </ClientOnly>
  );
}
