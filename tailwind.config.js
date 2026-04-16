/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    require('path').join(__dirname, 'pages/**/*.{js,ts,jsx,tsx,mdx}'),
    require('path').join(__dirname, 'components/**/*.{js,ts,jsx,tsx,mdx}'),
    require('path').join(__dirname, 'app/**/*.{js,ts,jsx,tsx,mdx}'),
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f3',
          100: '#fde6e7',
          200: '#fcd0d4',
          300: '#f8a7af',
          400: '#f37886',
          500: '#ea4d62',
          600: '#DB324D', // Main brand color
          700: '#c11d3a',
          800: '#a11a33',
          900: '#881a31',
        },
      },
    },
  },
  plugins: [],
}