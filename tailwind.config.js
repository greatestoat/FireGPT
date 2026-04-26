/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f0f4ff',
          100: '#dde5ff',
          200: '#c3cfff',
          300: '#9aaeff',
          400: '#6d86ff',
          500: '#4a5fff',
          600: '#3244f5',
          700: '#2534e0',
          800: '#1e2ab5',
          900: '#1a2490',
          950: '#0f1554',
        },
        surface: '#0a0b14',
        panel: '#111220',
        border: '#1e2035',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glow: {
          from: { boxShadow: '0 0 20px rgba(74, 95, 255, 0.3)' },
          to: { boxShadow: '0 0 40px rgba(74, 95, 255, 0.6)' }
        },
      },
    },
  },
  plugins: [],
}
tailwind.config.js

