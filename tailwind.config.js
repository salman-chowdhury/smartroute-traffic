/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Traffic status colors
        traffic: {
          clear: '#10B981',    // Green
          moderate: '#F59E0B', // Amber
          major: '#EF4444',    // Red
          closed: '#1F2937',   // Black/Dark gray
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}