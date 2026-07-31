import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        peach: {
          50: '#FFFAF5',
          100: '#FFF1E6',
          200: '#FFE1C8',
          300: '#FFCBA0',
          400: '#FFAE72',
          500: '#FF8A4C',
        },
        coral: {
          400: '#FF7A54',
          500: '#FF5F3C',
          600: '#F04623',
          700: '#C7371A',
        },
        ink: {
          900: '#241C18',
          800: '#392C25',
          600: '#6B5A50',
          400: '#9C897D',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(196, 120, 60, 0.15)',
        polaroid: '0 12px 24px -6px rgba(36, 28, 24, 0.25)',
      },
      backgroundImage: {
        'peach-gradient':
          'radial-gradient(120% 120% at 50% 0%, #FFF1E6 0%, #FFE1C8 45%, #FFCBA0 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;