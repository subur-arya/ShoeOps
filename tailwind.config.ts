import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0d0d0d',
          2: '#1f1f1f',
          3: '#525252',
          4: '#8a8a8a',
          5: '#c0bdb8',
        },
        bg: {
          DEFAULT: '#f5f4f1',
          2: '#eceae6',
          3: '#dddbd5',
        },
        accent: {
          DEFAULT: '#d4510c',
          hover: '#b84309',
          soft: '#fdf0ea',
          mid: '#e8784a',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '16px',
        xl: '22px',
      },
      boxShadow: {
        DEFAULT: '0 1px 3px rgba(0,0,0,.05), 0 4px 12px rgba(0,0,0,.04)',
        md: '0 6px 24px rgba(0,0,0,.09)',
        lg: '0 20px 56px rgba(0,0,0,.15)',
      },
    },
  },
  plugins: [],
}
export default config
