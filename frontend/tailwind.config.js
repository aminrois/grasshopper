/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060b17',
          900: '#0a1224',
          850: '#0d1830',
          800: '#111f3e',
          750: '#172a54',
          700: '#1e3567',
          600: '#2b498a',
          500: '#3d64b8',
        },
        team: {
          red: {
            DEFAULT: '#e11d48',
            dark: '#be123c',
            light: '#fb7185',
            bg: 'rgba(225, 29, 72, 0.15)',
            border: 'rgba(225, 29, 72, 0.4)'
          },
          blue: {
            DEFAULT: '#0284c7',
            dark: '#0369a1',
            light: '#38bdf8',
            bg: 'rgba(2, 132, 199, 0.15)',
            border: 'rgba(2, 132, 199, 0.4)'
          },
          green: {
            DEFAULT: '#059669',
            dark: '#047857',
            light: '#34d399',
            bg: 'rgba(5, 150, 105, 0.15)',
            border: 'rgba(5, 150, 105, 0.4)'
          },
          yellow: {
            DEFAULT: '#d97706',
            dark: '#b45309',
            light: '#fbbf24',
            bg: 'rgba(217, 119, 6, 0.15)',
            border: 'rgba(217, 119, 6, 0.4)'
          }
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}

