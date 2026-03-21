/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  corePlugins: {
    // Keep existing global CSS behavior intact during gradual migration.
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
