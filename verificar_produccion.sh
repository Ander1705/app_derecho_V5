#!/bin/bash
# Script de verificación para producción VPS
# Ejecutar DESPUÉS del rebuild para confirmar funcionamiento

echo "🔍 VERIFICACIÓN COMPLETA DEL SISTEMA EN PRODUCCIÓN"
echo "================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar servicios
check_service() {
    local service_name=$1
    local url=$2
    
    echo -n "📋 Verificando $service_name... "
    
    if curl -f -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ ERROR${NC}"
        return 1
    fi
}

# 1. Verificar contenedores
echo "🐳 ESTADO DE CONTENEDORES"
echo "-------------------------"
docker-compose -f docker-compose.simple.yml ps
echo ""

# 2. Verificar health checks
echo "🏥 HEALTH CHECKS"
echo "----------------"
check_service "Backend" "http://localhost:8000/health"
check_service "Frontend" "http://localhost:3000/health"
echo ""

# 3. Verificar base de datos
echo "🗄️ BASE DE DATOS"
echo "----------------"
echo -n "📋 Conectividad PostgreSQL... "
if docker exec consultorio-postgres pg_isready -U app_derecho_user -d app_derecho_db > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
    
    # Contar registros
    echo -n "📋 Verificando datos... "
    USER_COUNT=$(docker exec consultorio-postgres psql -U app_derecho_user -d app_derecho_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
    CONTROL_COUNT=$(docker exec consultorio-postgres psql -U app_derecho_user -d app_derecho_db -t -c "SELECT COUNT(*) FROM control_operativos;" 2>/dev/null | tr -d ' ')
    
    if [[ "$USER_COUNT" -gt 0 ]] && [[ "$CONTROL_COUNT" -gt 0 ]]; then
        echo -e "${GREEN}✅ OK${NC} (Users: $USER_COUNT, Controles: $CONTROL_COUNT)"
    else
        echo -e "${YELLOW}⚠️ DATOS VACÍOS${NC}"
    fi
else
    echo -e "${RED}❌ ERROR${NC}"
fi
echo ""

# 4. Verificar API endpoints
echo "🌐 ENDPOINTS API"
echo "----------------"
check_service "API Auth (GET)" "http://localhost:8000/api/auth/validate"
check_service "API Health" "http://localhost:8000/api/health"
echo ""

# 5. Verificar puertos
echo "🔌 PUERTOS DE SERVICIOS"
echo "-----------------------"
echo -n "📋 Puerto 8000 (Backend)... "
if netstat -tulpn 2>/dev/null | grep -q ":8000 " || ss -tulpn 2>/dev/null | grep -q ":8000 "; then
    echo -e "${GREEN}✅ ACTIVO${NC}"
else
    echo -e "${RED}❌ INACTIVO${NC}"
fi

echo -n "📋 Puerto 3000 (Frontend)... "
if netstat -tulpn 2>/dev/null | grep -q ":3000 " || ss -tulpn 2>/dev/null | grep -q ":3000 "; then
    echo -e "${GREEN}✅ ACTIVO${NC}"
else
    echo -e "${RED}❌ INACTIVO${NC}"
fi

echo -n "📋 Puerto 5432 (PostgreSQL)... "
if netstat -tulpn 2>/dev/null | grep -q ":5433 " || ss -tulpn 2>/dev/null | grep -q ":5433 "; then
    echo -e "${GREEN}✅ ACTIVO${NC}"
else
    echo -e "${RED}❌ INACTIVO${NC}"
fi
echo ""

# 6. Verificar logs recientes
echo "📝 LOGS RECIENTES"
echo "-----------------"
echo "🔍 Últimas líneas de cada servicio:"
echo ""
echo "--- BACKEND ---"
docker-compose -f docker-compose.simple.yml logs --tail=3 backend 2>/dev/null || echo "No logs disponibles"
echo ""
echo "--- FRONTEND ---"
docker-compose -f docker-compose.simple.yml logs --tail=3 frontend 2>/dev/null || echo "No logs disponibles"
echo ""
echo "--- POSTGRES ---"
docker-compose -f docker-compose.simple.yml logs --tail=3 postgres 2>/dev/null || echo "No logs disponibles"
echo ""

# 7. Verificar espacio en disco
echo "💾 RECURSOS DEL SISTEMA"
echo "-----------------------"
echo "📋 Espacio en disco:"
df -h / | tail -1
echo ""
echo "📋 Memoria:"
free -h | head -2
echo ""
echo "📋 Uso de CPU/Memoria por contenedores:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null || echo "No se pudo obtener estadísticas"
echo ""

# 8. Resumen final
echo "📊 RESUMEN FINAL"
echo "================"

# Contar servicios OK
services_ok=0
total_services=2

if curl -f -s "http://localhost:8000/health" > /dev/null 2>&1; then
    ((services_ok++))
fi

if curl -f -s "http://localhost:3000/health" > /dev/null 2>&1; then
    ((services_ok++))
fi

if [[ $services_ok -eq $total_services ]]; then
    echo -e "${GREEN}✅ SISTEMA FUNCIONANDO CORRECTAMENTE${NC}"
    echo "🎯 Todos los servicios están operativos"
    echo ""
    echo "🌐 URLs de acceso:"
    echo "   Frontend: https://servicioucmc.online"
    echo "   Backend API: https://servicioucmc.online/api"
    echo ""
    echo "📊 Para monitoreo continuo:"
    echo "   docker-compose -f docker-compose.simple.yml logs -f"
else
    echo -e "${RED}❌ PROBLEMAS DETECTADOS${NC}"
    echo "🔧 Servicios funcionando: $services_ok/$total_services"
    echo ""
    echo "🆘 Acciones recomendadas:"
    echo "   1. Revisar logs: docker-compose logs"
    echo "   2. Reiniciar servicios: docker-compose restart"
    echo "   3. Rebuild completo: ./rebuild_simple.sh"
fi

echo ""
echo "🕐 Verificación completada: $(date)"