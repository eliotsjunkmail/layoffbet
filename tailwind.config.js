/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        blue: {
          50:  '#e6f4f7',
          100: '#c2e3ea',
          200: '#9dd1dc',
          300: '#72bcce',
          400: '#4dabbe',
          500: '#1E7A8C',
          600: '#1E7A8C',
          700: '#176370',
          800: '#0f4d57',
          900: '#08363d',
        },
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(120px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(120px)', opacity: '0' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-down': 'slide-down 0.4s ease-in',
      },
    },
  },
  plugins: [],
}
