'use client';
import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'chrome' | 'neon' | 'ghost';
    className?: string;
}

export default function Button({
    children,
    variant = 'chrome',
    className = '',
    ...props
}: ButtonProps) {
    const baseStyles = 'relative px-6 py-3 font-heading font-semibold rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        chrome: 'bg-gradient-to-r from-[#A8A9AD] via-[#E3E3E3] to-[#A8A9AD] text-gray-800 hover:shadow-lg hover:-translate-y-0.5',
        neon: 'border-2 border-[--neon-cyan] bg-transparent text-[--neon-cyan] hover:bg-[rgba(4,217,255,0.1)] hover:shadow-[0_0_20px_rgba(4,217,255,0.3)]',
        ghost: 'bg-transparent text-[--text-secondary] hover:text-[--neon-cyan] hover:bg-[rgba(4,217,255,0.05)]',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}