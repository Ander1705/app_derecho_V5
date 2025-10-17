#!/bin/bash
# Script para rebuild simple sin BuildKit

echo "🐳 REBUILD SIMPLE - Sin BuildKit"

cd /home/anderson/Escritorio/app_derecho_V3-main

# 1. Detener servicios actuales
echo "⏹️ Deteniendo servicios..."
docker-compose -f docker-compose.simple.yml down -v 2>/dev/null || echo "No había servicios corriendo"

# 2. Limpiar solo las imágenes del proyecto
echo "🧹 Limpiando imágenes del proyecto..."
docker images | grep -E "(consultorio|app_derecho)" | awk '{print $3}' | xargs -r docker rmi -f

# 3. Verificar código corregido
echo "📝 Verificando correcciones..."
if grep -q "minify: false" frontend/vite.config.js; then
    echo "✅ vite.config.js corregido"
else
    echo "❌ Aplicando corrección a vite.config.js"
    ./fix_frontend_error.sh
fi

# 4. Build con Docker Compose simple
echo "🔨 Construyendo con Docker Compose simple..."
docker-compose -f docker-compose.simple.yml build --no-cache

# 5. Iniciar servicios
echo "🚀 Iniciando servicios..."
docker-compose -f docker-compose.simple.yml up -d

# 6. Esperar inicio
echo "⏳ Esperando servicios..."
sleep 15

# 7. Verificar estado
echo "📋 Estado de servicios:"
docker-compose -f docker-compose.simple.yml ps

echo ""
echo "✅ Rebuild simple completado"
echo ""
echo "🔍 Verificar funcionamiento:"
echo "   curl http://localhost:8000/health"
echo "   curl http://localhost:3000/health"
echo ""
echo "📋 Ver logs:"
echo "   docker-compose -f docker-compose.simple.yml logs -f"