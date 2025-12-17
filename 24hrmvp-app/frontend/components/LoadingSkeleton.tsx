interface LoadingSkeletonProps {
  className?: string;
}

export default function LoadingSkeleton({ className = '' }: LoadingSkeletonProps) {
  // If a custom className is provided, use it for a simple skeleton
  if (className) {
    return (
      <div 
        className={`animate-pulse bg-white/5 rounded-lg ${className}`}
        aria-label="Loading..."
      />
    );
  }

  // Default full-screen loading experience
  return (
    <div className="min-h-screen bg-bg-deepest flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}
