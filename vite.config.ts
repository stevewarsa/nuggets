import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Determine if we're in production mode
  const isProd = mode === 'production';

  return {
    plugins: [react()],
    base: isProd ? '/nuggets/' : '/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true
    },
    server: {
      proxy: {
        '/bible': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          secure: false,
          ws: true, // If using WebSockets
          rewrite: (path) => path.replace(/^\/bible/, '/bible'), // Optional path rewrite
        }
      }
    }
  }
})