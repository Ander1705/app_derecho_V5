# Sistema Consultorio Jurídico UCMC - Backend

## Descripción
API REST para el sistema de gestión del Consultorio Jurídico de la Universidad Colegio Mayor de Cundinamarca.

## Tecnologías
- **FastAPI** - Framework web moderno para Python
- **SQLAlchemy** - ORM para manejo de base de datos
- **SQLite** - Base de datos
- **ReportLab** - Generación de PDFs
- **JWT** - Autenticación
- **Python 3.12**

## Ejecución con Docker (Recomendado)

### Requisitos Previos
- Docker
- Docker Compose

### Comandos
```bash
# Construir y ejecutar
docker-compose up --build

# Ejecutar en segundo plano
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

La aplicación estará disponible en: http://localhost:8000

## Ejecución Manual

### Requisitos Previos
- Python 3.12+
- pip

### Instalación
```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar
python main.py
```

## Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/coordinador/registrar-estudiante` - Registrar estudiante (Coordinador)
- `GET /api/auth/coordinador/estudiantes` - Listar estudiantes (Coordinador)

### Controles Operativos
- `GET /api/control-operativo/list` - Listar controles
- `POST /api/control-operativo/create` - Crear control
- `GET /api/control-operativo/{id}/pdf` - Descargar PDF

### Sistema
- `GET /` - Mensaje de estado
- `GET /health` - Health check
- `GET /docs` - Documentación Swagger (solo desarrollo)

## Variables de Entorno

Crear archivo `.env`:
```env
JWT_SECRET_KEY=tu-clave-secreta-muy-segura
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=sqlite:///./app_derecho.db
ENVIRONMENT=production
DEBUG=false
PORT=8000
```

## Estructura del Proyecto
```
backend/
├── app/
│   ├── config/         # Configuraciones
│   ├── models/         # Modelos de datos
│   ├── routes/         # Endpoints API
│   ├── services/       # Lógica de negocio
│   └── middleware/     # Middlewares
├── uploads/            # Archivos subidos
├── app_derecho.db      # Base de datos SQLite
├── main.py             # Punto de entrada
├── requirements.txt    # Dependencias
├── Dockerfile          # Imagen Docker
└── docker-compose.yml  # Orchestration
```

## Desarrollo

### Comandos Útiles
```bash
# Verificar salud del sistema
curl http://localhost:8000/health

# Ver documentación API
http://localhost:8000/docs

# Logs en desarrollo
python main.py  # Con DEBUG=true
```

### Base de Datos
- **Archivo**: `app_derecho.db`
- **Tipo**: SQLite
- **Inicialización**: Automática al iniciar

## Producción

### Variables de Seguridad
- Cambiar `JWT_SECRET_KEY` por una clave segura
- Establecer `ENVIRONMENT=production`
- Establecer `DEBUG=false`

### Monitoreo
- Health check: `/health`
- Logs: `docker-compose logs`

## Soporte
Para problemas técnicos, verificar:
1. Variables de entorno configuradas
2. Base de datos presente y accesible
3. Puerto 8000 disponible
4. Logs del contenedor