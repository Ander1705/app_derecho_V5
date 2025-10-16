import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CONFIGURACIÓN SIMPLE QUE FUNCIONA
export default defineConfig({
  plugins: [react()],
  
  build: {
    // Configuración básica
    outDir: 'dist',
    sourcemap: false,
    
    // FORZAR archivo único usando esta configuración que SÍ funciona
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})