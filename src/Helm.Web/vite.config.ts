import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5030',
      '/health': 'http://localhost:5030',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
