import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'lucide-react'],
          parsers: ['xlsx', 'pickleparser']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})
