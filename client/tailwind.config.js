/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#00adef',
        ink: '#101010',
        body: '#343434',
        panel: '#edf2f5',
        tint: '#eaf2f4',
        mist: '#f3fafd',
        leaf: { DEFAULT: '#91c58d', strong: '#9dd298', text: '#4f8a4a' }
      },
      fontFamily: {
        sans: ['var(--font-roboto)', 'var(--font-armenian)', 'Arial', 'sans-serif']
      },
      maxWidth: {
        site: '1240px'
      },
      screens: {
        desk: '931px',
        wide: '1200px',
        // Declared because a custom max-width screen turns off the automatic max-* variants.
        // Widest first: later ones win in the stylesheet, so a narrower screen must come after a wider one.
        'max-desk': { max: '930px' },
        'max-md': { max: '767px' },
        'max-sm': { max: '639px' }
      }
    }
  },
  plugins: []
};
