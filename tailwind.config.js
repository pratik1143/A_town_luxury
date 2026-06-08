/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        luxury: {
          dark: '#FFFFFF',
          charcoal: '#F8F9FA',
          card: '#FFFFFF',
          gold: '#C9A227',
          bronze: '#71717A',
          champagne: '#E9ECEF',
          accent: '#C9A227',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 4px 20px rgba(201, 162, 39, 0.08)',
        'gold-glow-lg': '0 8px 35px rgba(201, 162, 39, 0.12)',
        'gold-glow-sm': '0 2px 10px rgba(201, 162, 39, 0.04)',
        'glass': '0 8px 32px 0 rgba(17, 17, 17, 0.04)',
        'premium': '0 4px 24px 0 rgba(0, 0, 0, 0.03)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #F5E0A9 0%, #C9A227 100%)',
        'gold-radial': 'radial-gradient(circle, rgba(201, 162, 39, 0.05) 0%, rgba(255, 255, 255, 0) 70%)',
      }
    },
  },
  plugins: [],
}
