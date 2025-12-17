// Required for Next.js static export with dynamic routes
export function generateStaticParams() {
  return [
    { slug: 'general' },
    { slug: 'ideas' },
    { slug: 'development' },
    { slug: 'announcements' },
    { slug: 'help' },
  ];
}

import ChatRoomClient from './ChatRoomClient';

export default function ChatRoomPage() {
  return <ChatRoomClient />;
}
