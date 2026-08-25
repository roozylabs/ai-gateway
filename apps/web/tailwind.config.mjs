/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        background: '#0B0F17',
        card: '#121824',
        border: '#1E293B',
        primary: '#8B5CF6',
        accent: '#EC4899',
        cyan: '#06B6D4',
      },
    },
  },
  plugins: [],
};
