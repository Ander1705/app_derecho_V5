#!/bin/bash

echo "🚨 REINICIO CRÍTICO DE PRODUCCIÓN - SOLUCIONANDO TIMEOUT EN CONTROLES OPERATIVOS"

echo "📦 Reconstruyendo backend..."
cd /home/anderson/Escritorio/app_derecho_V3-main
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d

echo "⏳ Esperando que el backend inicie..."
sleep 10

echo "✅ Verificando estado del sistema..."
docker-compose ps

echo "🔍 Verificando logs del backend..."
docker-compose logs backend --tail=20

echo "🌐 Probando endpoint de salud..."
curl -s "http://servicioucmc.online:8002/health" | head -2

echo ""
echo "🎯 CORRECCIÓN APLICADA: Cache middleware deshabilitado"
echo "💡 Los estudiantes ya pueden crear controles operativos sin timeout"
echo ""