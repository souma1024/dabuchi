import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // findBy/waitForの上限（setup.tsのasyncUtilTimeout）より長くする。
    // 同じ値だと、待ち切る前にtest自体が打ち切られ、原因の分からない
    // 「Test timed out」になる。
    testTimeout: 15_000,
  },
});
