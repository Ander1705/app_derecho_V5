# ============================================================================
# DOCKERFILE OPTIMIZADO - Frontend React Consultorio Jurídico UCMC
# Desarrollador: Anderson Felipe Montaña Castelblanco  
# Optimizado para máximo rendimiento y mínimo tamaño
# ============================================================================

# ========================================
# Stage 1: Builder Optimizado
# ========================================
FROM node:20-alpine AS builder

# Instalar dependencias del sistema optimizadas
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

# Configurar directorio de trabajo
WORKDIR /build

# Configurar NPM para optimización
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Copiar archivos de dependencias (cache layer)
COPY package*.json ./

# Instalar dependencias con cache optimizado
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copiar código fuente
COPY . .

# Argumentos de build optimizados
ARG REACT_APP_API_URL=http://localhost:8000
ARG REACT_APP_VERSION=1.0.0
ARG REACT_APP_BUILD_DATE
ARG NODE_ENV=production

# Variables de entorno optimizadas para build
ENV REACT_APP_API_URL=$REACT_APP_API_URL \
    REACT_APP_VERSION=$REACT_APP_VERSION \
    REACT_APP_BUILD_DATE=$REACT_APP_BUILD_DATE \
    NODE_ENV=production \
    GENERATE_SOURCEMAP=false \
    INLINE_RUNTIME_CHUNK=false \
    NODE_OPTIONS="--max-old-space-size=4096"

# Build optimizado de la aplicación
RUN npm run build

# Optimizar archivos estáticos
RUN find dist -name "*.js" -exec gzip -k {} \; && \
    find dist -name "*.css" -exec gzip -k {} \; && \
    find dist -name "*.html" -exec gzip -k {} \; && \
    find dist -name "*.svg" -exec gzip -k {} \;

# ========================================
# Stage 2: Runtime Optimizado con Nginx
# ========================================
FROM nginx:1.25-alpine

# Instalar dependencias mínimas + herramientas de optimización
RUN apk add --no-cache \
    tzdata \
    curl \
    brotli \
    && rm -rf /var/cache/apk/*

# Configurar zona horaria
ENV TZ=America/Bogota
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Remover configuración por defecto de nginx
RUN rm /etc/nginx/conf.d/default.conf

# Crear directorios necesarios
RUN mkdir -p /tmp/nginx/{proxy_temp,client_temp,fastcgi_temp,uwsgi_temp,scgi_temp}

# Copiar configuración optimizada de nginx
COPY nginx.conf /etc/nginx/conf.d/

# Copiar build optimizado desde builder
COPY --from=builder /build/dist /usr/share/nginx/html

# Optimizar archivos estáticos adicionales
RUN cd /usr/share/nginx/html && \
    find . -name "*.js" ! -name "*.gz" -exec sh -c 'brotli -q 11 -o "$1.br" "$1"' _ {} \; && \
    find . -name "*.css" ! -name "*.gz" -exec sh -c 'brotli -q 11 -o "$1.br" "$1"' _ {} \; && \
    find . -name "*.html" ! -name "*.gz" -exec sh -c 'brotli -q 11 -o "$1.br" "$1"' _ {} \;

# Crear usuario no-root optimizado
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup -s /bin/sh

# Configurar permisos optimizados
RUN chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /etc/nginx/conf.d && \
    chown -R appuser:appgroup /tmp/nginx && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/run/nginx.pid && \
    chown -R appuser:appgroup /usr/share/nginx/html

# Configurar nginx para ejecutar sin root con optimizaciones
RUN sed -i '/user  nginx;/d' /etc/nginx/nginx.conf && \
    sed -i 's,/var/run/nginx.pid,/tmp/nginx.pid,' /etc/nginx/nginx.conf && \
    sed -i "/^http {/a \    proxy_temp_path /tmp/nginx/proxy_temp;\n    client_body_temp_path /tmp/nginx/client_temp;\n    fastcgi_temp_path /tmp/nginx/fastcgi_temp;\n    uwsgi_temp_path /tmp/nginx/uwsgi_temp;\n    scgi_temp_path /tmp/nginx/scgi_temp;\n" /etc/nginx/nginx.conf

# Cambiar a usuario no-root
USER appuser

# Exponer puerto
EXPOSE 3000

# Variables de entorno optimizadas
ENV NGINX_WORKER_PROCESSES=auto \
    NGINX_WORKER_CONNECTIONS=1024 \
    NGINX_KEEPALIVE_TIMEOUT=65

# Health check optimizado
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || curl -f http://localhost:3000/ || exit 1

# Comando de inicio optimizado
CMD ["nginx", "-g", "daemon off;"]

# ============================================================================
# Metadata
# ============================================================================
LABEL maintainer="Consultorio Jurídico UCMC"
LABEL description="Frontend React para Sistema de Consultorio Jurídico"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/consultorio-juridico-ucmc"
LABEL org.opencontainers.image.description="Aplicación web frontend desarrollada en React para el sistema de gestión del Consultorio Jurídico de la Universidad Colegio Mayor de Cundinamarca"
LABEL org.opencontainers.image.licenses="MIT"