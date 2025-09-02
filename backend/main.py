"""Punto de entrada principal del sistema de Consultorio Jurídico UCMC."""

import logging
import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, Any

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.config.database import init_db
from app.routes import auth, control_operativo

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Administrar el ciclo de vida de la aplicación FastAPI.
    
    Args:
        _app: Instancia de la aplicación FastAPI (no utilizada)
    
    Yields:
        Control del ciclo de vida de la aplicación
    """
    # Startup
    logger.info("🚀 Inicializando base de datos...")
    try:
        init_db()
        logger.info("✅ Base de datos inicializada exitosamente")
    except Exception as e:
        logger.error(f"❌ Error inicializando base de datos: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("👋 Cerrando aplicación...")


def create_app() -> FastAPI:
    """Crear y configurar la aplicación FastAPI.
    
    Returns:
        FastAPI: Instancia configurada de la aplicación
    """
    # Determinar si estamos en producción
    environment = os.getenv("ENVIRONMENT", "development")
    is_production = environment == "production"
    
    # Crear aplicación FastAPI
    app = FastAPI(
        title="Sistema Consultorio Jurídico UCMC",
        version="1.0.0-production",
        description=(
            "API para el sistema de gestión del Consultorio Jurídico "
            "de la Universidad Colegio Mayor de Cundinamarca"
        ),
        docs_url=None if is_production else "/docs",
        redoc_url=None if is_production else "/redoc",
        lifespan=lifespan,
    )
    
    # Middleware de seguridad
    allowed_hosts = ["*"]
    if is_production:
        allowed_hosts = ["localhost", "127.0.0.1"]
    
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=allowed_hosts,
    )
    
    # Middleware de compresión
    app.add_middleware(
        GZipMiddleware,
        minimum_size=1000,
    )
    
    # Configuración CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:3002",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    
    # Incluir rutas
    app.include_router(
        auth.router,
        prefix="/api/auth",
        tags=["auth"],
    )
    app.include_router(
        control_operativo.router,
        prefix="/api/control-operativo",
        tags=["control-operativo"],
    )
    
    return app


# Crear instancia de la aplicación
app = create_app()


@app.get("/")
async def root() -> Dict[str, str]:
    """Endpoint raíz de la API.
    
    Returns:
        Dict[str, str]: Mensaje de estado de la API
    """
    return {"message": "App Derecho API is running"}


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Endpoint de verificación de salud del sistema.
    
    Returns:
        Dict[str, Any]: Estado de salud del sistema
    """
    try:
        timestamp = datetime.now().isoformat()
        environment = os.getenv("ENVIRONMENT", "development")
        
        # Verificar conexión a base de datos
        db_path = "./database/app_derecho.db"
        if not os.path.exists(db_path):
            db_path = "./app_derecho.db"
        
        if not os.path.exists(db_path):
            return {
                "status": "unhealthy",
                "error": "Base de datos no encontrada",
                "timestamp": timestamp,
            }
        
        # Test de conexión a base de datos
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
        
        # Verificar directorio de uploads
        uploads_exists = os.path.exists("./uploads")
        
        return {
            "status": "healthy",
            "timestamp": timestamp,
            "database": "connected",
            "users_count": user_count,
            "uploads_directory": "available" if uploads_exists else "missing",
            "version": "production-v1.0",
            "environment": environment,
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }


@app.get("/test-cors")
async def test_cors() -> Dict[str, str]:
    """Endpoint para probar configuración CORS.
    
    Returns:
        Dict[str, str]: Mensaje de prueba con timestamp
    """
    return {
        "message": "CORS working",
        "timestamp": datetime.now().isoformat(),
    }


def main() -> None:
    """Función principal para ejecutar el servidor."""
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info("🚀 Sistema Consultorio Jurídico UCMC")
    logger.info(f"📍 Servidor iniciando en {host}:{port}")
    logger.info(f"🌐 API disponible en: http://localhost:{port}")
    logger.info(f"💊 Health check: http://localhost:{port}/health")
    
    if os.getenv("ENVIRONMENT") != "production":
        logger.info(f"📚 Documentación: http://localhost:{port}/docs")
    
    logger.info("💡 Presiona Ctrl+C para detener")
    
    try:
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            log_level="info",
            reload=os.getenv("ENVIRONMENT") != "production",
        )
    except KeyboardInterrupt:
        logger.info("👋 Servidor detenido correctamente")
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        raise


if __name__ == "__main__":
    main()