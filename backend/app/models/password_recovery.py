from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime, timezone, timedelta
from app.config.database import Base

def get_colombia_time():
    """Retorna la fecha/hora actual en zona horaria de Colombia (UTC-5)"""
    colombia_tz = timezone(timedelta(hours=-5))
    return datetime.now(colombia_tz).replace(tzinfo=None)

def get_expiration_time():
    """Retorna tiempo de expiración (15 minutos desde ahora)"""
    colombia_tz = timezone(timedelta(hours=-5))
    return (datetime.now(colombia_tz) + timedelta(minutes=15)).replace(tzinfo=None)

class PasswordRecovery(Base):
    __tablename__ = "password_recovery"

    # ID único
    id = Column(Integer, primary_key=True, index=True)
    
    # Email del usuario
    user_email = Column(String(255), nullable=False, index=True)
    
    # Código de recuperación de 6 dígitos
    recovery_code = Column(String(6), nullable=False)
    
    # Fecha y hora de expiración (15 minutos)
    expires_at = Column(DateTime, nullable=False)
    
    # Si el código ya fue usado
    used = Column(Boolean, nullable=False, default=False)
    
    # Fecha de creación
    created_at = Column(DateTime, nullable=False, default=get_colombia_time)
    
    def __repr__(self):
        return f"<PasswordRecovery(email='{self.user_email}', code='{self.recovery_code}', used={self.used})>"
    
    def is_expired(self):
        """Verificar si el código ha expirado"""
        if self.expires_at is None:
            return True
        current_time = get_colombia_time()
        return current_time > self.expires_at
    
    def is_valid(self):
        """Verificar si el código es válido (no usado y no expirado)"""
        return not self.used and not self.is_expired()
    
    def to_dict(self):
        """Convertir a diccionario (sin exponer el código)"""
        return {
            "id": self.id,
            "user_email": self.user_email,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "used": self.used,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_expired": self.is_expired(),
            "is_valid": self.is_valid()
        }