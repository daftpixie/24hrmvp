import '@/lib/wallet-error-handler';
import type { Metadata, Viewport } from 'next';
import { Orbitron, Space_Grotesk, DM_Sans, Space_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';

// ============================================
// FONT CONFIGURATION
// ============================================

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-space-mono',
  weight: ['400', '700'],
  display: 'swap',
});

// ============================================
// VIEWPORT CONFIGURATION
// ============================================

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#04D9FF',
};

// ============================================
// METADATA
// ============================================

export const metadata: Metadata = {
  title: '24HRMVP - Community-Driven 24-Hour MVP Development',
  description: 'Submit ideas, vote on projects, and watch AI build MVPs in 24 hours. Powered by Claude Sonnet 4.5 and the community.',
  keywords: [
    'MVP development',
    '24 hours',
    'AI',
    'Claude Sonnet',
    'community voting',
    'rapid prototyping',
    'Story Protocol',
    'web3',
  ],
  authors: [{ name: '24HRMVP' }],
  creator: '24HRMVP',
  publisher: '24HRMVP',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://24hrmvp.xyz',
    siteName: '24HRMVP',
    title: '24HRMVP - Build MVPs in 24 Hours',
    description: 'Community-driven 24-hour MVP development platform powered by Claude Sonnet 4.5 AI',
    images: [
      {
        url: 'https://24hrmvp.xyz/og-image.png',
        width: 1200,
        height: 630,
        alt: '24HRMVP - Community MVP Development Platform',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '24HRMVP - Build MVPs in 24 Hours',
    description: 'Community-driven 24-hour MVP development platform powered by AI',
    images: ['https://24hrmvp.xyz/og-image.png'],
  },
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
  },
  manifest: '/manifest.json',
  other: {
    'fc:frame': JSON.stringify({
      version: 'next',
      button: {
        title: 'Launch App',
        action: {
          type: 'launch_frame',
          url: 'https://24hrmvp.xyz',
        },
      },
    }),
  },
};

// ============================================
// ROOT LAYOUT
// ============================================

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Preconnect for wallet providers */}
        <link rel="preconnect" href="https://verify.walletconnect.com" />
        <link rel="preconnect" href="https://verify.walletconnect.org" />
        <link rel="preconnect" href="https://explorer-api.walletconnect.com" />
      </head>
      <body
        className={`${orbitron.variable} ${spaceGrotesk.variable} ${dmSans.variable} ${spaceMono.variable} antialiased bg-[#0B192A] text-[#FAFAFA]`}
        suppressHydrationWarning
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

