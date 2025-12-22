'use client';

/**
 * Button Component for 24HRMVP
 * 
 * @version 5.0.0 - Unified exports (both named and default)
 * 
 * Supports BOTH import styles:
 * - import { Button } from '@/components/ui/button'
 * - import Button from '@/components/ui/button'
 */

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'xs' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

// ============================================
// VARIANT STYLES
// ============================================

const variantStyles: Record<ButtonVariant, string> = {
  default: `
    bg-[#04D9FF] text-[#0B192A] font-semibold
    hover:bg-[#04D9FF]/90 hover:shadow-[0_0_20px_rgba(4,217,255,0.4)]
    active:bg-[#04D9FF]/80
    disabled:bg-[#04D9FF]/50 disabled:cursor-not-allowed
  `,
  primary: `
    bg-gradient-to-r from-[#04D9FF] to-[#1F51FF] text-white font-semibold
    hover:shadow-[0_0_25px_rgba(4,217,255,0.5)]
    active:opacity-90
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  secondary: `
    bg-[#8A00C4] text-white font-semibold
    hover:bg-[#8A00C4]/90 hover:shadow-[0_0_20px_rgba(138,0,196,0.4)]
    active:bg-[#8A00C4]/80
    disabled:bg-[#8A00C4]/50 disabled:cursor-not-allowed
  `,
  outline: `
    bg-transparent border border-[#04D9FF] text-[#04D9FF] font-semibold
    hover:bg-[#04D9FF]/10 hover:shadow-[0_0_15px_rgba(4,217,255,0.3)]
    active:bg-[#04D9FF]/20
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  ghost: `
    bg-transparent text-[#B0B0B0] font-medium
    hover:bg-white/5 hover:text-[#FAFAFA]
    active:bg-white/10
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  destructive: `
    bg-red-500/10 border border-red-500/50 text-red-400 font-semibold
    hover:bg-red-500/20 hover:border-red-500
    active:bg-red-500/30
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  link: `
    bg-transparent text-[#04D9FF] font-medium underline-offset-4
    hover:underline hover:text-[#04D9FF]/80
    active:text-[#04D9FF]/70
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-8 px-3 py-1.5 text-xs',
  lg: 'h-12 px-6 py-3 text-base',
  xs: 'h-7 px-2 py-1 text-xs',
  icon: 'h-10 w-10 p-0',
};

// ============================================
// COMPONENT
// ============================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2 rounded-lg',
          'transition-all duration-200 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-[#04D9FF]/50 focus:ring-offset-2 focus:ring-offset-[#0B192A]',
          // Variant and size
          variantStyles[variant],
          sizeStyles[size],
          // Custom classes
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Default export for backwards compatibility
export default Button;
