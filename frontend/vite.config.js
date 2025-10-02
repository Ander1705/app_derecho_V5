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
    sourcemap: false,
    // Optimizaciones de build
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      }
    },
    rollupOptions: {
      output: {
        // Separar vendors para mejor caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react', 'lucide-react'],
          http: ['axios']
        },
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
    // Targets optimizados para mejor compatibilidad
    target: ['es2020', 'chrome60', 'firefox60', 'safari11', 'edge18']
  },
  // Optimizar resolución de módulos
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // Optimizar CSS
  css: {
    devSourcemap: false,
    postcss: {
      plugins: [
        // CSS optimization será agregado automáticamente por Tailwind
      ]
    }
  },
  // Optimizaciones para desarrollo
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      '@headlessui/react',
      '@heroicons/react',
      'lucide-react'
    ]
  },
  // Variables de entorno
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})
