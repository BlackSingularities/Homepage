import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.API_URL || 'http://localhost:3001'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: parseInt(process.env.PORT) || 5173,
    strictPort: false,
    // changeOrigin stays off so the Host header keeps matching the browser's
    // Origin — the API rejects cross-origin writes exactly like in production.
    proxy: {
      '/api': { target: apiTarget, changeOrigin: false },
      '/uploads': { target: apiTarget, changeOrigin: false },
    },
  },
})
