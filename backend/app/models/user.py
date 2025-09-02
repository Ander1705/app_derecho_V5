"""
Modelo de usuario del sistema.
Maneja coordinadores y estudiantes con roles diferenciados.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.config.database import Base


class UserRole(str, enum.Enum):
    """Roles de usuario en el sistema."""
    COORDINADOR = "coordinador"
    ESTUDIANTE = "estudiante"


class User(Base):
    """Modelo de usuario para coordinadores y estudiantes."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.ESTUDIANTE, nullable=False)

    # Información específica para estudiantes (solo para programa Derecho)
    codigo_estudiante = Column(String(20), unique=True, nullable=True)
    programa_academico = Column(String(200), default="Derecho", nullable=True)
    semestre = Column(Integer, nullable=True)
    documento_numero = Column(String(20), nullable=True, index=True)

    # Información de contacto
    telefono = Column(String(20), nullable=True)
    direccion = Column(Text, nullable=True)

    # Estado y fechas
    activo = Column(Boolean, default=True, nullable=False)
    email_verificado = Column(Boolean, default=False, nullable=False)
    ultimo_acceso = Column(DateTime, nullable=True)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relaciones
    controles_operativos = relationship(
        "ControlOperativo", 
        back_populates="user"
    )

    @property
    def nombre_completo(self):
        """Retorna el nombre completo del usuario."""
        return f"{self.nombre} {self.apellidos}"

    def __repr__(self):
        """Representación string del modelo."""
        return (
            f"<User(id={self.id}, email='{self.email}', "
            f"role='{self.role}')>"
        )