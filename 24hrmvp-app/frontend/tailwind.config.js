/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'animate-spin',
    'animate-pulse',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        'neon-cyan': '#04D9FF',
        'neon-blue': '#1F51FF',
        'electric-cyan': '#00FEFC',
        'tron-blue': '#7DFDFE',
        'neon-purple': '#8A00C4',
        'neon-pink': '#FB48C4',
        'neon-orange': '#FF5C00',
        'bg-deepest': '#0B192A',
        'bg-primary': '#1E1E1E',
        'text-primary': '#FAFAFA',
        'text-secondary': '#B0B0B0',
      },
      animation: {
        spin: 'spin 1s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
      },
    },
  },
  plugins: [],
};
