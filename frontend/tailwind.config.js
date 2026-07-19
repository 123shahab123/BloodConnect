/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blood: { DEFAULT: '#C0392B', dark: '#922B21', light: '#E74C3C' },
        emergency: '#E67E22',
        success: '#27AE60',
        neutral: { dark: '#2C3E50', medium: '#5D6D7E', light: '#F4F6F7' },
      },
      fontFamily: {
        sans: ['Noto Sans', 'system-ui', 'sans-serif'],
        arabic: ['Noto Naskh Arabic', 'Noto Sans', 'sans-serif'],
      },
      animation: {
        'pulse-blood': 'pulse-blood 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0,0,0.2,1) infinite',
      },
      keyframes: {
        'pulse-blood': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
        slideUp: { from: { transform: 'translateY(20px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn: { from: { transform: 'scale(0.95)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
      },
      minHeight: { screen: '100svh' },
    },
  },
  plugins: [],
}
