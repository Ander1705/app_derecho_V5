#!/bin/bash

# ==============================================================================
# SCRIPT DE VERIFICACIÓN DE DESPLIEGUE - Consultorio Jurídico UCMC
# Desarrollador: Anderson Felipe Montaña Castelblanco
# Verifica que el despliegue GitHub Actions funcione correctamente
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
echo "  VERIFICACIÓN DE DESPLIEGUE - CONSULTORIO JURÍDICO UCMC"
echo "  Comprobando configuración para GitHub Actions"
echo "=============================================================================="
echo -e "${NC}"

ERRORS=0

# Verificar estructura de archivos
log "Verificando estructura de archivos..."

if [ -f ".github/workflows/deploy.yml" ]; then
    success "Archivo deploy.yml encontrado"
else
    error "Archivo deploy.yml no encontrado"
    ((ERRORS++))
fi

if [ -f "docker-compose.yml" ]; then
    success "Archivo docker-compose.yml encontrado"
else
    error "Archivo docker-compose.yml no encontrado"
    ((ERRORS++))
fi

if [ -f "go-backend/Dockerfile" ]; then
    success "Dockerfile del backend encontrado"
else
    error "Dockerfile del backend no encontrado"
    ((ERRORS++))
fi

if [ -f "frontend/Dockerfile" ]; then
    success "Dockerfile del frontend encontrado"
else
    error "Dockerfile del frontend no encontrado"
    ((ERRORS++))
fi

# Verificar versión de Go
log "Verificando versión de Go en go.mod..."
if grep -q "go 1.23" go-backend/go.mod; then
    success "Versión de Go correcta (1.23) en go.mod"
else
    warning "Versión de Go en go.mod podría necesitar actualización"
fi

# Verificar sintaxis del workflow
log "Verificando sintaxis del workflow de GitHub Actions..."
if command -v yamllint > /dev/null 2>&1; then
    if yamllint .github/workflows/deploy.yml; then
        success "Sintaxis YAML del workflow es válida"
    else
        error "Error en sintaxis YAML del workflow"
        ((ERRORS++))
    fi
else
    warning "yamllint no instalado, saltando verificación de sintaxis"
fi

# Verificar que los Dockerfiles puedan construirse
log "Verificando que los Dockerfiles sean válidos..."

# Backend
if docker build -t test-backend ./go-backend > /dev/null 2>&1; then
    success "Dockerfile del backend es válido"
    docker rmi test-backend > /dev/null 2>&1 || true
else
    error "Error en Dockerfile del backend"
    ((ERRORS++))
fi

# Frontend
if docker build -t test-frontend ./frontend > /dev/null 2>&1; then
    success "Dockerfile del frontend es válido"
    docker rmi test-frontend > /dev/null 2>&1 || true
else
    error "Error en Dockerfile del frontend"
    ((ERRORS++))
fi

# Verificar docker-compose
log "Verificando docker-compose.yml..."
if docker-compose config > /dev/null 2>&1; then
    success "docker-compose.yml es válido"
else
    error "Error en docker-compose.yml"
    ((ERRORS++))
fi

# Verificar variables de entorno
log "Verificando configuración de variables de entorno..."
if [ -f ".env.example" ]; then
    success "Archivo .env.example encontrado"
    
    if [ -f ".env" ]; then
        success "Archivo .env encontrado"
    else
        warning "Archivo .env no encontrado - crear desde .env.example"
    fi
else
    error "Archivo .env.example no encontrado"
    ((ERRORS++))
fi

# Verificar dependencias de Go
log "Verificando dependencias de Go..."
cd go-backend
if go mod verify > /dev/null 2>&1; then
    success "Dependencias de Go son válidas"
else
    error "Error en dependencias de Go"
    ((ERRORS++))
fi
cd ..

# Verificar dependencias de Node.js
log "Verificando dependencias de Node.js..."
cd frontend
if npm ci > /dev/null 2>&1; then
    success "Dependencias de Node.js son válidas"
    
    # Verificar que el build funcione
    if npm run build > /dev/null 2>&1; then
        success "Build del frontend funciona correctamente"
    else
        error "Error en build del frontend"
        ((ERRORS++))
    fi
else
    error "Error en dependencias de Node.js"
    ((ERRORS++))
fi
cd ..

# Verificar puertos disponibles
log "Verificando disponibilidad de puertos..."
if ! netstat -tuln | grep -q ":3000 "; then
    success "Puerto 3000 disponible"
else
    warning "Puerto 3000 en uso - podría causar conflictos"
fi

if ! netstat -tuln | grep -q ":8000 "; then
    success "Puerto 8000 disponible"
else
    warning "Puerto 8000 en uso - podría causar conflictos"
fi

if ! netstat -tuln | grep -q ":5432 "; then
    success "Puerto 5432 disponible"
else
    warning "Puerto 5432 en uso - podría causar conflictos"
fi

# Verificar Docker y Docker Compose
log "Verificando Docker y Docker Compose..."
if command -v docker > /dev/null 2>&1; then
    success "Docker está instalado"
    
    if docker info > /dev/null 2>&1; then
        success "Docker está ejecutándose"
    else
        error "Docker no está ejecutándose"
        ((ERRORS++))
    fi
else
    error "Docker no está instalado"
    ((ERRORS++))
fi

if command -v docker-compose > /dev/null 2>&1; then
    success "Docker Compose está instalado"
else
    error "Docker Compose no está instalado"
    ((ERRORS++))
fi

echo ""
echo -e "${PURPLE}"
echo "=============================================================================="
echo "  RESUMEN DE VERIFICACIÓN"
echo "=============================================================================="
echo -e "${NC}"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ CONFIGURACIÓN VÁLIDA${NC}"
    echo "  El despliegue con GitHub Actions debería funcionar correctamente"
    echo ""
    echo "Para iniciar el despliegue:"
    echo "  1. Hacer commit y push a la rama main"
    echo "  2. GitHub Actions ejecutará automáticamente el workflow"
    echo "  3. El despliegue se realizará con Docker Compose"
    echo ""
    echo "URLs después del despliegue:"
    echo "  - Frontend: ${BLUE}http://localhost:3000${NC}"
    echo "  - Backend API: ${BLUE}http://localhost:8000${NC}"
    echo "  - Health Check: ${BLUE}http://localhost:8000/health${NC}"
else
    echo -e "${RED}❌ ERRORES ENCONTRADOS${NC}"
    echo "  Se encontraron $ERRORS error(es) que deben corregirse antes del despliegue"
    echo "  Revise los errores reportados arriba"
fi

echo ""
echo "Para monitorear el despliegue:"
echo "  - Ver workflows: ${BLUE}https://github.com/tu-usuario/tu-repo/actions${NC}"
echo "  - Logs locales: ${BLUE}docker-compose logs -f${NC}"
echo "  - Health check: ${BLUE}./scripts/health_check.sh${NC}"

exit $ERRORS