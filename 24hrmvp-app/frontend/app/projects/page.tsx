'use client';

import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';
function ProjectsPageContent() {
  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="font-heading text-5xl font-bold text-[--neon-cyan] mb-8">
        MVP Projects
      </h1>
      <p className="text-[--text-secondary]">Project gallery coming soon...</p>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <ClientOnly fallback={<LoadingSkeleton />}>
      <ProjectsPageContent />
    </ClientOnly>
  );
}