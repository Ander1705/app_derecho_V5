from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.config.database import Base
from datetime import datetime, timedelta

class PasswordResetToken(Base):
    """
    Modelo para tokens de recuperación de contraseña
    """
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(10), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    used = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relación con usuario
    user = relationship("User")
    
    def is_expired(self) -> bool:
        """Verificar si el token ha expirado"""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self) -> bool:
        """Verificar si el token es válido (no usado y no expirado)"""
        return not self.used and not self.is_expired()
    
    @classmethod
    def create_token(cls, user_id: int, email: str, token: str, expires_in_minutes: int = 15):
        """Crear un nuevo token de recuperación"""
        return cls(
            user_id=user_id,
            email=email,
            token=token,
            expires_at=datetime.utcnow() + timedelta(minutes=expires_in_minutes)
        )