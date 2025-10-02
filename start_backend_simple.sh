#!/bin/bash

echo "🚀 Iniciando backend del Consultorio Jurídico..."

# Cambiar al directorio del backend
cd /home/anderson/Escritorio/app_derecho_V3-main/go-backend

# Verificar que Go está instalado
if ! command -v go &> /dev/null; then
    echo "❌ Go no está instalado"
    exit 1
fi

echo "✅ Go está disponible: $(go version)"

# Limpiar y descargar dependencias
echo "📦 Instalando dependencias..."
go mod tidy
if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias"
    exit 1
fi

# Construir el proyecto
echo "🔨 Construyendo el proyecto..."
go build -o main cmd/main.go
if [ $? -ne 0 ]; then
    echo "❌ Error construyendo el proyecto"
    exit 1
fi

echo "✅ Proyecto construido exitosamente"

# Intentar ejecutar con la configuración por defecto
echo "🎯 Ejecutando servidor backend..."
echo "📍 URL: http://localhost:8000"
echo "💊 Health: http://localhost:8000/health"
echo "🔑 Login: http://localhost:8000/api/auth/login"
echo ""
echo "Para detener el servidor, presiona Ctrl+C"
echo ""

# Ejecutar el servidor
./main