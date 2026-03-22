/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  corePlugins: {
    // Keep existing global CSS behavior intact during gradual migration.
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Iowan Old Style"', 'Palatino Linotype', '"Book Antiqua"', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
