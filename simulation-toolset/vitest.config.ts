import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Project root is one level up from simulation-toolset
const projectRoot = path.resolve(__dirname, '..');

export default defineConfig({
  plugins: [react()],
  root: projectRoot,
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src'),
      '@simulation': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['simulation-toolset/tests/**/*.test.ts'],
  },
});
