#!/bin/bash

# ==============================================================================
# SCRIPT DE SETUP PARA PRODUCCIÓN - Consultorio Jurídico UCMC
# Desarrollador: Anderson Felipe Montaña Castelblanco
# Prepara el entorno optimizado para producción
# ==============================================================================

set -e  # Detener en caso de error

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
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Banner
echo -e "${PURPLE}"
echo "=============================================================================="
echo "  SETUP OPTIMIZADO - CONSULTORIO JURÍDICO UCMC"
echo "  Configuración para máximo rendimiento en producción"
echo "=============================================================================="
echo -e "${NC}"

# Verificar permisos
if [[ $EUID -eq 0 ]]; then
   error "Este script no debe ejecutarse como root"
   exit 1
fi

# Verificar Docker
log "Verificando Docker..."
if ! command -v docker &> /dev/null; then
    error "Docker no está instalado. Por favor instale Docker primero."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose no está instalado. Por favor instale Docker Compose primero."
    exit 1
fi

success "Docker y Docker Compose están disponibles"

# Crear estructura de directorios optimizada
log "Creando estructura de directorios..."

# Directorios principales
mkdir -p storage/{postgres_data,redis_data,uploads,logs}
mkdir -p storage/{postgres_backups,redis_config,nginx_logs,nginx_cache,prometheus_data}
mkdir -p nginx/{sites-available,ssl}
mkdir -p monitoring

# Directorios de desarrollo
mkdir -p logs/{backend,frontend,postgres,redis,nginx}
mkdir -p backups/{daily,weekly,monthly}

# Configurar permisos optimizados
log "Configurando permisos..."
chmod -R 755 storage/
chmod -R 700 storage/postgres_data/ 2>/dev/null || true
chmod -R 755 storage/uploads/
chmod -R 755 storage/logs/

success "Estructura de directorios creada"

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    log "Creando archivo .env desde .env.example..."
    cp .env.example .env
    warning "IMPORTANTE: Edita el archivo .env con tus configuraciones reales"
    warning "Especialmente las credenciales SMTP y contraseñas de seguridad"
else
    warning "El archivo .env ya existe, no se sobrescribirá"
fi

# Crear configuración de Redis
log "Creando configuración de Redis..."
cat > storage/redis_config/redis.conf << 'EOF'
# Configuración optimizada de Redis para Consultorio Jurídico UCMC
bind 0.0.0.0
protected-mode yes
port 6379
timeout 300
tcp-keepalive 60
databases 16
save 900 1
save 300 10
save 60 10000
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
lua-time-limit 5000
slowlog-log-slower-than 10000
slowlog-max-len 128
latency-monitor-threshold 100
notify-keyspace-events ""
EOF

# Crear configuración básica de monitoreo
log "Creando configuración de Prometheus..."
cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'consultorio-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'consultorio-postgres'
    static_configs:
      - targets: ['postgres:5432']
    scrape_interval: 30s

  - job_name: 'consultorio-redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s
EOF

# Crear script de backup automatizado
log "Creando script de backup..."
cat > scripts/backup_database.sh << 'EOF'
#!/bin/bash
# Script de backup automatizado para base de datos

BACKUP_DIR="./backups/$(date +%Y%m)"
FILENAME="backup_$(date +%Y%m%d_%H%M%S).sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Iniciando backup de base de datos..."
docker-compose exec -T postgres pg_dump -U app_derecho_user app_derecho_db | gzip > "$BACKUP_DIR/$FILENAME"

if [ $? -eq 0 ]; then
    echo "Backup completado: $BACKUP_DIR/$FILENAME"
    
    # Eliminar backups antiguos (mantener últimos 30 días)
    find ./backups -name "*.sql.gz" -mtime +30 -delete
else
    echo "Error durante el backup"
    exit 1
fi
EOF

chmod +x scripts/backup_database.sh 2>/dev/null || true

# Crear script de optimización
log "Creando script de optimización..."
cat > scripts/optimize_system.sh << 'EOF'
#!/bin/bash
# Script de optimización del sistema

echo "Aplicando optimizaciones de base de datos..."
docker-compose exec postgres psql -U app_derecho_user -d app_derecho_db -f /docker-entrypoint-initdb.d/01-optimize.sql

echo "Limpiando cache de Redis..."
docker-compose exec redis redis-cli FLUSHALL

echo "Reiniciando servicios para aplicar optimizaciones..."
docker-compose restart backend frontend

echo "Optimización completada"
EOF

chmod +x scripts/optimize_system.sh 2>/dev/null || true

# Crear .gitignore optimizado
log "Actualizando .gitignore..."
cat >> .gitignore << 'EOF'

# ==============================================================================
# Archivos de producción y optimización
# ==============================================================================

# Variables de entorno
.env
.env.local
.env.production
.env.staging

# Datos persistentes
storage/postgres_data/
storage/redis_data/
storage/uploads/
storage/logs/
logs/
backups/

# Cache y temporales
storage/nginx_cache/
storage/prometheus_data/
temp/
*.tmp

# SSL y certificados
nginx/ssl/
*.key
*.crt
*.pem

# Monitoreo
monitoring/data/

# Docker
.docker/
EOF

# Verificar configuración de Docker
log "Verificando configuración de Docker..."
if docker info > /dev/null 2>&1; then
    success "Docker está ejecutándose correctamente"
else
    error "Docker no está ejecutándose. Inicie Docker primero."
    exit 1
fi

# Mostrar información del sistema
log "Información del sistema:"
echo "  - Docker version: $(docker --version)"
echo "  - Docker Compose version: $(docker-compose --version)"
echo "  - Espacio disponible: $(df -h . | awk 'NR==2 {print $4}')"
echo "  - Memoria disponible: $(free -h | awk 'NR==2{print $7}')"

# Instrucciones finales
echo -e "${GREEN}"
echo "=============================================================================="
echo "  SETUP COMPLETADO EXITOSAMENTE"
echo "=============================================================================="
echo -e "${NC}"

echo -e "${YELLOW}PRÓXIMOS PASOS:${NC}"
echo "1. Editar el archivo .env con tus configuraciones:"
echo "   ${BLUE}nano .env${NC}"
echo ""
echo "2. Para desarrollo, ejecutar:"
echo "   ${BLUE}docker-compose up -d postgres redis backend frontend${NC}"
echo ""
echo "3. Para producción completa:"
echo "   ${BLUE}docker-compose --profile production up -d${NC}"
echo ""
echo "4. Para monitoreo:"
echo "   ${BLUE}docker-compose --profile monitoring up -d${NC}"
echo ""
echo "5. Verificar estado:"
echo "   ${BLUE}docker-compose ps${NC}"
echo "   ${BLUE}curl http://localhost:8000/health${NC}"
echo "   ${BLUE}curl http://localhost:3000/health${NC}"
echo ""
echo "6. Ver logs:"
echo "   ${BLUE}docker-compose logs -f backend${NC}"
echo ""
echo "7. Backup de base de datos:"
echo "   ${BLUE}./scripts/backup_database.sh${NC}"
echo ""

echo -e "${RED}IMPORTANTE:${NC}"
echo "- Configura las credenciales SMTP reales en .env"
echo "- Cambia todas las contraseñas por defecto en producción"
echo "- Configura SSL/TLS para producción"
echo "- Programa backups automáticos"

echo -e "${GREEN}¡Sistema optimizado y listo para producción!${NC}"