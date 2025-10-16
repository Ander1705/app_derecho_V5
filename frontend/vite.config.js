import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: false,
    target: 'es2015',
    
    rollupOptions: {
      output: {
        // 🚨 SOLO inlineDynamicImports - NO manualChunks
        inlineDynamicImports: true,
        
        // Archivos simples
        entryFileNames: 'index.js',
        assetFileNames: '[name].[ext]',
        
        // Formato básico
        format: 'es'
      },
      
      // Sin optimizaciones
      treeshake: false,
    },
    
    chunkSizeWarningLimit: 10000,
    cssCodeSplit: false,
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
  
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})