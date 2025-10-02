#!/bin/bash

# ==============================================================================
# HEALTH CHECK AUTOMATIZADO - Consultorio Jurídico UCMC
# Desarrollador: Anderson Felipe Montaña Castelblanco
# Monitoreo completo del sistema optimizado
# ==============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para log
log() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Banner
echo -e "${PURPLE}"
echo "=============================================================================="
echo "  HEALTH CHECK - CONSULTORIO JURÍDICO UCMC"
echo "  Verificación completa del sistema optimizado"
echo "=============================================================================="
echo -e "${NC}"

# Variables
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"
ERRORS=0

# Función para verificar servicio HTTP
check_http_service() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    log "Verificando $name..."
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        success "$name está respondiendo correctamente"
        return 0
    else
        error "$name no está respondiendo"
        ((ERRORS++))
        return 1
    fi
}

# Función para verificar contenedor Docker
check_docker_container() {
    local container_name=$1
    
    log "Verificando contenedor $container_name..."
    
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name.*Up"; then
        success "Contenedor $container_name está ejecutándose"
        return 0
    else
        error "Contenedor $container_name no está ejecutándose"
        ((ERRORS++))
        return 1
    fi
}

# Función para verificar base de datos
check_database() {
    log "Verificando base de datos PostgreSQL..."
    
    if docker-compose exec -T postgres pg_isready -U app_derecho_user -d app_derecho_db > /dev/null 2>&1; then
        success "Base de datos PostgreSQL está disponible"
        
        # Verificar conexiones activas
        local connections=$(docker-compose exec -T postgres psql -U app_derecho_user -d app_derecho_db -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tr -d ' ')
        log "Conexiones activas: $connections"
        
        return 0
    else
        error "Base de datos PostgreSQL no está disponible"
        ((ERRORS++))
        return 1
    fi
}

# Función para verificar Redis
check_redis() {
    log "Verificando Redis..."
    
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        success "Redis está disponible"
        
        # Verificar memoria utilizada
        local memory=$(docker-compose exec -T redis redis-cli info memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
        log "Memoria Redis utilizada: $memory"
        
        return 0
    else
        error "Redis no está disponible"
        ((ERRORS++))
        return 1
    fi
}

# Función para verificar espacio en disco
check_disk_space() {
    log "Verificando espacio en disco..."
    
    local usage=$(df . | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 80 ]; then
        success "Espacio en disco: $usage% utilizado"
    elif [ "$usage" -lt 90 ]; then
        warning "Espacio en disco: $usage% utilizado (advertencia)"
    else
        error "Espacio en disco: $usage% utilizado (crítico)"
        ((ERRORS++))
    fi
}

# Función para verificar memoria
check_memory() {
    log "Verificando memoria del sistema..."
    
    local memory_info=$(free | awk 'NR==2{printf "%.1f", $3/$2*100}')
    local memory_usage=${memory_info%.*}
    
    if [ "$memory_usage" -lt 80 ]; then
        success "Uso de memoria: $memory_usage%"
    elif [ "$memory_usage" -lt 90 ]; then
        warning "Uso de memoria: $memory_usage% (advertencia)"
    else
        error "Uso de memoria: $memory_usage% (crítico)"
        ((ERRORS++))
    fi
}

# Función para verificar logs de errores
check_error_logs() {
    log "Verificando logs de errores recientes..."
    
    # Verificar errores en backend (últimos 5 minutos)
    local backend_errors=$(docker-compose logs --since=5m backend 2>/dev/null | grep -i "error\|fatal\|panic" | wc -l)
    
    if [ "$backend_errors" -eq 0 ]; then
        success "No hay errores recientes en backend"
    else
        warning "Se encontraron $backend_errors errores recientes en backend"
    fi
}

# Función para verificar endpoints específicos
check_api_endpoints() {
    log "Verificando endpoints específicos del API..."
    
    # Health endpoint
    if check_http_service "API Health" "$BACKEND_URL/health"; then
        # Verificar respuesta JSON
        local health_response=$(curl -s "$BACKEND_URL/health" | jq -r '.status' 2>/dev/null || echo "")
        if [ "$health_response" = "OK" ]; then
            success "Health endpoint retorna estado OK"
        else
            warning "Health endpoint no retorna estado OK esperado"
        fi
    fi
    
    # Cache stats (solo en desarrollo)
    local cache_stats=$(curl -s "$BACKEND_URL/debug/cache" 2>/dev/null | jq -r '.cache_stats.hits' 2>/dev/null || echo "N/A")
    if [ "$cache_stats" != "N/A" ]; then
        log "Cache hits: $cache_stats"
    fi
}

# Ejecutar todas las verificaciones
echo "Iniciando verificaciones del sistema..."
echo ""

# 1. Verificar contenedores Docker
check_docker_container "consultorio-postgres"
check_docker_container "consultorio-redis"
check_docker_container "consultorio-backend"
check_docker_container "consultorio-frontend"

echo ""

# 2. Verificar servicios de base de datos
check_database
check_redis

echo ""

# 3. Verificar servicios HTTP
check_http_service "Backend API" "$BACKEND_URL/health"
check_http_service "Frontend" "$FRONTEND_URL/health"

echo ""

# 4. Verificar endpoints específicos
check_api_endpoints

echo ""

# 5. Verificar recursos del sistema
check_disk_space
check_memory

echo ""

# 6. Verificar logs
check_error_logs

echo ""

# Resumen final
echo -e "${PURPLE}"
echo "=============================================================================="
echo "  RESUMEN DEL HEALTH CHECK"
echo "=============================================================================="
echo -e "${NC}"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ SISTEMA SALUDABLE${NC}"
    echo "  Todos los servicios están funcionando correctamente"
    echo "  No se encontraron problemas críticos"
else
    echo -e "${RED}✗ PROBLEMAS DETECTADOS${NC}"
    echo "  Se encontraron $ERRORS problema(s) que requieren atención"
    echo "  Revise los errores reportados arriba"
fi

echo ""
echo "Información adicional del sistema:"
echo "  - Contenedores activos: $(docker-compose ps --services | wc -l)"
echo "  - Uptime del sistema: $(uptime -p 2>/dev/null || echo 'N/A')"
echo "  - Hora actual: $(date)"

echo ""
echo "Para más información detallada:"
echo "  - Logs backend: ${BLUE}docker-compose logs -f backend${NC}"
echo "  - Logs frontend: ${BLUE}docker-compose logs -f frontend${NC}"
echo "  - Estado contenedores: ${BLUE}docker-compose ps${NC}"
echo "  - Estadísticas Docker: ${BLUE}docker stats${NC}"

echo -e "${CYAN}Health check completado$(date +'%Y-%m-%d %H:%M:%S')${NC}"

# Exit con código de error si hay problemas
exit $ERRORS