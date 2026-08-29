import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    // Google AI Studio exposes the preview through HTTPS. Keep HMR on the
    // same public origin and force the browser-side socket to use WSS/443.
    // The actual websocket server is attached to our Node HTTP server in
    // server.ts, so HTTP and HMR share the same proxied endpoint.
    hmr: {
      protocol: 'wss',
      clientPort: 443,
      overlay: false,
    },
  },
}));
