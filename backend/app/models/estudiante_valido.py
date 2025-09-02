"""Modelo para gestión de estudiantes válidos del sistema."""

import enum
import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum as SQLEnum,
    Integer,
    String,
)

from app.config.database import Base


class EstadoRegistro(str, enum.Enum):
    """Estados posibles para el registro de un estudiante."""

    PENDIENTE = "Pendiente"
    REGISTRADO = "Registrado"


class EstudianteValido(Base):
    """Modelo para estudiantes válidos del sistema.

    Este modelo almacena los datos de estudiantes que han sido
    pre-registrados por el coordinador y pueden crear cuentas.
    """

    __tablename__ = "estudiantes_validos"

    # Campos principales
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    codigo_estudiante = Column(
        String(20), unique=True, nullable=False, index=True
    )
    nombre = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    email_institucional = Column(
        String(255), unique=True, nullable=False, index=True
    )
    documento_numero = Column(
        String(20), unique=True, nullable=False, index=True
    )

    # Programa académico fijo
    programa_academico = Column(
        String(200), default="Derecho", nullable=False
    )
    semestre = Column(Integer, nullable=False)

    # Estado del registro
    estado = Column(
        SQLEnum(EstadoRegistro),
        default=EstadoRegistro.PENDIENTE,
        nullable=False
    )
    activo = Column(Boolean, default=True, nullable=False)

    # Fechas de control
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

    @staticmethod
    def generar_codigo_unico():
        """Genera un código único para el estudiante.

        Returns:
            str: Código único en formato DER + 4 dígitos + 4 caracteres
        """
        random_digits = ''.join(
            secrets.choice('0123456789') for _ in range(4)
        )
        uuid_part = str(uuid.uuid4()).replace('-', '')[:4].upper()
        return f"DER{random_digits}{uuid_part}"

    @property
    def nombre_completo(self):
        """Retorna el nombre completo del estudiante.

        Returns:
            str: Nombre y apellidos concatenados
        """
        return f"{self.nombre} {self.apellidos}"

    def __repr__(self):
        """Representación string del modelo.

        Returns:
            str: Representación del objeto
        """
        return (
            f"<EstudianteValido("
            f"codigo='{self.codigo_estudiante}', "
            f"nombre='{self.nombre} {self.apellidos}', "
            f"estado='{self.estado}')>"
        )