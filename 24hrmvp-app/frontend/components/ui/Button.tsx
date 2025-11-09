'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'chrome' | 'neon' | 'ghost';
  children: ReactNode;
}

export default function Button({ variant = 'chrome', children, className = '', ...props }: ButtonProps) {
  const baseStyles = "relative px-8 py-3 font-heading font-semibold rounded-full transition-all duration-200";
  
  const variants = {
    chrome: `
      bg-gradient-to-br from-[#999] via-[#fff] to-[#999]
      text-[#333] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(0,0,0,0.3),0_2px_5px_rgba(0,0,0,0.3)]
      hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.4),0_4px_10px_rgba(0,0,0,0.4)]
      hover:-translate-y-0.5 active:translate-y-0
    `,
    neon: `
      border-2 border-[--neon-cyan] bg-transparent text-[--neon-cyan]
      shadow-[0_0_10px_rgba(4,217,255,0.3),0_0_20px_rgba(4,217,255,0.2),inset_0_0_10px_rgba(4,217,255,0.1)]
      hover:bg-[rgba(4,217,255,0.1)] hover:shadow-[0_0_15px_rgba(4,217,255,0.5),0_0_30px_rgba(4,217,255,0.3)]
      hover:scale-[1.02]
    `,
    ghost: `
      bg-transparent text-[--text-primary] border border-[--text-secondary]
      hover:border-[--neon-cyan] hover:text-[--neon-cyan]
    `
  };

  return (
    <motion.button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      whileHover={{ scale: variant === 'neon' ? 1.02 : 1 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
