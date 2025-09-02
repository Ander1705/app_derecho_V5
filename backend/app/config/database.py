from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration - SQLite para desarrollo
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app_derecho.db")

# Create SQLAlchemy engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=os.getenv("DEBUG", "False").lower() == "true"
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=10,
        max_overflow=20,
        echo=os.getenv("DEBUG", "False").lower() == "true"
    )

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """
    Dependency for getting database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Initialize database tables
    """
    try:
        # Import only essential models for student system to register with SQLAlchemy
        from app.models import user, estudiante_valido, control_operativo, documento
        # Ensure models are loaded into SQLAlchemy metadata
        _ = user, estudiante_valido, control_operativo, documento
        
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables initialized successfully")
    except Exception as e:
        print(f"⚠️ Database initialization error: {e}")
        if not os.getenv("DEBUG", "False").lower() == "true":
            raise


def drop_db():
    """
    Drop all database tables (for testing)
    """
    Base.metadata.drop_all(bind=engine)