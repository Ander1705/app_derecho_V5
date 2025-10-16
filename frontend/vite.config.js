import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // Configuración mínima sin transformaciones
    })
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    // CONFIGURACIÓN NUCLEAR - UN SOLO ARCHIVO GIGANTE
    outDir: 'dist',
    sourcemap: false,
    minify: false,
    target: 'es2015',
    
    // ROLLUP CONFIGURADO PARA ARCHIVO ÚNICO
    rollupOptions: {
      // NO external dependencies
      external: [],
      
      // FORZAR TODO EN UN SOLO ARCHIVO
      output: {
        // CRÍTICO: Función que fuerza todo en index
        manualChunks: () => 'index',
        
        // Inline EVERYTHING
        inlineDynamicImports: true,
        
        // NO tree shaking que pueda causar problemas
        // preserveModules: false,
        
        // Nombres fijos
        entryFileNames: 'index.js',
        chunkFileNames: 'index.js',
        assetFileNames: '[name].[ext]',
        
        // Formato simple
        format: 'iife',
        name: 'App'
      },
      
      // Deshabilitar optimizaciones que causen problemas
      treeshake: false,
    },
    
    // Límite muy alto
    chunkSizeWarningLimit: 10000,
    
    // Deshabilitar todo lo que pueda crear chunks
    cssCodeSplit: false,
    
    // Configuración de assets simple
    assetsInlineLimit: 0,
  },
  
  // NO optimizar dependencias
  optimizeDeps: {
    disabled: 'build',
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
  
  // Variables mínimas
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})