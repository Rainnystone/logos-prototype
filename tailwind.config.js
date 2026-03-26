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
        mono: ['"JetBrains Mono"', '"Space Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['"Space Grotesk"', '"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Iowan Old Style"', 'Palatino Linotype', '"Book Antiqua"', 'serif'],
      },
      colors: {
        brutal: {
          black: '#000000',
          white: '#ffffff',
          accent: '#00ff00',
          gray: '#e5e5e5',
          surface: '#f5f5f5',
        },
      },
      boxShadow: {
        brutal: '4px 4px 0 #000000',
        'brutal-sm': '2px 2px 0 #000000',
      },
    },
  },
  plugins: [],
};
