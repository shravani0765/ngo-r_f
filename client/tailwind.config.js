/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          500: '#102a43',
          600: '#0b69a3',
          700: '#035388',
          800: '#012443',
          900: '#001429',
        },
        emeraldCustom: {
          500: '#10b981',
          600: '#059669',
        }
      }
    },
  },
  plugins: [],
}
