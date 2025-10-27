# Dockerfile optimizado para React Frontend (SIN MINIFICACIÓN)
FROM node:20-alpine AS builder

# Instalar dependencias del sistema
RUN apk add --no-cache git

# Configurar directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Configurar variable ANTES de copiar código fuente
ARG VITE_API_URL=https://servicioucmc.online/api
ENV VITE_API_URL=${VITE_API_URL}

# Copiar código fuente EXCEPTO archivos .env
COPY public ./public
COPY src ./src
COPY index.html ./
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Crear configuración para producción DESPUÉS de copiar
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env.production
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env.local
RUN echo "🔍 DEBUG: VITE_API_URL durante build = $VITE_API_URL"
RUN cat .env.production

# Build SIN minificación (soluciona error 'O')
RUN npm run build

# Stage de producción con Nginx
FROM nginx:alpine

# Configurar zona horaria
ENV TZ=America/Bogota
RUN apk add --no-cache tzdata curl && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime

# Configuración Nginx optimizada
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

# Copiar build desde el stage anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Configurar permisos
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]