#!/bin/bash

# Script para configurar la base de datos PostgreSQL

echo "🔧 Configurando PostgreSQL para el proyecto..."

# Verificar si PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL no está instalado. Instalando..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
fi

# Iniciar servicio PostgreSQL
echo "🚀 Iniciando servicio PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Esperar un momento para que el servicio inicie completamente
sleep 3

# Crear usuario y base de datos
echo "👤 Creando usuario y base de datos..."
sudo -u postgres psql << EOF
-- Crear usuario si no existe
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'app_derecho_user') THEN
      CREATE USER app_derecho_user WITH PASSWORD 'app_derecho_pass_2025';
   END IF;
END
\$\$;

-- Crear base de datos si no existe
SELECT 'CREATE DATABASE app_derecho_db OWNER app_derecho_user' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'app_derecho_db')\gexec

-- Otorgar privilegios
GRANT ALL PRIVILEGES ON DATABASE app_derecho_db TO app_derecho_user;
GRANT CONNECT ON DATABASE app_derecho_db TO app_derecho_user;

-- Conectar a la base de datos y otorgar privilegios adicionales
\c app_derecho_db
GRANT CREATE ON SCHEMA public TO app_derecho_user;
GRANT USAGE ON SCHEMA public TO app_derecho_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_derecho_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_derecho_user;

-- Configurar privilegios por defecto
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_derecho_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_derecho_user;

-- Verificar conexión
SELECT 'Database setup completed successfully!' as status;
EOF

# Verificar configuración de PostgreSQL para permitir conexiones TCP/IP
echo "⚙️ Configurando PostgreSQL para conexiones TCP/IP..."

# Encontrar archivo de configuración
PG_CONFIG=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW config_file;')
PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;')

echo "Archivo de configuración: $PG_CONFIG"
echo "Archivo HBA: $PG_HBA"

# Configurar postgresql.conf para permitir conexiones locales
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PG_CONFIG"
sudo sed -i "s/#port = 5432/port = 5432/" "$PG_CONFIG"

# Configurar pg_hba.conf para permitir autenticación por contraseña
sudo sed -i "s/local   all             all                                     peer/local   all             all                                     md5/" "$PG_HBA"

# Agregar línea para conexiones TCP/IP locales si no existe
if ! sudo grep -q "host    all             all             127.0.0.1/32            md5" "$PG_HBA"; then
    echo "host    all             all             127.0.0.1/32            md5" | sudo tee -a "$PG_HBA"
fi

# Reiniciar PostgreSQL para aplicar cambios
echo "🔄 Reiniciando PostgreSQL..."
sudo systemctl restart postgresql

# Esperar a que el servicio se reinicie
sleep 5

# Verificar que PostgreSQL esté ejecutándose en el puerto correcto
echo "🔍 Verificando estado de PostgreSQL..."
sudo systemctl status postgresql --no-pager -l

# Verificar puerto
echo "🔌 Verificando puerto 5432..."
sudo netstat -tlnp | grep :5432 || echo "Puerto 5432 no está disponible"

# Probar conexión
echo "🧪 Probando conexión a la base de datos..."
PGPASSWORD=app_derecho_pass_2025 psql -U app_derecho_user -d app_derecho_db -h localhost -c "SELECT current_database(), current_user;" || echo "❌ Error al conectar a la base de datos"

echo "✅ Configuración de base de datos completada!"