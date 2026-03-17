import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#101828',
        shell: '#0b1220',
        accent: '#22c55e',
      },
    },
  },
  plugins: [],
} satisfies Config;
