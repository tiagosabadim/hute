/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      width: {
        'sidebar-sm': '64px',
        'sidebar-lg': '240px',
      },
    },
  },
  plugins: [],
}