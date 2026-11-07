/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        gibed: ['Gibed', 'Syne', 'Inter', 'sans-serif'],
      },
      colors: {
        powder: {
          50: '#f0f8fb',
          100: '#dcf0f7',
          200: '#b0e0e6', // Classic Powder Blue
          300: '#89cfdc',
          400: '#58b7ca',
          500: '#329ab0',
          600: '#247c92',
          700: '#1f6477',
          800: '#1e5262',
          900: '#1c4452',
        },
        racing: {
          50: '#fff5f0',
          100: '#ffe6d9',
          200: '#ffc8ad',
          300: '#ffa175',
          400: '#ff7338',
          500: '#ff4f00', // Vibrant Racing Orange
          600: '#e64500',
          700: '#bf3700',
          800: '#992c00',
          900: '#7a2300',
        },
        deepblue: {
          50: '#f0f5ff',
          100: '#e0ebff',
          200: '#c2d6ff',
          300: '#94b8ff',
          400: '#5c8fff',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#153eaf', // Deep Royal Blue
          800: '#0f2c82', // Deep Navy Blue
          900: '#0a1e5c', // Midnight Deep Blue
          950: '#061238',
        },
        bubblegum: {
          50: '#fff0f7',
          100: '#ffe2f0',
          200: '#ffc4e1',
          300: '#ff94c8',
          400: '#ff5ca8', // Soft Bubblegum Pink
          500: '#ff2e93', // Vibrant Bubblegum Pink
          600: '#e6177c',
          700: '#bf0e65',
          800: '#990b51',
          900: '#7a0941',
        },
        maroon: {
          50: '#fdf3f5',
          100: '#fae5e9',
          200: '#f5ccd5',
          300: '#eba3b3',
          400: '#dd6e87',
          500: '#c63d5d',
          600: '#a62041',
          700: '#800020', // Classic Deep Maroon
          800: '#660019', // Rich Deep Maroon
          900: '#4d0013', // Dark Oxblood Maroon
          950: '#2d000b',
        },
        sage: {
          50: '#f4f7f4',
          100: '#e4ece4',
          200: '#c9dac9',
          300: '#a3bfa4',
          400: '#7ba37d', // Classic Sage Green
          500: '#5b875e', // Rich Sage Green
          600: '#466c49',
          700: '#39563b',
          800: '#2f4631',
          900: '#273a29',
          950: '#142016',
        },
      },
    },
  },
  plugins: [],
}
