import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Optimizaciones de React
      babel: {
        plugins: [
          // Remover console.log en producción
          process.env.NODE_ENV === 'production' && 'transform-remove-console'
        ].filter(Boolean)
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
    emptyOutDir: true, // Limpiar directorio de salida
    // Minificación conservadora para evitar errores
    minify: 'esbuild', // Más estable que terser
    // Mantener algunas optimizaciones básicas
    esbuildOptions: {
      drop: ['console', 'debugger'],
    },
    rollupOptions: {
      output: {
        // CONFIGURACIÓN ULTRA-CONSERVADORA - Sin chunking manual para evitar errores
        manualChunks: undefined,
        // Nombres optimizados para cache
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.(gif|jpe?g|png|svg)$/.test(name ?? '')) {
            return 'assets/images/[name]-[hash][extname]'
          }
          if (/\.css$/.test(name ?? '')) {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    // Aumentar límite de chunk para evitar warnings
    chunkSizeWarningLimit: 1000,
    // Target conservador para mayor compatibilidad
    target: 'es2015',
    // Configuración estable para CSS
    cssCodeSplit: true
  },
  // Optimizar resolución de módulos
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // Optimizaciones para desarrollo y producción
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      '@headlessui/react',
      '@heroicons/react/24/outline',
      '@heroicons/react/24/solid'
    ],
    exclude: ['lucide-react'] // Excluir si causa problemas
  },
  // Variables de entorno
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})