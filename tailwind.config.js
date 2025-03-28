/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        gilroy: ['Gilroy', 'sans-serif'],
        'overpass-mono': ['Overpass Mono', 'monospace']
      },
      colors: {
        neulight: {
          base: '#F0F0F3',
          card: '#FFFFFF',
          primary: '#4F46E5',
          'primary-hover': '#4338CA',
          secondary: '#10B981',
          'secondary-hover': '#059669',
          accent: '#F43F5E',
          'accent-hover': '#E11D48',
          muted: '#6B7280',
          subtle: '#9CA3AF',
          divider: '#E5E7EB'
        }
      },
      boxShadow: {
        'neu-sm': '4px 4px 8px #D1D1D4, -4px -4px 8px #FFFFFF',
        'neu': '6px 6px 12px #D1D1D4, -6px -6px 12px #FFFFFF',
        'neu-lg': '10px 10px 20px #D1D1D4, -10px -10px 20px #FFFFFF',
        'neu-inner': 'inset 4px 4px 8px #D1D1D4, inset -4px -4px 8px #FFFFFF'
      }
    }
  },
  plugins: []
}
