import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    // 0.0.0.0 so phones on the same WiFi (and tunnels like cloudflared) can reach
    // the dev server. Locked to localhost by default in Vite.
    host: true,
    port: 5173,
  },
});
