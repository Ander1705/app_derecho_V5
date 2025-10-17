#!/bin/bash
# Archivo: fix_frontend_error.sh

echo "🔧 Aplicando correcciones al código fuente..."

cd /home/anderson/Escritorio/app_derecho_V3-main

# 1. Corregir vite.config.js para desactivar minificación
cat > frontend/vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    minify: false,  // DESACTIVADO para evitar el error
    sourcemap: false,
    target: 'es2015',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
})
EOF

# 2. Asegurar que el .env del frontend apunta a producción
echo "VITE_API_URL=https://servicioucmc.online/api" > frontend/.env.production
echo "VITE_API_URL=https://servicioucmc.online/api" > frontend/.env

# 3. Verificar que los cambios se aplicaron
echo "✅ Verificando cambios aplicados:"
grep "minify: false" frontend/vite.config.js && echo "✅ vite.config.js corregido"
grep "servicioucmc.online" frontend/.env && echo "✅ .env configurado"

echo "✅ Correcciones aplicadas al código fuente"