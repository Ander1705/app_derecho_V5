from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Date, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
from app.config.database import Base

def get_colombia_time():
    """Retorna la fecha/hora actual en zona horaria de Colombia (UTC-5)"""
    colombia_tz = timezone(timedelta(hours=-5))
    return datetime.now(colombia_tz).replace(tzinfo=None)

class ControlOperativo(Base):
    __tablename__ = "controles_operativos"

    # ID y metadatos
    id = Column(Integer, primary_key=True, index=True)
    
    # I. DATOS DEL USUARIO
    ciudad = Column(String(100), nullable=False, default="Bogotá D.C")
    fecha_dia = Column(Integer, nullable=False)
    fecha_mes = Column(Integer, nullable=False)
    fecha_ano = Column(Integer, nullable=False)
    nombre_docente_responsable = Column(String(255), nullable=True)
    nombre_estudiante = Column(String(255), nullable=False)
    area_consulta = Column(String(100), nullable=True)
    
    # II. INFORMACIÓN GENERAL DEL CONSULTANTE
    remitido_por = Column(String(255), nullable=True)
    correo_electronico = Column(String(255), nullable=True)
    nombre_consultante = Column(String(255), nullable=False)
    edad = Column(Integer, nullable=True)
    fecha_nacimiento_dia = Column(Integer, nullable=True)
    fecha_nacimiento_mes = Column(Integer, nullable=True)
    fecha_nacimiento_ano = Column(Integer, nullable=True)
    lugar_nacimiento = Column(String(255), nullable=True)
    sexo = Column(String(20), nullable=True)  # Femenino/Masculino
    tipo_documento = Column(String(10), nullable=True)  # T.I./C.C./NUIP
    numero_documento = Column(String(20), nullable=False)
    lugar_expedicion = Column(String(255), nullable=True)
    direccion = Column(String(255), nullable=True)
    barrio = Column(String(100), nullable=True)
    estrato = Column(Integer, nullable=True)
    numero_telefonico = Column(String(20), nullable=True)
    numero_celular = Column(String(20), nullable=True)
    estado_civil = Column(String(50), nullable=True)
    escolaridad = Column(String(100), nullable=True)
    profesion_oficio = Column(String(100), nullable=True)
    
    # III. BREVE DESCRIPCIÓN DEL CASO
    descripcion_caso = Column(Text, nullable=True)
    
    # IV. CONCEPTO DEL ESTUDIANTE
    concepto_estudiante = Column(Text, nullable=True)
    
    # V. CONCEPTO DEL ASESOR JURÍDICO
    concepto_asesor = Column(Text, nullable=True)
    
    # VI. DECLARACIÓN DEL USUARIO (texto fijo)
    # Este campo se llenará automáticamente con el texto estándar
    
    # Campos de control
    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=get_colombia_time)
    updated_at = Column(DateTime, nullable=False, default=get_colombia_time, onupdate=get_colombia_time)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relaciones
    user = relationship("User", back_populates="controles_operativos")
    documentos = relationship("Documento", back_populates="control_operativo")

    def __repr__(self):
        return f"<ControlOperativo(id={self.id}, estudiante='{self.nombre_estudiante}', fecha={self.fecha_dia}/{self.fecha_mes}/{self.fecha_ano})>"

    def to_dict(self):
        """Convierte el objeto a diccionario para API"""
        return {
            "id": self.id,
            # I. DATOS DEL USUARIO
            "ciudad": self.ciudad,
            "fecha_dia": self.fecha_dia,
            "fecha_mes": self.fecha_mes,
            "fecha_ano": self.fecha_ano,
            "nombre_docente_responsable": self.nombre_docente_responsable,
            "nombre_estudiante": self.nombre_estudiante,
            "area_consulta": self.area_consulta,
            # II. INFORMACIÓN GENERAL DEL CONSULTANTE
            "remitido_por": self.remitido_por,
            "correo_electronico": self.correo_electronico,
            "nombre_consultante": self.nombre_consultante,
            "edad": self.edad,
            "fecha_nacimiento_dia": self.fecha_nacimiento_dia,
            "fecha_nacimiento_mes": self.fecha_nacimiento_mes,
            "fecha_nacimiento_ano": self.fecha_nacimiento_ano,
            "lugar_nacimiento": self.lugar_nacimiento,
            "sexo": self.sexo,
            "tipo_documento": self.tipo_documento,
            "numero_documento": self.numero_documento,
            "lugar_expedicion": self.lugar_expedicion,
            "direccion": self.direccion,
            "barrio": self.barrio,
            "estrato": self.estrato,
            "numero_telefonico": self.numero_telefonico,
            "numero_celular": self.numero_celular,
            "estado_civil": self.estado_civil,
            "escolaridad": self.escolaridad,
            "profesion_oficio": self.profesion_oficio,
            # III. BREVE DESCRIPCIÓN DEL CASO
            "descripcion_caso": self.descripcion_caso,
            # IV. CONCEPTO DEL ESTUDIANTE
            "concepto_estudiante": self.concepto_estudiante,
            # V. CONCEPTO DEL ASESOR JURÍDICO
            "concepto_asesor": self.concepto_asesor,
            # Campos de control
            "activo": self.activo,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by": self.created_by
        }