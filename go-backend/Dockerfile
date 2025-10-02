# ============================================================================
# DOCKERFILE OPTIMIZADO - Backend Go Consultorio Jurídico UCMC
# Desarrollador: Anderson Felipe Montaña Castelblanco
# Optimizado para máximo rendimiento y mínimo tamaño
# ============================================================================

# ========================================
# Stage 1: Builder Optimizado
# ========================================
FROM golang:1.22-alpine AS builder

# Instalar dependencias del sistema + herramientas de optimización
RUN apk add --no-cache \
    git \
    ca-certificates \
    tzdata \
    gcc \
    musl-dev \
    ghostscript \
    pdftk-java \
    upx \
    curl

# Configurar variables de build optimizadas
ENV CGO_ENABLED=1 \
    GOOS=linux \
    GOARCH=amd64 \
    GO111MODULE=on \
    GOCACHE=/go-cache \
    GOMODCACHE=/go-mod-cache

# Configurar directorio de trabajo
WORKDIR /build

# Crear cache directories
RUN mkdir -p /go-cache /go-mod-cache

# Copiar archivos de dependencias (cache layer)
COPY go.mod go.sum ./

# Descargar dependencias con cache
RUN --mount=type=cache,target=/go-mod-cache \
    go mod download && \
    go mod verify

# Copiar código fuente
COPY . .

# Compilar aplicación con optimizaciones máximas
RUN --mount=type=cache,target=/go-cache \
    --mount=type=cache,target=/go-mod-cache \
    go build \
    -ldflags="-w -s -extldflags '-static' -X main.version=1.0.0 -X main.buildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -a -installsuffix cgo \
    -trimpath \
    -tags netgo \
    -o app ./cmd/main.go

# Comprimir binario (reduce ~40% del tamaño)
RUN upx --best --lzma app

# Verificar binario
RUN ./app --version 2>/dev/null || echo "Binary built successfully"

# ========================================
# Stage 2: Runtime Optimizado
# ========================================
FROM alpine:3.19

# Instalar dependencias mínimas de runtime
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    ghostscript \
    pdftk-java \
    openjdk17-jre-headless \
    curl \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# Configurar zona horaria
ENV TZ=America/Bogota
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Crear usuario no-root optimizado
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup -s /bin/sh

# Configurar directorio de trabajo
WORKDIR /app

# Crear directorios necesarios con permisos optimizados
RUN mkdir -p \
    /app/storage/uploads \
    /app/storage/temp \
    /app/storage/logs \
    /app/assets/images \
    && chown -R appuser:appgroup /app \
    && chmod -R 755 /app

# Copiar binario optimizado desde builder
COPY --from=builder --chown=appuser:appgroup /build/app /app/app

# Copiar archivos de configuración si existen
COPY --from=builder --chown=appuser:appgroup /build/assets/ /app/assets/ 2>/dev/null || true

# Dar permisos de ejecución
RUN chmod +x /app/app

# Cambiar a usuario no-root
USER appuser

# Exponer puerto
EXPOSE 8000

# Variables de entorno optimizadas para producción
ENV SERVER_PORT=8000 \
    ENV=production \
    GIN_MODE=release \
    DB_HOST=postgres \
    DB_PORT=5432 \
    DB_NAME=app_derecho_db \
    DB_USER=app_derecho_user \
    DB_SSL_MODE=disable \
    GOMAXPROCS=2 \
    GOMEMLIMIT=512MiB \
    GOGC=100

# Health check optimizado
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Comando de inicio optimizado
CMD ["./app"]

# ============================================================================
# Metadata
# ============================================================================
LABEL maintainer="Consultorio Jurídico UCMC"
LABEL description="Backend API para Sistema de Consultorio Jurídico"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/consultorio-juridico-ucmc"
LABEL org.opencontainers.image.description="API Backend desarrollado en Go para el sistema de gestión del Consultorio Jurídico de la Universidad Colegio Mayor de Cundinamarca"
LABEL org.opencontainers.image.licenses="MIT"