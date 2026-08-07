import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Viteは既定でHostヘッダを検証し、知らないホスト名を拒否する（DNS再バインド対策）。
    // Tailscale Funnelなど外から見えるホスト名で開くときは、ここへ足す必要がある。
    // IPアドレスでのアクセスは既定で許可されるため、通常の開発では設定不要。
    allowedHosts: (process.env.DEV_ALLOWED_HOSTS ?? '')
      .split(',')
      .map((host) => host.trim())
      .filter((host) => host !== ''),
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
