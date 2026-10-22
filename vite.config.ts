/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Two builds:
//  - `npm run build`          → dist/ for GitHub Pages. base './' makes it work from
//                               any folder, e.g. /ortho-k-fitting-assistant/.
//  - `npm run build:offline`  → offline/ : the whole app inlined into ONE .html file
//                               that opens by double-click with no internet
//                               (for places where the website can't be reached).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'offline' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'offline' ? { outDir: 'offline', emptyOutDir: true } : undefined,
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
