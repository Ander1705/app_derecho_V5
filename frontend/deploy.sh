#!/bin/bash

# Script de despliegue optimizado para producción
# Corrige todos los errores de dependencias circulares

echo "🚀 INICIANDO DESPLIEGUE OPTIMIZADO PARA PRODUCCIÓN"

# 1. Limpiar builds anteriores
echo "🧹 Limpiando builds anteriores..."
rm -rf dist/
rm -rf node_modules/.vite/

# 2. Limpiar cache de npm
echo "🗑️ Limpiando cache de npm..."
npm cache clean --force

# 3. Reinstalar dependencias con exactitud
echo "📦 Reinstalando dependencias..."
rm -rf node_modules/
npm ci --production=false

# 4. Build para producción con variables optimizadas
echo "🔨 Construyendo para producción..."
NODE_ENV=production npm run build

# 5. Verificar integridad del build
echo "✅ Verificando integridad del build..."
if [ -f "dist/index.html" ]; then
    echo "✅ Build exitoso - index.html encontrado"
    echo "📊 Tamaños de archivos:"
    ls -lh dist/assets/js/ | head -10
    echo "📊 Total del build:"
    du -sh dist/
else
    echo "❌ ERROR: Build falló - index.html no encontrado"
    exit 1
fi

# 6. Optimizaciones adicionales para despliegue
echo "🎯 Aplicando optimizaciones finales..."

# Crear archivo .htaccess para Apache si no existe
if [ ! -f "dist/.htaccess" ]; then
cat > dist/.htaccess << 'EOL'
# Configuración para SPA React
RewriteEngine On
RewriteBase /

# Handle Angular and React routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Cache control para assets estáticos
<filesMatch "\.(css|js|png|jpg|jpeg|gif|svg|ico)$">
ExpiresActive On
ExpiresDefault "access plus 1 year"
</filesMatch>

# Compresión GZIP
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
EOL
    echo "✅ Archivo .htaccess creado"
fi

echo "🎉 DESPLIEGUE OPTIMIZADO COMPLETADO"
echo "📁 Archivos listos en: $(pwd)/dist/"
echo "🌐 Para desplegar, copia todo el contenido de dist/ a tu servidor web"