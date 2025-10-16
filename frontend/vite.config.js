import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: false, // 🚨 DESHABILITAR minificación para evitar errores
    rollupOptions: {
      output: {
        // 🚨 GENERAR UN SOLO ARCHIVO - Sin chunks separados
        manualChunks: undefined,
        inlineDynamicImports: true,
        // Nombres simples sin hash para debug
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      },
    },
    chunkSizeWarningLimit: 5000, // Aumentar límite para archivo grande
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})