import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:5000', ws: true },
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600, // Allow slightly larger chunks
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core React - loaded first
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }
            // React Query - cached separately
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query'
            }
            // UI libraries - icons, animations, toast
            if (id.includes('lucide') || id.includes('framer-motion') || id.includes('react-hot-toast')) {
              return 'vendor-ui'
            }
            // Heavy charting - lazy loaded separately
            if (id.includes('recharts')) {
              return 'vendor-charts'
            }
            // AWS Amplify - lazy loaded for Cognito
            if (id.includes('aws-amplify') || id.includes('@aws-amplify')) {
              return 'vendor-aws'
            }
            return 'vendor-misc'
          }
        },
      },
    },
  },
})
