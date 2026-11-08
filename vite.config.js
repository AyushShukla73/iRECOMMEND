import { defineConfig } from 'vite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env', override: true });

// Ports from env config
const VITE_PORT = parseInt(process.env.VITE_PORT, 10) || 5173;
const SERVER_PORT = parseInt(process.env.PORT, 10) || 60030;

console.log('[VITE] Config ports:', { VITE_PORT, SERVER_PORT });

export default defineConfig({
  root: 'client',
  server: {
    port: VITE_PORT,
    host: '127.0.0.1',
    strictPort: false, // Allow alternate ports if primary is in use
    watch: {
      usePolling: false
    },
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${SERVER_PORT}`,
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          let lastPort = SERVER_PORT;
          proxy.on('error', (err) => {
            console.error(`[VITE] Proxy error (${err.code}): ${err.message}`);
            // Try the next port in sequence
            const nextPort = lastPort + 1;
            if (nextPort <= lastPort + 5) {
              lastPort = nextPort;
              console.log(`[VITE] Trying proxy to port ${lastPort}`);
              options.target = `http://127.0.0.1:${lastPort}`;
            }
          });
        }
      }
    },
    // Windows TCP fix: enable port reuse
    ...(process.platform === 'win32' && {
      hmr: {
        clientPort: VITE_PORT
      }
    })
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  publicDir: 'public',
  base: '/'
});