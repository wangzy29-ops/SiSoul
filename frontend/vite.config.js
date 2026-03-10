import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8899,
    strictPort: true,
    host: '0.0.0.0'
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'calendar': ['fullcalendar', '@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  }
})
