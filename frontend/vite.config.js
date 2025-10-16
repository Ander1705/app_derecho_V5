import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    // CONFIGURACIONES para evitar problemas de minificación
    minify: 'esbuild',
    target: 'es2015',
    sourcemap: false, // Desactivar sourcemaps en producción
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendors para evitar conflictos
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['axios']
        }
      }
    },
    // Evitar problemas con variables temporales
    esbuild: {
      keepNames: true,
      legalComments: 'none'
    }
  },
  // Agregar para producción
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
})