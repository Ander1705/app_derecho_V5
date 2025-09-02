from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import time
from datetime import datetime

from app.config.auth import SecurityConfig, security
from app.config.database import get_db
from app.models.user import User, UserRole

class AuthMiddleware:
    """Enhanced authentication middleware with comprehensive security"""

    @staticmethod
    async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
    ) -> User:
        """
        Get current user from JWT token with enhanced security validation
        """
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication credentials required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        try:
            # Decode and validate token
            payload = SecurityConfig.decode_token(credentials.credentials)
            user_id = payload.get("sub")
            token_type = payload.get("type", "access")
            
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload"
                )
            
            if token_type != "access":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type for this operation"
                )
            
            # Get user from database
            user = db.query(User).filter(
                User.id == user_id,
                User.activo == True
            ).first()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or inactive"
                )
            
            # Update last access time
            user.ultimo_acceso = datetime.utcnow()
            db.commit()
            
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )

    @staticmethod
    def require_roles(allowed_roles: List[UserRole]):
        """
        Decorator factory for role-based access control
        """
        def role_dependency(current_user: User = Depends(AuthMiddleware.get_current_user)):
            if current_user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Required roles: {[role.value for role in allowed_roles]}"
                )
            return current_user
        return role_dependency

    @staticmethod
    def require_admin():
        """Require admin role"""
        def admin_dependency(current_user: User = Depends(AuthMiddleware.get_current_user)):
            if current_user.role != UserRole.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Administrator access required"
                )
            return current_user
        return admin_dependency

    @staticmethod 
    def require_lawyer_or_admin():
        """Require lawyer or admin role"""
        def lawyer_or_admin_dependency(current_user: User = Depends(AuthMiddleware.get_current_user)):
            allowed_roles = [UserRole.ADMIN, UserRole.ABOGADO]
            if current_user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Lawyer or administrator access required"
                )
            return current_user
        return lawyer_or_admin_dependency

    @staticmethod
    def require_staff():
        """Require staff access (admin, lawyer, or secretary)"""
        def staff_dependency(current_user: User = Depends(AuthMiddleware.get_current_user)):
            allowed_roles = [UserRole.ADMIN, UserRole.ABOGADO, UserRole.SECRETARIO]
            if current_user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Staff access required"
                )
            return current_user
        return staff_dependency

    @staticmethod
    def optional_auth(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        db: Session = Depends(get_db)
    ) -> Optional[User]:
        """
        Optional authentication - returns User if authenticated, None if not
        """
        if not credentials:
            return None
            
        try:
            payload = SecurityConfig.decode_token(credentials.credentials)
            user_id = payload.get("sub")
            
            if user_id:
                user = db.query(User).filter(
                    User.id == user_id,
                    User.activo == True
                ).first()
                return user
        except:
            pass
            
        return None

    @staticmethod
    def check_resource_ownership(
        resource_user_id: int,
        current_user: User
    ) -> bool:
        """
        Check if user owns the resource or has admin privileges
        """
        return (
            current_user.role == UserRole.ADMIN or 
            current_user.id == resource_user_id
        )

    @staticmethod
    def ensure_resource_access(resource_user_id: int):
        """
        Ensure user can access the resource
        """
        def resource_dependency(current_user: User = Depends(AuthMiddleware.get_current_user)):
            if not AuthMiddleware.check_resource_ownership(resource_user_id, current_user):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this resource"
                )
            return current_user
        return resource_dependency

# Convenience dependency aliases
get_current_user = AuthMiddleware.get_current_user
require_admin = AuthMiddleware.require_admin()
require_lawyer_or_admin = AuthMiddleware.require_lawyer_or_admin()
require_staff = AuthMiddleware.require_staff()
optional_auth = AuthMiddleware.optional_auth