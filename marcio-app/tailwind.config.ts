import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand — Márcio Gonzalez
        gold: {
          light:   '#f0d372',
          DEFAULT: '#d8b64d',
          dark:    '#b8922e',
          darker:  '#8c6c1f',
        },
        brand: {
          black:   '#080808',
          950:     '#0d0d0d',
          900:     '#131313',
          800:     '#1a1a1a',
          700:     '#222222',
          600:     '#2e2e2e',
        },
        offwhite: '#f4efe3',
      },
      fontFamily: {
        syne:  ['var(--font-syne)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
        sans:  ['var(--font-inter)', 'sans-serif'],
      },
      borderColor: {
        gold: 'rgba(216,182,77,0.18)',
      },
    },
  },
  plugins: [],
}

export default config
