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
    }
  }
})