import { Metadata } from 'next';
import GridHeader from '@/components/grid/GridHeader';

export const metadata: Metadata = {
  title: {
    template: '%s | The Grid',
    default: 'The Grid | 24HRMVP Community Hub',
  },
  description: 'Join the conversation, share ideas, and connect with the 24HRMVP community',
};

export default function GridLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0B192A]">
      <GridHeader />
      <main className="px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}