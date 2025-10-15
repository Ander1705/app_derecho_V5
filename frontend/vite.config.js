import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // CONFIGURACIÓN MÍNIMA - Sin optimizaciones que puedan causar problemas
      babel: {
        plugins: [] // Sin plugins de babel en absoluto
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Completamente deshabilitado
    emptyOutDir: true,
    // CONFIGURACIÓN EXTREMA - Sin minificación para evitar problemas
    minify: false, // DESHABILITADO COMPLETAMENTE
    // Sin optimizaciones de esbuild
    esbuildOptions: {
      // Sin optimizaciones en absoluto
    },
    rollupOptions: {
      // Configuración para generar UN SOLO ARCHIVO
      output: {
        // FORZAR TODO EN UN SOLO ARCHIVO
        manualChunks: () => 'index', // Forzar todo en un solo chunk
        inlineDynamicImports: true, // Incluir importaciones dinámicas
        chunkFileNames: 'assets/js/[name].js', // Sin hash para evitar cache
        entryFileNames: 'assets/js/[name].js', // Sin hash
        assetFileNames: 'assets/[name][extname]' // Sin hash
      },
      // Configuración extrema para evitar dependencias circulares
      external: [], // No externalizar nada
      treeshake: false // Deshabilitar tree shaking
    },
    // Límite muy alto para evitar warnings
    chunkSizeWarningLimit: 5000,
    // Target más básico
    target: 'es2015',
    // Sin división de CSS
    cssCodeSplit: false // Todo el CSS en un archivo
  },
  // Resolución simplificada
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // DESHABILITAR optimizaciones de dependencias
  optimizeDeps: {
    disabled: true // COMPLETAMENTE DESHABILITADO
  },
  // Variables mínimas
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
})