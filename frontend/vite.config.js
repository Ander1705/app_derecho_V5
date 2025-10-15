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
        // Separar vendors para mejor caching y evitar errores de inicialización
        manualChunks: (id) => {
          // React core debe cargarse primero
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-core'
          }
          // Router y navegación
          if (id.includes('react-router')) {
            return 'react-router'
          }
          // HTTP y API
          if (id.includes('axios')) {
            return 'http-client'
          }
          // UI Components
          if (id.includes('@heroicons') || id.includes('@headlessui') || id.includes('lucide-react')) {
            return 'ui-components'
          }
          // Otros vendors
          if (id.includes('node_modules')) {
            return 'vendors'
          }
          // Contextos críticos - separar para evitar dependencias circulares
          if (id.includes('contexts/AuthContext.jsx')) {
            return 'auth-context'
          }
          if (id.includes('contexts/ThemeContext.jsx')) {
            return 'theme-context'
          }
          // Components principales
          if (id.includes('components/')) {
            return 'components'
          }
          // Pages
          if (id.includes('pages/')) {
            return 'pages'
          }
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
    target: ['es2020', 'chrome60', 'firefox60', 'safari11', 'edge18'],
    // Configuración para evitar errores de inicialización
    cssCodeSplit: true,
    // Configuración experimental para tree shaking
    experimentalTreeShaking: true
  },
  // Optimizar resolución de módulos
  resolve: {
    alias: {
      '@': '/src'
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