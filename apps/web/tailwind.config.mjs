/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        background: '#08090A',
        card: '#0F1115',
        border: '#1B1F27',
        primary: '#8B5CF6',
        cyan: '#06B6D4',
        console: '#0A0C10',
        'console-card': '#0D0F14',
      },
    },
  },
  plugins: [],
};
