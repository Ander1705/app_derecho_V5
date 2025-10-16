import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    // CAMBIO CRÍTICO: Desactivar minificación problemática
    minify: false,  // CAMBIAR de 'esbuild' a false
    sourcemap: true, // Activar para debug
    target: 'es2015',
    outDir: 'dist'
  },
  esbuild: {
    // Mantener nombres de variables
    keepNames: true,
    minifyIdentifiers: false,
    minifySyntax: false,
    minifyWhitespace: false
  }
})