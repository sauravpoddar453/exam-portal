/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          950: '#0b0a26',
          900: '#12103a',
          850: '#171545',
          800: '#1e1b58',
          700: '#272370',
        },
        amber: {
          400: '#ffb84d',
          500: '#f5a623',
          600: '#d98b10',
        },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
        },
      },
    },
  },
  plugins: [],
}
