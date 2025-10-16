#!/bin/bash

echo "🔍 === DIAGNÓSTICO DE PRODUCCIÓN SERVICIOUCMC.ONLINE ==="
echo ""

# Test 1: Conectividad básica
echo "1️⃣ Verificando conectividad al dominio..."
if ping -c 3 servicioucmc.online > /dev/null 2>&1; then
    echo "✅ Dominio servicioucmc.online responde"
else
    echo "❌ Dominio servicioucmc.online NO responde"
fi
echo ""

# Test 2: Verificar servidor web principal
echo "2️⃣ Verificando servidor web principal..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://servicioucmc.online/ 2>/dev/null || echo "000")
echo "📡 Status HTTPS principal: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Servidor web principal funcionando"
else
    echo "❌ Servidor web principal con problemas"
fi
echo ""

# Test 3: Verificar endpoint API base
echo "3️⃣ Verificando endpoint API base..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://servicioucmc.online/api/ 2>/dev/null || echo "000")
echo "📡 Status API base: $API_STATUS"

if [ "$API_STATUS" = "200" ] || [ "$API_STATUS" = "404" ]; then
    echo "✅ API endpoint responde (esperado 200 o 404)"
else
    echo "❌ API endpoint NO responde"
fi
echo ""

# Test 4: Verificar endpoint específicos críticos
echo "4️⃣ Verificando endpoints críticos..."

# Login endpoint
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://servicioucmc.online/api/auth/login 2>/dev/null || echo "000")
echo "🔐 /api/auth/login: $LOGIN_STATUS"

# Health check si existe
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://servicioucmc.online/api/health 2>/dev/null || echo "000")
echo "💚 /api/health: $HEALTH_STATUS"

# Profesor controles
PROF_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://servicioucmc.online/api/profesor/controles-asignados 2>/dev/null || echo "000")
echo "👨‍🏫 /api/profesor/controles-asignados: $PROF_STATUS"

echo ""

# Test 5: Verificar headers de respuesta
echo "5️⃣ Verificando headers de respuesta API..."
curl -s -I https://servicioucmc.online/api/auth/login 2>/dev/null | head -5
echo ""

# Test 6: Verificar CORS
echo "6️⃣ Verificando configuración CORS..."
CORS_RESPONSE=$(curl -s -H "Origin: https://servicioucmc.online" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: Content-Type,Authorization" -X OPTIONS https://servicioucmc.online/api/auth/login 2>/dev/null)
echo "🌐 Respuesta CORS OPTIONS:"
echo "$CORS_RESPONSE"
echo ""

# Test 7: Verificar certificado SSL
echo "7️⃣ Verificando certificado SSL..."
SSL_INFO=$(echo | openssl s_client -servername servicioucmc.online -connect servicioucmc.online:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Certificado SSL válido:"
    echo "$SSL_INFO"
else
    echo "❌ Problemas con certificado SSL"
fi
echo ""

# Test 8: Verificar configuración DNS
echo "8️⃣ Verificando configuración DNS..."
nslookup servicioucmc.online
echo ""

echo "🔍 === FIN DEL DIAGNÓSTICO ==="
echo ""
echo "💡 INSTRUCCIONES:"
echo "1. Si el dominio no responde → Verificar servidor/hosting"
echo "2. Si API endpoints dan 000 → Verificar backend Go en el servidor"
echo "3. Si CORS falla → Verificar configuración CORS en Go backend"
echo "4. Si SSL falla → Verificar certificado del servidor"
echo ""
echo "🚀 PRÓXIMOS PASOS RECOMENDADOS:"
echo "- Verificar que el backend Go esté ejecutándose en el servidor"
echo "- Revisar logs del servidor en /var/log/"
echo "- Verificar configuración de Nginx/Apache"
echo "- Comprobar conexión a base de datos PostgreSQL"