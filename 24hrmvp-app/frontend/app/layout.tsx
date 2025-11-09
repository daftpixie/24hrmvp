import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/layout/Navigation';
import FarcasterProvider from '@/components/providers/FarcasterProvider';

export const metadata: Metadata = {
  title: '24HRMVP - Community-Driven 24-Hour MVP Development',
  description: 'Vote on ideas, build MVPs in 24 hours using AI orchestration',
  other: {
    'fc:frame': JSON.stringify({
      version: 'next',
      button: {
        title: '🚀 Submit Idea',
        action: { type: 'launch_frame', url: process.env.NEXT_PUBLIC_APP_URL },
      },
    }),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://auth.farcaster.xyz" />
      </head>
      <body>
        <FarcasterProvider>
          <Navigation />
          <main className="min-h-screen">{children}</main>
        </FarcasterProvider>
      </body>
    </html>
  );
}
