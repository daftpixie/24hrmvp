'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}

export default function Card({ children, className = '', hoverable = true }: CardProps) {
  return (
    <motion.div
      className={`
        relative p-6 rounded-2xl overflow-hidden
        bg-gradient-to-br from-[rgba(190,190,190,0.15)] to-[rgba(230,230,230,0.25)]
        border border-[rgba(255,255,255,0.3)]
        shadow-[0_2px_4px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5)]
        backdrop-blur-xl
        ${className}
      `}
      initial={hoverable ? { y: 0 } : false}
      whileHover={hoverable ? { y: -4, boxShadow: '0 4px 8px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.12), 0 16px 32px rgba(0,0,0,0.12)' } : {}}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="absolute inset-0 backdrop-blur-xl -z-10" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
