# 🏛️ Sistema Consultorio Jurídico UCMC

Sistema completo para gestión de consultas jurídicas de la Universidad Colegio Mayor de Cundinamarca.

## 🚀 Inicio Rápido

### Configuración de Producción
```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/app_derecho_V5.git
cd app_derecho_V5

# Configurar variables de entorno
cp .env.production .env

# Iniciar servicios en producción
docker-compose up -d

# Verificar funcionamiento
curl https://servicioucmc.online/health
```

### URLs de Acceso
- **Sistema Web**: https://servicioucmc.online
- **API Backend**: https://servicioucmc.online/api
- **Base de Datos**: servicioucmc.online:5433

## 👥 Usuarios del Sistema

### Coordinador Principal
- **Email**: consultoriojuridico.kennedy@universidadmayor.edu.co
- **Contraseña**: Umayor2025**
- **Permisos**: Administración completa del sistema

### Roles Disponibles
- **Coordinador**: Gestión completa, estadísticas, mantenimiento
- **Profesor**: Revisión de casos, calificaciones de estudiantes
- **Estudiante**: Creación de controles operativos, seguimiento

## 🔧 Arquitectura del Sistema

### Backend (Go + Gin)
```
go-backend/
├── cmd/                 # Punto de entrada
├── internal/
│   ├── handlers/        # Controladores HTTP
│   ├── models/          # Modelos de datos
│   ├── services/        # Lógica de negocio
│   ├── middleware/      # Middleware personalizado
│   └── config/          # Configuración
├── pkg/
│   ├── auth/            # Autenticación JWT
│   └── pdf/             # Generación de PDFs
└── storage/             # Archivos subidos
```

### Frontend (React + Vite)
```
frontend/
├── public/              # Archivos estáticos
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── pages/           # Páginas principales
│   ├── contexts/        # Gestión de estado
│   └── utils/           # Utilidades
└── dist/                # Build de producción
```

### Base de Datos (PostgreSQL)
```sql
-- Tablas principales
users                    # Usuarios del sistema
control_operativos       # Casos jurídicos
calificaciones          # Evaluaciones de estudiantes
notificaciones          # Sistema de notificaciones
documento_adjuntos      # Archivos PDF adjuntos
```

## 🌐 API Endpoints

### Autenticación
```http
POST /api/auth/login                    # Login de usuarios
POST /api/auth/register                 # Registro de usuarios
GET  /api/auth/me                       # Perfil del usuario
POST /api/auth/verify-email             # Verificación de email
POST /api/auth/forgot-password          # Recuperar contraseña
```

### Control Operativo (Casos Jurídicos)
```http
POST /api/control-operativo             # Crear nuevo caso
GET  /api/control-operativo/list        # Listar casos con filtros
GET  /api/control-operativo/search      # Búsqueda avanzada
GET  /api/control-operativo/:id         # Obtener caso específico
GET  /api/control-operativo/:id/pdf     # Generar PDF del caso
PUT  /api/control-operativo/:id/estado-resultado  # Actualizar estado
POST /api/upload/temp                   # Subir archivos PDF
```

### Gestión de Profesores
```http
GET  /api/profesores                    # Listar profesores activos
GET  /api/profesor/controles-asignados  # Casos asignados al profesor
PUT  /api/profesor/control-operativo/:id/concepto  # Completar concepto jurídico
POST /api/profesor/calificaciones       # Crear calificación de estudiante
PUT  /api/profesor/calificaciones/:id   # Actualizar calificación
```

### Gestión de Coordinadores
```http
GET  /api/coordinador/usuarios          # Listar todos los usuarios
PUT  /api/coordinador/usuario/:id/estado # Activar/desactivar usuario
GET  /api/coordinador/estadisticas      # Estadísticas del sistema
GET  /api/coordinador/controles-completos # Casos completados
PUT  /api/coordinador/control-operativo/:id/resultado # Asignar resultado final
```

### Notificaciones
```http
GET  /api/notificaciones                # Listar notificaciones del usuario
PUT  /api/notificaciones/:id/leida     # Marcar como leída
```

## 📋 Funcionalidades Principales

### Sistema de Casos Jurídicos
- **Creación de controles operativos** por estudiantes
- **Asignación automática** a profesores especialistas
- **Seguimiento de estados**: pendiente → en proceso → completo → con resultado
- **Generación automática de PDFs** en formato oficial UCMC
- **Adjuntar documentos PDF** de soporte al caso

### Generación de PDFs Oficiales
- **Formato institucional**: Hoja oficio (216mm × 330mm)
- **Logo y encabezado** oficial UCMC
- **6 secciones estructuradas**:
  1. Datos del usuario y caso
  2. Información completa del consultante
  3. Descripción detallada del problema jurídico
  4. Concepto académico del estudiante
  5. Concepto profesional del asesor jurídico
  6. Declaración y términos de uso
- **Concatenación automática** con documentos adjuntos
- **Caracteres especiales** correctamente procesados

### Sistema de Roles y Permisos

#### Estudiantes
- Crear nuevos controles operativos
- Cargar documentos PDF adjuntos
- Ver sus propios casos y seguimiento
- Establecer estado resultado final después del concepto del profesor
- Recibir notificaciones de cambios

#### Profesores
- Ver casos asignados según su especialidad
- Completar conceptos jurídicos profesionales
- Calificar desempeño de estudiantes
- Acceso a herramientas de evaluación
- Notificaciones de nuevos casos asignados

#### Coordinadores
- Administración completa del sistema
- Gestión de usuarios (activar/desactivar)
- Estadísticas y reportes detallados
- Asignación manual de resultados
- Herramientas de mantenimiento de base de datos
- Acceso a todas las funcionalidades del sistema

### Búsquedas y Filtros Avanzados
- **Búsqueda por ID, nombre, cédula** del consultante
- **Filtros por área jurídica**: Civil, Penal, Laboral, Comercial, Familia, etc.
- **Filtros por estado**: pendiente, completo, con resultado
- **Filtros por fechas** de creación
- **Búsqueda de texto libre** en descripción de casos
- **Paginación optimizada** para grandes volúmenes

### Sistema de Notificaciones
- **Notificaciones en tiempo real** para cambios de estado
- **Contadores dinámicos** de notificaciones no leídas
- **Notificaciones por rol**:
  - Estudiantes: Estado de sus casos, resultados
  - Profesores: Nuevos casos asignados, recordatorios
  - Coordinadores: Resúmenes del sistema, casos completados

## 🛠️ Comandos de Desarrollo

### Backend
```bash
cd go-backend

# Ejecutar en desarrollo
go run cmd/main.go

# Compilar para producción
go build -o main cmd/main.go

# Tests
go test ./...
```

### Frontend
```bash
cd frontend

# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build de producción
npm run build
```

### Docker
```bash
# Construir y ejecutar todo el stack
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Reiniciar servicios
docker-compose restart

# Limpiar todo
docker-compose down -v --remove-orphans
```

## 🗃️ Base de Datos

### Configuración de Producción
```env
DB_HOST=servicioucmc.online
DB_PORT=5433
DB_NAME=app_derecho_db
DB_USER=app_derecho_user
DB_PASSWORD=app_derecho_pass_2025
```

### Conexión Directa
```bash
# Conectar a base de datos de producción
PGPASSWORD=app_derecho_pass_2025 psql -h servicioucmc.online -p 5433 -U app_derecho_user -d app_derecho_db

# Verificar tablas
\dt

# Ver usuarios del sistema
SELECT nombre_usuario, email, role FROM users;
```

### Estructura de Tablas Principales
```sql
-- Usuarios del sistema
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'estudiante',
    nombres VARCHAR(100),
    apellidos VARCHAR(100),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Casos jurídicos
CREATE TABLE control_operativos (
    id SERIAL PRIMARY KEY,
    nombre_consultante VARCHAR(255),
    area_consulta VARCHAR(100),
    descripcion_caso TEXT,
    concepto_estudiante TEXT,
    concepto_asesor TEXT,
    estado_flujo VARCHAR(50) DEFAULT 'pendiente_profesor',
    estado_resultado VARCHAR(50),
    profesor_asignado_id INTEGER REFERENCES users(id),
    created_by_id INTEGER REFERENCES users(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Deploy Automático

### GitHub Actions
El sistema incluye CI/CD automatizado que:
- **Ejecuta tests** en cada push
- **Construye imágenes Docker** optimizadas
- **Despliega automáticamente** a producción
- **Verifica salud** del sistema post-deploy

### Configuración de Secrets
```env
VPS_HOST=servicioucmc.online
VPS_USER=root
SSH_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
VITE_API_URL=https://servicioucmc.online/api
```

## 🔒 Seguridad

### Medidas Implementadas
- **Autenticación JWT** con tokens seguros
- **Encriptación bcrypt** para contraseñas
- **Validación de entrada** en todos los endpoints
- **CORS configurado** para dominios autorizados
- **Rate limiting** en endpoints sensibles
- **Validación de archivos** PDF subidos
- **Prevención SQL injection** con ORM GORM
- **Headers de seguridad** implementados

### Variables de Entorno Sensibles
```env
JWT_SECRET_KEY=super_secret_jwt_key_2025_consultorio_ucmc
SMTP_PASSWORD=contraseña_aplicación_gmail
DB_PASSWORD=app_derecho_pass_2025
REDIS_PASSWORD=redis_pass_2025
```

## 📊 Monitoreo

### Health Checks
- **Backend**: https://servicioucmc.online/health
- **Base de datos**: Verificación automática de conexión
- **Redis**: Cache de sesiones y notificaciones

### Métricas Disponibles
- Tiempo de respuesta de APIs
- Cantidad de usuarios activos
- Casos creados por día/mes
- Rendimiento de generación de PDFs
- Uso de almacenamiento de archivos

## 🐛 Troubleshooting

### Problemas Comunes

**Error de conexión a base de datos:**
```bash
# Verificar conexión
PGPASSWORD=app_derecho_pass_2025 psql -h servicioucmc.online -p 5433 -U app_derecho_user -d app_derecho_db -c "SELECT current_database();"
```

**Error de autenticación:**
```bash
# Verificar hash de contraseña del coordinador
SELECT email, substring(password_hash, 1, 20) FROM users WHERE role = 'coordinador';
```

**Problemas con PDFs:**
```bash
# Verificar permisos de directorios
ls -la go-backend/storage/
chmod -R 755 go-backend/storage/
```

**Docker no funciona:**
```bash
# Limpiar y reconstruir
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

## 📞 Soporte Técnico

**Universidad Colegio Mayor de Cundinamarca**  
Facultad de Derecho - Consultorio Jurídico Kennedy

**Contacto:**
- 📧 **Email**: consultoriojuridico.kennedy@universidadmayor.edu.co
- 📱 **Teléfono**: (+57) 1 123-4567  
- 🏢 **Dirección**: Calle 6C No. 94I – 25 Edificio Nuevo Piso 4 – UPK, Bogotá D.C.

**URLs del Sistema:**
- **Aplicación Web**: https://servicioucmc.online
- **API**: https://servicioucmc.online/api
- **Estado del Sistema**: https://servicioucmc.online/health

---

**Sistema desarrollado para la Universidad Colegio Mayor de Cundinamarca**  
*Optimizado para el manejo eficiente de consultorios jurídicos universitarios*