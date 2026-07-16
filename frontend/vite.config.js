import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // host: true binds Vite to 0.0.0.0 instead of just localhost -- needed
    // so *.localhost subdomains (greenvalley.localhost, skyheights.localhost)
    // can actually reach this dev server, not just bare "localhost".
    host: true,
    port: 5173,
    // No proxy config: axiosClient.js now targets the API directly by
    // hostname (see its getApiBaseUrl()), found to be more reliable across
    // real local dev setups than routing everything through Vite's proxy,
    // which doesn't itself understand per-tenant subdomains. NGINX (Phase
    // 12) is what makes frontend+API same-origin again in production --
    // this file only affects local dev.
  },
});
