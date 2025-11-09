'use client';

import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-heading text-[--neon-cyan] mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-3 rounded-lg font-body
          bg-[rgba(255,255,255,0.05)] text-[--text-primary]
          border-2 border-[rgba(255,255,255,0.1)]
          focus:bg-[rgba(4,217,255,0.05)] focus:border-[--neon-cyan]
          focus:shadow-[0_0_0_3px_rgba(4,217,255,0.1),0_0_20px_rgba(4,217,255,0.2)]
          transition-all duration-300
          placeholder:text-[--text-tertiary] placeholder:font-mono placeholder:text-sm
          ${error ? 'border-[--neon-orange] shake' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-[--neon-orange]">{error}</p>
      )}
    </div>
  );
}
