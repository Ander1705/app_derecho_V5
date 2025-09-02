# Multi-stage build para optimizar imagen de producción
FROM python:3.12-slim as builder

# Instalar dependencias del sistema necesarias para compilación
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar requirements y instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Imagen final optimizada
FROM python:3.12-slim

# Crear usuario no-root para seguridad
RUN useradd --create-home --shell /bin/bash appuser

# Instalar solo las dependencias del sistema necesarias en runtime
RUN apt-get update && apt-get install -y \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Establecer directorio de trabajo
WORKDIR /app

# Copiar dependencias instaladas desde builder
COPY --from=builder /root/.local /home/appuser/.local

# Copiar código de la aplicación
COPY . .

# Crear directorio para uploads y base de datos
RUN mkdir -p uploads && \
    chown -R appuser:appuser /app

# Cambiar a usuario no-root
USER appuser

# Establecer PATH para paquetes instalados localmente
ENV PATH=/home/appuser/.local/bin:$PATH

# Variables de entorno para producción
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

# Exponer puerto
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Comando de inicio
CMD ["python", "main.py"]