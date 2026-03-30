/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00C288',
        },
        secondary: {
          DEFAULT: '#004975',
        },
        background: {
          DEFAULT: '#F8F9FA',
          container: '#FFFFFF',
        }
      }
    },
  },
  plugins: [],
}
