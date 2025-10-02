# 🏛️ Sistema Consultorio Jurídico UCMC

## Universidad Colegio Mayor de Cundinamarca
**Facultad de Derecho - Consultorio Jurídico Kennedy**

Sistema integral de gestión jurídica desarrollado con arquitectura moderna **Go + PostgreSQL + React** para la administración eficiente de controles operativos, usuarios y documentos jurídicos con flujo de trabajo colaborativo.

---

## 📋 Tabla de Contenidos

- [🏛️ Sistema Consultorio Jurídico UCMC](#️-sistema-consultorio-jurídico-ucmc)
  - [Universidad Colegio Mayor de Cundinamarca](#universidad-colegio-mayor-de-cundinamarca)
  - [📋 Tabla de Contenidos](#-tabla-de-contenidos)
  - [✨ Características Principales](#-características-principales)
    - [🎯 Sistema de 3 Roles Diferenciados](#-sistema-de-3-roles-diferenciados)
    - [🔄 Flujo de Trabajo Colaborativo](#-flujo-de-trabajo-colaborativo)
    - [📄 Generación de PDFs Profesionales](#-generación-de-pdfs-profesionales)
    - [📊 Sistema de Estadísticas y Reportes](#-sistema-de-estadísticas-y-reportes)
  - [🏗️ Arquitectura del Sistema](#️-arquitectura-del-sistema)
    - [Backend (Go)](#backend-go)
    - [Frontend (React)](#frontend-react)
    - [Base de Datos (PostgreSQL)](#base-de-datos-postgresql)
  - [🚀 Instalación y Despliegue](#-instalación-y-despliegue)
    - [Opción 1: Docker (Recomendado)](#opción-1-docker-recomendado)
    - [Opción 2: Instalación Manual](#opción-2-instalación-manual)
  - [🐳 Despliegue con Docker](#-despliegue-con-docker)
    - [Desarrollo](#desarrollo)
    - [Producción](#producción)
  - [⚙️ Configuración](#️-configuración)
    - [Variables de Entorno Backend](#variables-de-entorno-backend)
    - [Variables de Entorno Frontend](#variables-de-entorno-frontend)
  - [🌐 API Endpoints](#-api-endpoints)
    - [Autenticación](#autenticación)
    - [Control Operativo](#control-operativo)
    - [Gestión de Usuarios](#gestión-de-usuarios)
    - [Estadísticas](#estadísticas)
  - [📁 Estructura del Proyecto](#-estructura-del-proyecto)
  - [🔄 GitHub Actions CI/CD](#-github-actions-cicd)
    - [Configuración de Secrets](#configuración-de-secrets)
  - [🛠️ Desarrollo](#️-desarrollo)
    - [Backend Go](#backend-go-1)
    - [Frontend React](#frontend-react-1)
  - [📝 Funcionalidades Específicas](#-funcionalidades-específicas)
    - [PDF Formulario Jurídico](#pdf-formulario-jurídico)
    - [Sistema de Notificaciones](#sistema-de-notificaciones)
    - [Gestión de Archivos](#gestión-de-archivos)
  - [🔍 Troubleshooting](#-troubleshooting)
    - [Problemas Comunes](#problemas-comunes)
  - [📊 Monitoreo y Performance](#-monitoreo-y-performance)
  - [🛡️ Seguridad](#️-seguridad)
  - [📞 Soporte](#-soporte)

---

## ✨ Características Principales

### 🎯 Sistema de 3 Roles Diferenciados
- **👨‍🎓 Estudiante**: Creación y gestión de controles operativos
- **👩‍🏫 Profesor**: Supervisión académica y completado de conceptos jurídicos
- **👨‍💼 Coordinador**: Gestión completa de usuarios, asignación de estados y estadísticas

### 🔄 Flujo de Trabajo Colaborativo
1. **Estudiante** crea control operativo con datos del consultante
2. **Sistema** notifica automáticamente al profesor asignado
3. **Profesor** completa el concepto del asesor jurídico
4. **Coordinador** asigna estado final y resultado del caso
5. **Sistema** genera PDF oficial y mantiene trazabilidad completa

### 📄 Generación de PDFs Profesionales
- Formulario oficial en formato oficio (216mm × 330mm)
- Diseño exacto según especificaciones institucionales
- Truncación inteligente de texto para evitar desbordamiento
- Campos dinámicos que respetan datos ingresados
- Encabezado institucional con logo UCMC

### 📊 Sistema de Estadísticas y Reportes
- Dashboard personalizado por rol de usuario
- Filtros avanzados por área jurídica, estado y fechas
- Métricas de productividad académica
- Reportes de actividad por estudiante y profesor

---

## 🏗️ Arquitectura del Sistema

### Backend (Go)
- **Framework**: Gin HTTP Framework
- **ORM**: GORM para PostgreSQL
- **Autenticación**: JWT con middleware personalizado
- **Generación PDF**: gofpdf con diseño institucional
- **Upload de archivos**: Gestión segura con validación de tipos

### Frontend (React)
- **Framework**: React 18 con Hooks
- **Enrutamiento**: React Router DOM
- **Estilos**: CSS modular con diseño responsivo
- **Estado**: Context API para gestión global
- **Comunicación**: Axios para API calls

### Base de Datos (PostgreSQL)
- **Esquema optimizado** para consultas rápidas
- **Índices estratégicos** en campos de búsqueda frecuente
- **Relaciones eficientes** entre tablas de usuarios y controles
- **Respaldos automáticos** configurables

---

## 🚀 Instalación y Despliegue

### Opción 1: Docker (Recomendado)

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/app_derecho_V3.git
cd app_derecho_V3

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Levantar servicios
docker-compose up -d

# Verificar servicios
docker-compose ps
docker-compose logs -f
```

### Opción 2: Instalación Manual

**Prerrequisitos:**
- Go 1.21+
- Node.js 18+
- PostgreSQL 15+
- Git

**Backend:**
```bash
cd go-backend
go mod download
go mod verify

# Configurar variables de entorno
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=app_derecho_db
export DB_USER=app_derecho_user
export DB_PASSWORD=app_derecho_pass_2025

# Ejecutar
go run cmd/main.go
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

**Base de Datos:**
```bash
# Crear base de datos
createdb app_derecho_db

# Conectar y crear usuario
psql app_derecho_db
CREATE USER app_derecho_user WITH PASSWORD 'app_derecho_pass_2025';
GRANT ALL PRIVILEGES ON DATABASE app_derecho_db TO app_derecho_user;
```

---

## 🐳 Despliegue con Docker

### Desarrollo
```bash
# Desarrollo con hot reload
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Producción
```bash
# Despliegue con nginx
docker-compose --profile production up -d

# Build sin cache
docker-compose build --no-cache
docker-compose up -d --force-recreate
```

**Backup de base de datos:**
```bash
docker-compose exec postgres pg_dump -U app_derecho_user app_derecho_db > backup.sql
```

**Restore de base de datos:**
```bash
docker-compose exec -T postgres psql -U app_derecho_user -d app_derecho_db < backup.sql
```

---

## ⚙️ Configuración

### Variables de Entorno Backend
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=app_derecho_db
DB_USER=app_derecho_user
DB_PASSWORD=app_derecho_pass_2025
DB_SSL_MODE=disable

# Server
SERVER_PORT=8000
ENV=production

# JWT
JWT_SECRET=consultorio-juridico-secret-key-2025
JWT_EXPIRATION_HOURS=24

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=upkucmc@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=upkucmc@gmail.com
```

### Variables de Entorno Frontend
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_VERSION=1.0.0
```

---

## 🌐 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login de usuarios
- `POST /api/auth/registro/estudiante` - Registro de estudiantes
- `POST /api/auth/registro/profesor` - Registro de profesores
- `GET /api/auth/me` - Información del usuario actual

### Control Operativo
- `POST /api/control-operativo` - Crear control operativo
- `GET /api/control-operativo/list` - Listar controles (con filtros)
- `GET /api/control-operativo/:id` - Obtener control específico
- `GET /api/control-operativo/:id/pdf` - Generar PDF del control
- `PUT /api/control-operativo/:id/estado-resultado` - Actualizar estado

### Gestión de Usuarios
- `GET /api/coordinador/usuarios` - Listar usuarios (solo coordinador)
- `PUT /api/usuario/:id/estado` - Cambiar estado de usuario
- `GET /api/profesores` - Listar profesores activos

### Estadísticas
- `GET /api/coordinador/estadisticas` - Estadísticas generales
- `GET /api/coordinador/estadisticas-completas` - Estadísticas detalladas

---

## 📁 Estructura del Proyecto

```
app_derecho_V3/
├── 📁 go-backend/              # Backend API en Go
│   ├── 📁 cmd/                 # Punto de entrada
│   ├── 📁 internal/            # Código interno
│   │   ├── 📁 config/          # Configuración
│   │   ├── 📁 database/        # Conexión DB
│   │   ├── 📁 handlers/        # Controladores HTTP
│   │   ├── 📁 middleware/      # Middleware personalizado
│   │   ├── 📁 models/          # Modelos de datos
│   │   └── 📁 services/        # Lógica de negocio
│   ├── 📁 pkg/                 # Paquetes reutilizables
│   │   ├── 📁 auth/            # Autenticación JWT
│   │   └── 📁 pdf/             # Generación de PDFs
│   ├── 📁 storage/             # Almacenamiento de archivos
│   ├── 🐳 Dockerfile           # Imagen Docker backend
│   ├── 📄 go.mod               # Dependencias Go
│   └── 📄 main                 # Binario compilado
├── 📁 frontend/                # Frontend React
│   ├── 📁 public/              # Archivos públicos
│   ├── 📁 src/                 # Código fuente React
│   │   ├── 📁 components/      # Componentes reutilizables
│   │   ├── 📁 contexts/        # Context API
│   │   ├── 📁 pages/           # Páginas principales
│   │   └── 📁 utils/           # Utilidades
│   ├── 🐳 Dockerfile           # Imagen Docker frontend
│   ├── 📄 nginx.conf           # Configuración Nginx
│   └── 📄 package.json         # Dependencias Node.js
├── 📁 .github/                 # GitHub Actions
│   └── 📁 workflows/           # Workflows CI/CD
├── 📁 data/                    # Volúmenes persistentes
├── 🐳 docker-compose.yml       # Orquestación completa
├── 📄 .dockerignore            # Exclusiones Docker
├── 📄 .gitignore               # Exclusiones Git
└── 📄 README.md                # Esta documentación
```

---

## 🔄 GitHub Actions CI/CD

El proyecto incluye workflows automatizados para:

- ✅ **Tests automatizados** de backend y frontend
- 🐳 **Build y push** de imágenes Docker
- 🚀 **Despliegue automático** a VPS en cambios a `main`
- 📢 **Notificaciones** a Slack del estado del deploy

### Configuración de Secrets

En GitHub Settings > Secrets and Variables > Actions:

```
VPS_HOST=tu-servidor.com
VPS_USER=usuario-ssh
VPS_SSH_KEY=-----BEGIN PRIVATE KEY-----...
VPS_PORT=22
REACT_APP_API_URL=https://api.tu-dominio.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

---

## 🛠️ Desarrollo

### Backend Go
```bash
cd go-backend

# Instalar dependencias
go mod download

# Ejecutar con hot reload (air)
go install github.com/cosmtrek/air@latest
air

# Tests
go test ./...

# Build
go build -o main cmd/main.go
```

### Frontend React
```bash
cd frontend

# Instalar dependencias
npm install

# Desarrollo
npm start

# Tests
npm test

# Build de producción
npm run build
```

---

## 📝 Funcionalidades Específicas

### PDF Formulario Jurídico
- **Formato oficial**: Hoja oficio 216mm × 330mm
- **Diseño institucional**: Logo y encabezado UCMC
- **6 secciones principales**:
  1. Datos del usuario (fecha, docente, estudiante, área)
  2. Información del consultante (datos personales completos)
  3. Descripción del caso (área de texto libre)
  4. Concepto del estudiante (análisis académico)
  5. Concepto del asesor jurídico (supervisión profesional)
  6. Declaración del usuario (términos y condiciones)

### Sistema de Notificaciones
- **Notificaciones en tiempo real** para cambios de estado
- **Contadores dinámicos** de notificaciones no leídas
- **Filtros por tipo** de notificación
- **Marcado automático** como leídas

### Gestión de Archivos
- **Upload seguro** con validación de tipos de archivo
- **Almacenamiento organizado** por control operativo
- **Compresión automática** de imágenes
- **Conversión a PDF** de documentos compatibles

---

## 🔍 Troubleshooting

### Problemas Comunes

**Error de conexión a base de datos:**
```bash
# Verificar PostgreSQL activo
sudo systemctl status postgresql
sudo systemctl start postgresql

# Verificar credenciales
psql -U app_derecho_user -d app_derecho_db -h localhost
```

**Error de puertos ocupados:**
```bash
# Verificar puertos en uso
netstat -tulpn | grep :8000
netstat -tulpn | grep :3000

# Liberar puertos
sudo fuser -k 8000/tcp
sudo fuser -k 3000/tcp
```

**Problemas con Docker:**
```bash
# Limpiar contenedores
docker-compose down -v --remove-orphans
docker system prune -a

# Rebuild completo
docker-compose build --no-cache
docker-compose up -d --force-recreate
```

**Error de permisos en archivos:**
```bash
# Ajustar permisos de storage
sudo chown -R $USER:$USER go-backend/storage/
chmod -R 755 go-backend/storage/
```

---

## 📊 Monitoreo y Performance

**Health Checks:**
- Backend: `http://localhost:8000/health`
- Frontend: `http://localhost:3000/health`

**Métricas disponibles:**
- Tiempo de respuesta de API
- Uso de memoria y CPU
- Conexiones activas a base de datos
- Tamaño de archivos subidos

**Logs centralizados:**
```bash
# Ver todos los logs
docker-compose logs -f

# Logs específicos por servicio
docker-compose logs -f backend
docker-compose logs -f postgres
```

---

## 🛡️ Seguridad

- ✅ **Autenticación JWT** con tokens seguros
- ✅ **Validación de entrada** en todos los endpoints
- ✅ **CORS configurado** correctamente
- ✅ **Headers de seguridad** implementados
- ✅ **Rate limiting** en endpoints sensibles
- ✅ **Encriptación de contraseñas** con bcrypt
- ✅ **Validación de archivos** subidos
- ✅ **SQL injection** prevención con ORM

---

## 📞 Soporte

**Universidad Colegio Mayor de Cundinamarca**  
Facultad de Derecho - Consultorio Jurídico Kennedy

**Contacto Técnico:**
- 📧 Email: consultoriojuridico.kennedy@unicolmayor.edu.co
- 📱 Teléfono: (+57) 1 123-4567
- 🏢 Dirección: Calle 6C No. 94I – 25 Edificio Nuevo Piso 4 – UPK, Bogotá D.C.

**Documentación adicional:**
- [Manual de Usuario](docs/manual-usuario.pdf)
- [Guía de Administrador](docs/guia-administrador.pdf)
- [API Documentation](docs/api-docs.md)

---

**Sistema desarrollado con ❤️ para la Universidad Colegio Mayor de Cundinamarca**

*Optimizado para el manejo eficiente de consultorios jurídicos universitarios con alta demanda de casos y múltiples usuarios simultáneos.*