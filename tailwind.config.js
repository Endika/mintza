/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00B380',
          50: '#E6F8F2',
          100: '#CCF0E5',
          500: '#00B380',
          600: '#009A6E',
          700: '#00805B',
        },
        secondary: {
          DEFAULT: '#6366F1',
          50: '#EEF0FF',
          500: '#6366F1',
          600: '#4F52E0',
        },
        ink: {
          DEFAULT: '#000000',
          50: '#F5F5F5',
          100: '#E5E5E5',
          400: '#737373',
          600: '#404040',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: ['Menlo', 'Monaco', '"Courier New"', 'monospace'],
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
