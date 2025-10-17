#!/bin/bash
# Archivo: docker_rebuild_total.sh

echo "🐳 INICIANDO REBUILD TOTAL DE DOCKER..."

cd /home/anderson/Escritorio/app_derecho_V3-main

# 1. Detener todos los contenedores
echo "⏹️ Deteniendo contenedores..."
docker-compose down -v 2>/dev/null || echo "No había contenedores ejecutándose"

# 2. Limpiar Docker completamente
echo "🧹 Limpiando Docker cache..."
docker system prune -af --volumes
docker builder prune -af

# 3. Eliminar imágenes antiguas del proyecto
echo "🗑️ Eliminando imágenes antiguas..."
docker images | grep -E "(app_derecho|servicioucmc|ucmc)" | awk '{print $3}' | xargs -r docker rmi -f

# 4. Verificar que los cambios están en el código
echo "📥 Verificando cambios en el código..."
if grep -q "minify: false" frontend/vite.config.js; then
    echo "✅ vite.config.js tiene la corrección"
else
    echo "❌ vite.config.js NO tiene la corrección - ejecutando fix primero"
    ./fix_frontend_error.sh
fi

# 5. Reconstruir desde cero
echo "🔨 Construyendo nuevas imágenes..."
export REBUILD_FLAG=$(date +%s)
docker-compose build --no-cache --force-rm

# 6. Iniciar servicios
echo "🚀 Iniciando servicios..."
docker-compose up -d

# 7. Esperar un momento para que los servicios inicien
echo "⏳ Esperando que los servicios inicien..."
sleep 10

# 8. Ver status de contenedores
echo "📋 Estado de contenedores:"
docker ps

# 9. Ver logs iniciales
echo "📋 Mostrando logs iniciales..."
docker-compose logs --tail=20

echo ""
echo "✅ Rebuild completado. Para ver logs en tiempo real:"
echo "   docker-compose logs -f"
echo ""
echo "🔍 Para verificar funcionamiento:"
echo "   curl http://localhost:8000/health"
echo "   curl http://localhost:80"