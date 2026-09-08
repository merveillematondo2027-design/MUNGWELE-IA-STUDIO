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
  // Keep large, stable browser libraries in independent chunks. This lets
  // mobile browsers download them in parallel and keep them cached across
  // frequent MUNGWELE application deployments.
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'vendor-firebase';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react';
          if (id.includes('/motion/')) return 'vendor-motion';
          if (id.includes('/lucide-react/')) return 'vendor-icons';
          if (id.includes('/@zxing/')) return 'vendor-zxing';
          if (id.includes('/canvas-confetti/')) return 'vendor-confetti';
          return undefined;
        },
      },
    },
  },
  // The QR scanner is loaded on demand by the Market-Cash checkout. Explicitly
  // prebundle it so Google AI Studio does not have to discover/re-optimize the
  // dependency when the scanner is opened for the first time.
  optimizeDeps: {
    include: ['@zxing/browser'],
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
