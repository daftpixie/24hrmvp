'use client';

/**
 * Textarea Component for 24HRMVP
 * 
 * @version 5.0.0
 * 
 * Supports BOTH import styles:
 * - import { Textarea } from '@/components/ui/textarea'
 * - import Textarea from '@/components/ui/textarea'
 */

import React, { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          // Base styles
          'flex min-h-[80px] w-full rounded-lg border px-3 py-2',
          'text-sm text-[#E2E8F0] placeholder:text-[#6B7280]',
          'transition-all duration-200 ease-out',
          // Default border and background
          'border-[#1F2933] bg-[#020617]/80',
          // Focus styles
          'focus:outline-none focus:ring-2 focus:ring-[#04D9FF]/50 focus:border-[#04D9FF]',
          // Disabled styles
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Error styles
          error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500',
          // Custom classes
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

// Default export for backwards compatibility
export default Textarea;
