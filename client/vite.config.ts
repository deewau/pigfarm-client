import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    allowedHosts: ['.local.lt'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/gifts': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/assets': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // No proxy for /ws - connect directly to server
    },
  },
})
