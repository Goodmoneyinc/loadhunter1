/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      colors: {
        'electric-violet': '#8B5CF6',
        'electric-cyan': '#06B6D4',
      },
      letterSpacing: {
        'extra-wide': '0.1em',
      },
    },
  },
  plugins: [],
};
