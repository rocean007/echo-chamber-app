/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#D32F2F',
        secondary: '#8B0000',
        accent1: '#FF5722',
        accent2: '#FFC107',
        background: '#1A1A1A',
      },
      fontFamily: {
        display: ['Cinzel Decorative', 'serif'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
