#!/bin/bash
# Script único de despliegue y gestión del proyecto

set -e

# Configuración
PROJECT_NAME="app_derecho"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Función de logging
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Función de ayuda
show_help() {
    echo "Script de gestión para $PROJECT_NAME"
    echo ""
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos disponibles:"
    echo "  setup     - Configuración inicial del proyecto"
    echo "  dev       - Iniciar entorno de desarrollo"
    echo "  build     - Construir imágenes Docker"
    echo "  start     - Iniciar servicios"
    echo "  stop      - Detener servicios"
    echo "  restart   - Reiniciar servicios"
    echo "  logs      - Ver logs de servicios"
    echo "  status    - Estado de servicios"
    echo "  clean     - Limpiar contenedores e imágenes"
    echo "  reset     - Reset completo (DESTRUCTIVO)"
    echo "  backup    - Crear backup de base de datos"
    echo "  health    - Verificar salud de servicios"
    echo ""
}

# Verificar que Docker está disponible
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker no está instalado"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose no está instalado"
    fi
}

# Configuración inicial
setup() {
    log "Configurando proyecto..."
    
    # Crear archivo .env si no existe
    if [ ! -f "$ENV_FILE" ]; then
        log "Creando archivo .env..."
        cat > "$ENV_FILE" << 'EOF'
# Base de datos
DB_NAME=app_derecho_db
DB_USER=app_derecho_user
DB_PASSWORD=app_derecho_pass_2025
DB_PORT=5433

# Redis
REDIS_PASSWORD=redis_pass_2025
REDIS_PORT=6379

# JWT
JWT_SECRET_KEY=super_secret_jwt_key_2025_consultorio_ucmc

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=upkucmc@gmail.com
SMTP_PASSWORD=afcv gkut vdml owfx
SMTP_FROM=upkucmc@gmail.com

# Puertos de servicios
API_PORT=8000
FRONTEND_PORT=3000

# URL API para frontend
VITE_API_URL=http://localhost:8000/api
EOF
        success "Archivo .env creado"
    fi
    
    # Crear directorios necesarios
    mkdir -p data/{postgres,redis,uploads,logs}
    
    success "Configuración inicial completada"
}

# Desarrollo
dev() {
    log "Iniciando entorno de desarrollo..."
    check_docker
    
    # Solo servicios esenciales para desarrollo
    docker-compose up -d postgres redis
    
    log "Servicios de desarrollo iniciados"
    log "PostgreSQL: localhost:5433"
    log "Redis: localhost:6379"
    log ""
    log "Para desarrollo local:"
    log "  Backend: cd go-backend && go run cmd/main.go"
    log "  Frontend: cd frontend && npm run dev"
}

# Build
build() {
    log "Construyendo imágenes..."
    check_docker
    
    # Build con caché limpio
    docker-compose build --no-cache
    
    success "Imágenes construidas"
}

# Start
start() {
    log "Iniciando servicios..."
    check_docker
    
    docker-compose up -d
    
    # Esperar que los servicios estén listos
    log "Esperando que los servicios inicien..."
    sleep 10
    
    health
}

# Stop
stop() {
    log "Deteniendo servicios..."
    docker-compose down
    success "Servicios detenidos"
}

# Restart
restart() {
    log "Reiniciando servicios..."
    stop
    start
}

# Logs
logs() {
    if [ -n "$2" ]; then
        docker-compose logs -f "$2"
    else
        docker-compose logs -f
    fi
}

# Status
status() {
    log "Estado de servicios:"
    docker-compose ps
}

# Clean
clean() {
    log "Limpiando contenedores e imágenes..."
    
    # Confirmar acción
    read -p "¿Estás seguro? Esto eliminará contenedores e imágenes. (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Operación cancelada"
        return
    fi
    
    docker-compose down -v
    docker system prune -f
    docker images | grep "$PROJECT_NAME" | awk '{print $3}' | xargs -r docker rmi -f
    
    success "Limpieza completada"
}

# Reset completo
reset() {
    log "Reset completo del proyecto..."
    
    # Confirmar acción
    echo -e "${RED}⚠️ ADVERTENCIA: Esto eliminará TODOS los datos${NC}"
    read -p "¿Estás SEGURO? Escribe 'RESET' para confirmar: " -r
    if [[ ! $REPLY == "RESET" ]]; then
        log "Operación cancelada"
        return
    fi
    
    # Parar todo
    docker-compose down -v --remove-orphans
    
    # Eliminar volúmenes y datos
    docker volume ls | grep "$PROJECT_NAME" | awk '{print $2}' | xargs -r docker volume rm
    rm -rf data/
    
    # Limpiar imágenes
    docker system prune -af
    
    success "Reset completo ejecutado"
}

# Backup
backup() {
    log "Creando backup de base de datos..."
    
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    docker-compose exec -T postgres pg_dump -U app_derecho_user app_derecho_db > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        success "Backup creado: $BACKUP_FILE"
    else
        error "Error creando backup"
    fi
}

# Health check
health() {
    log "Verificando salud de servicios..."
    
    # Backend
    if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
        success "Backend: OK (http://localhost:8000)"
    else
        warning "Backend: No disponible"
    fi
    
    # Frontend
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
        success "Frontend: OK (http://localhost:3000)"
    else
        warning "Frontend: No disponible"
    fi
    
    # PostgreSQL
    if docker-compose exec postgres pg_isready -U app_derecho_user > /dev/null 2>&1; then
        success "PostgreSQL: OK"
    else
        warning "PostgreSQL: No disponible"
    fi
    
    # Redis
    if docker-compose exec redis redis-cli ping > /dev/null 2>&1; then
        success "Redis: OK"
    else
        warning "Redis: No disponible"
    fi
}

# Comando principal
case "${1:-help}" in
    setup)
        setup
        ;;
    dev)
        dev
        ;;
    build)
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs "$@"
        ;;
    status)
        status
        ;;
    clean)
        clean
        ;;
    reset)
        reset
        ;;
    backup)
        backup
        ;;
    health)
        health
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "Comando desconocido: $1"
        show_help
        ;;
esac