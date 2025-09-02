from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer
import os
import hashlib
from dotenv import load_dotenv

load_dotenv()

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "ucmc-super-secret-jwt-key-production-2025")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)

class SecurityConfig:
    """Basic security configuration"""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify password using simple hash comparison
        """
        if not plain_password or not hashed_password:
            return False
            
        # Generate hash of plain password and compare
        expected_hash = SecurityConfig.get_password_hash(plain_password)
        return expected_hash == hashed_password

    @staticmethod
    def get_password_hash(password: str) -> str:
        """
        Generate password hash using SHA256
        """
        if not password:
            raise ValueError("Password cannot be empty")
        
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Alias for get_password_hash
        """
        return SecurityConfig.get_password_hash(password)

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Create JWT access token
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt

    @staticmethod
    def decode_token(token: str) -> dict:
        """
        Decode and validate JWT token
        """
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    @staticmethod
    def check_password_strength(password: str) -> dict:
        """
        Check password strength - Simple validation for students
        """
        result = {
            "valid": True,
            "score": 5,
            "messages": []
        }
        
        # Basic requirement: at least 6 characters
        if len(password) < 6:
            result["valid"] = False
            result["messages"].append("La contraseña debe tener al menos 6 caracteres")
        
        # Suggestion for stronger passwords
        if len(password) < 8:
            result["messages"].append("Sugerencia: usar al menos 8 caracteres para mayor seguridad")
        
        return result