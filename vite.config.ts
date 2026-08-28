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
    // Google AI Studio runs the app behind an embedded proxy where the Vite
    // HMR websocket is not reliable. The server already restarts after edits,
    // so disabling HMR removes false websocket errors without affecting the app.
    hmr: false,
  },
}));
