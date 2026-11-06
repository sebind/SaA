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
      },
    },
  },
  plugins: [],
}
