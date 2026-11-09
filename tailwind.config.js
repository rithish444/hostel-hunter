/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        hunter: {
          red: '#ef4444',
          crimson: '#dc2626',
          dark: '#991b1b',
        },
        crewmate: {
          blue: '#06b6d4',
          cyan: '#22d3ee',
          dark: '#0891b2',
        },
        hud: {
          bg: '#0a0f1d',
          surface: '#111827',
          border: '#1f2937',
          accent: '#10b981',
          gold: '#f59e0b',
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'radar 3s linear infinite',
        'heartbeat': 'heartbeat 1.2s ease-in-out infinite',
      },
      keyframes: {
        radar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        }
      }
    },
  },
  plugins: [],
}
