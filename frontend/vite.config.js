import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev proxy -- in production, NGINX (Phase 12) does this same
    // job at the reverse-proxy layer instead.
    proxy: {
      '/api/v1': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
