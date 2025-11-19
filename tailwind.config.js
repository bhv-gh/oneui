/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'border-pulse': {
          '0%, 100%': { borderColor: 'rgba(16, 185, 129, 0.4)' }, // emerald-400/40
          '50%': { borderColor: 'rgba(16, 185, 129, 1)' }, // emerald-400
        },
      },
      animation: {
        'border-pulse': 'border-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}