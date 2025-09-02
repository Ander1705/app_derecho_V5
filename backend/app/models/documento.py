from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, LargeBinary
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
from app.config.database import Base

def get_colombia_time():
    """Retorna la fecha/hora actual en zona horaria de Colombia (UTC-5)"""
    colombia_tz = timezone(timedelta(hours=-5))
    return datetime.now(colombia_tz).replace(tzinfo=None)

class Documento(Base):
    __tablename__ = "documentos"

    # ID y metadatos
    id = Column(Integer, primary_key=True, index=True)
    
    # Relación con control operativo
    control_operativo_id = Column(Integer, ForeignKey("controles_operativos.id"), nullable=False)
    
    # Información del archivo
    nombre_original = Column(String(255), nullable=False)
    nombre_archivo = Column(String(255), nullable=False)  # nombre único en el sistema
    tipo_contenido = Column(String(100), nullable=False)  # MIME type
    tamaño = Column(Integer, nullable=False)  # en bytes
    
    # Contenido del archivo (almacenado como BLOB)
    contenido = Column(LargeBinary, nullable=False)
    
    # Campos de control
    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=get_colombia_time)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relaciones
    control_operativo = relationship("ControlOperativo", back_populates="documentos")
    user = relationship("User")

    def __repr__(self):
        return f"<Documento(id={self.id}, nombre='{self.nombre_original}', control_id={self.control_operativo_id})>"

    def to_dict(self):
        """Convierte el objeto a diccionario para API (sin contenido)"""
        return {
            "id": self.id,
            "control_operativo_id": self.control_operativo_id,
            "nombre_original": self.nombre_original,
            "nombre_archivo": self.nombre_archivo,
            "tipo_contenido": self.tipo_contenido,
            "tamaño": self.tamaño,
            "activo": self.activo,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by": self.created_by
        }