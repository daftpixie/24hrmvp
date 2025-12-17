'use client';

import { useEffect } from 'react';

/**
 * DebugLogger Component
 * 
 * Attaches global error handlers and logs critical lifecycle events.
 * Use this in your root layout to capture crashes that don't show up in standard logs.
 */
export function DebugLogger() {
  useEffect(() => {
    // 1. Log mount
    console.log('[DebugLogger] App mounted on client.');

    // 2. Global Error Handler
    const handleError = (event: ErrorEvent) => {
      console.error('[DebugLogger] Global Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });

      // Optional: Send to analytics/logging backend here
    };

    // 3. Unhandled Promise Rejection Handler
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('[DebugLogger] Unhandled Promise Rejection:', {
        reason: event.reason,
        promise: event.promise,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // 4. Performance Observer (Detect long tasks causing freezes)
    let perfObserver: PerformanceObserver | null = null;
    if ('PerformanceObserver' in window) {
      try {
        perfObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Log tasks taking > 50ms
              console.warn(`[DebugLogger] Long Task detected (${Math.round(entry.duration)}ms):`, entry);
            }
          }
        });
        perfObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('[DebugLogger] PerformanceObserver not supported.');
      }
    }

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      if (perfObserver) perfObserver.disconnect();
    };
  }, []);

  return null; // Renderless component
}
