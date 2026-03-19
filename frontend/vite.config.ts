import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Allow connections from your custom host
    host: true, // listens on all network interfaces
    allowedHosts: ['hzel.heliki.preview.hzel.org'],
    cors: {
      origin: ['https://hzel.heliki.preview.hzel.org'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    },
  },
});
