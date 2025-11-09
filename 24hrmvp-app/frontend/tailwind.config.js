/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
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
      },
    },
  },
  plugins: [],
};
