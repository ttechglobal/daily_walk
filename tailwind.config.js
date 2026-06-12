// ── tailwind.config.js ──
// Uses ES module export to match "type": "module" in package.json.

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/app/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/hooks/**/*.{js,jsx}',
    './src/lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          DEFAULT: '#5B4FCF',
          light:   '#EDE9FF',
          dark:    '#4339A8',
        },
        sage: {
          DEFAULT: '#4A7C5F',
          light:   '#E8F4ED',
        },
        amber: {
          DEFAULT: '#E8A838',
          light:   '#FFF4DC',
        },
        warm: {
          bg:    '#FAF8F5',
          outer: '#F0EDE8',
        },
        text: {
          primary: '#1A1A2E',
          muted:   '#6B7280',
        },
      },
      fontFamily: {
        sans:    ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Lora', 'serif'],
      },
      borderRadius: {
        card:  '20px',
        input: '14px',
        pill:  '100px',
      },
      boxShadow: {
        card:       '0 2px 12px rgba(0,0,0,0.07)',
        'card-hover':'0 4px 24px rgba(0,0,0,0.12)',
        purple:     '0 4px 20px rgba(91,79,207,0.35)',
      },
    },
  },
  plugins: [],
}