from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional
import random
import string

from app.config.database import get_db
from app.config.auth import SecurityConfig
from app.middleware.auth import AuthMiddleware
from app.models.user import User, UserRole
from app.models.password_reset import PasswordResetToken
from app.models.password_recovery import PasswordRecovery
from app.models.estudiante_valido import EstudianteValido, EstadoRegistro
from app.models.control_operativo import ControlOperativo
from app.services.email_service import email_service
from app.services.notification_service import notification_service

router = APIRouter()

# =============================================================================
# MODELOS PYDANTIC PARA REQUESTS Y RESPONSES
# =============================================================================

class ValidarCodigoRequest(BaseModel):
    codigo_estudiante: str

class ValidarDatosPersonalesRequest(BaseModel):
    documento_numero: str

class ValidarCodigoResponse(BaseModel):
    valido: bool
    estudiante: Optional[dict] = None
    mensaje: str

class RegistroEstudianteRequest(BaseModel):
    codigo_estudiante: str
    nombre: str
    apellidos: str
    password: str
    telefono: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: int
    nombre: str
    apellidos: str
    email: str
    role: UserRole
    codigo_estudiante: Optional[str] = None
    programa_academico: Optional[str] = None
    semestre: Optional[int] = None
    telefono: Optional[str] = None
    activo: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# Mantenemos el modelo original para compatibilidad
class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str

# =============================================================================
# ENDPOINTS PARA ESTUDIANTES
# =============================================================================

@router.post("/validar-codigo", response_model=ValidarCodigoResponse)
async def validar_codigo_estudiante(
    request: ValidarCodigoRequest,
    db: Session = Depends(get_db)
):
    """Validar código de estudiante para registro"""
    try:
        # Buscar estudiante válido con el código
        estudiante = db.query(EstudianteValido).filter(
            EstudianteValido.codigo_estudiante == request.codigo_estudiante.upper(),
            EstudianteValido.activo == True
        ).first()
        
        if not estudiante:
            return ValidarCodigoResponse(
                valido=False,
                mensaje="❌ Código de estudiante no válido. Contacta al coordinador."
            )
        
        if estudiante.estado == EstadoRegistro.REGISTRADO:
            return ValidarCodigoResponse(
                valido=False,
                mensaje="❌ Este código ya fue utilizado para crear una cuenta."
            )
        
        # Código válido
        return ValidarCodigoResponse(
            valido=True,
            estudiante={
                "nombre": estudiante.nombre,
                "apellidos": estudiante.apellidos,
                "email_institucional": estudiante.email_institucional,
                "programa_academico": estudiante.programa_academico,
                "semestre": estudiante.semestre,
                "codigo_estudiante": estudiante.codigo_estudiante
            },
            mensaje="✅ Código válido. Puedes completar tu registro."
        )
        
    except Exception as e:
        print(f"❌ Error en validación de código: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

@router.post("/validar-datos-personales", response_model=ValidarCodigoResponse)
async def validar_datos_personales(
    request: ValidarDatosPersonalesRequest,
    db: Session = Depends(get_db)
):
    """Validar estudiante por número de identificación para registro"""
    try:
        # Buscar estudiante válido solo por número de documento
        estudiante = db.query(EstudianteValido).filter(
            EstudianteValido.documento_numero == request.documento_numero.strip(),
            EstudianteValido.activo == True
        ).first()
        
        if not estudiante:
            return ValidarCodigoResponse(
                valido=False,
                mensaje="❌ No se encontró un estudiante pre-registrado con este número de identificación. Contacta al coordinador."
            )
        
        if estudiante.estado == EstadoRegistro.REGISTRADO:
            return ValidarCodigoResponse(
                valido=False,
                mensaje="❌ Este estudiante ya ha completado su registro."
            )
        
        # Datos válidos - devolver información para que el estudiante complete nombres y apellidos
        return ValidarCodigoResponse(
            valido=True,
            estudiante={
                "nombre": estudiante.nombre,  # Para mostrar como placeholder/sugerencia
                "apellidos": estudiante.apellidos,  # Para mostrar como placeholder/sugerencia
                "email_institucional": estudiante.email_institucional,
                "programa_academico": estudiante.programa_academico,
                "semestre": estudiante.semestre,
                "codigo_estudiante": estudiante.codigo_estudiante,
                "documento_numero": estudiante.documento_numero
            },
            mensaje="✅ Estudiante encontrado. Completa tu información personal para continuar con el registro."
        )
        
    except Exception as e:
        print(f"❌ Error en validación por documento: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

@router.post("/registro-estudiante")
async def registrar_estudiante(
    request: RegistroEstudianteRequest,
    db: Session = Depends(get_db)
):
    """Completar registro de estudiante usando código válido"""
    try:
        # Volver a validar el código
        estudiante = db.query(EstudianteValido).filter(
            EstudianteValido.codigo_estudiante == request.codigo_estudiante.upper(),
            EstudianteValido.activo == True,
            EstudianteValido.estado == EstadoRegistro.PENDIENTE
        ).first()
        
        if not estudiante:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="❌ Código no válido o ya utilizado."
            )
        
        # Verificar que no exista usuario con el mismo email
        existing_user = db.query(User).filter(User.email == estudiante.email_institucional).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="❌ Ya existe una cuenta con este correo electrónico."
            )
        
        # Validar contraseña
        password_check = SecurityConfig.check_password_strength(request.password)
        if not password_check["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "La contraseña no cumple con los requisitos de seguridad",
                    "requirements": password_check["messages"]
                }
            )
        
        # Crear usuario estudiante con nombres y apellidos proporcionados
        db_user = User(
            nombre=request.nombre.strip(),  # Usar nombres del formulario
            apellidos=request.apellidos.strip(),  # Usar apellidos del formulario
            email=estudiante.email_institucional,
            password_hash=SecurityConfig.get_password_hash(request.password),
            role=UserRole.ESTUDIANTE,
            codigo_estudiante=estudiante.codigo_estudiante,
            programa_academico=estudiante.programa_academico,
            semestre=estudiante.semestre,
            documento_numero=estudiante.documento_numero,
            telefono=request.telefono,
            activo=True,
            email_verificado=True
        )
        
        db.add(db_user)
        
        # Actualizar estado del estudiante a registrado
        estudiante.estado = EstadoRegistro.REGISTRADO
        
        db.commit()
        db.refresh(db_user)
        
        # Enviar notificación automática al coordinador
        try:
            student_data = {
                'nombre': db_user.nombre,
                'apellidos': db_user.apellidos,
                'email': db_user.email,
                'codigo_estudiante': db_user.codigo_estudiante,
                'programa_academico': db_user.programa_academico
            }
            await notification_service.notify_new_student_registration(student_data)
        except Exception as notification_error:
            print(f"⚠️ Error enviando notificación de nuevo estudiante: {notification_error}")
        
        # Generar tokens
        access_token = SecurityConfig.create_access_token(
            data={"sub": str(db_user.id)}
        )
        refresh_token = SecurityConfig.create_access_token(
            data={"sub": str(db_user.id)}
        )
        
        # Respuesta simplificada sin modelo complejo
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": db_user.id,
                "nombre": db_user.nombre,
                "apellidos": db_user.apellidos,
                "email": db_user.email,
                "role": db_user.role,
                "codigo_estudiante": db_user.codigo_estudiante,
                "programa_academico": db_user.programa_academico,
                "semestre": db_user.semestre,
                "telefono": db_user.telefono,
                "activo": db_user.activo,
                "created_at": db_user.created_at.isoformat() if db_user.created_at else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en registro de estudiante: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

# =============================================================================
# ENDPOINTS GENERALES DE AUTENTICACIÓN
# =============================================================================

@router.post("/login")
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Iniciar sesión - Sistema renovado y robusto"""
    try:
        # Sanitizar email
        email = user_credentials.email.lower().strip()
        
        # Buscar usuario
        user = db.query(User).filter(
            User.email == email,
            User.activo == True
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )
        
        # Verificar contraseña con nuevo sistema
        if not SecurityConfig.verify_password(user_credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas"
            )
        
        # Generar tokens
        access_token = SecurityConfig.create_access_token(
            data={"sub": str(user.id), "type": "access"}
        )
        refresh_token = SecurityConfig.create_access_token(
            data={"sub": str(user.id), "type": "refresh"},
            expires_delta=timedelta(days=7)  # Refresh tokens last 7 days
        )
        
        # Respuesta simplificada pero completa
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "nombre": user.nombre,
                "apellidos": user.apellidos,
                "email": user.email,
                "role": user.role,
                "codigo_estudiante": getattr(user, 'codigo_estudiante', None),
                "programa_academico": getattr(user, 'programa_academico', None),
                "semestre": getattr(user, 'semestre', None),
                "telefono": getattr(user, 'telefono', None),
                "activo": user.activo,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en login: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(AuthMiddleware.get_current_user)):
    """Obtener información del usuario actual"""
    return UserResponse.model_validate(current_user)

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Cambiar contraseña"""
    
    # Verificar contraseña actual
    if not SecurityConfig.verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta"
        )
    
    # Verificar fortaleza de nueva contraseña
    password_check = SecurityConfig.check_password_strength(password_data.new_password)
    if not password_check["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "La nueva contraseña no cumple con los requisitos de seguridad",
                "requirements": password_check["messages"]
            }
        )
    
    # Actualizar contraseña
    current_user.password_hash = SecurityConfig.get_password_hash(password_data.new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Contraseña cambiada exitosamente"}

@router.post("/refresh")
async def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Renovar token de acceso"""
    try:
        payload = SecurityConfig.decode_token(request.refresh_token)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tipo de token inválido"
            )
        
        user = db.query(User).filter(
            User.id == user_id,
            User.activo == True
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado"
            )
        
        # Generar nuevo token de acceso
        new_access_token = SecurityConfig.create_access_token(
            data={"sub": str(user.id)}
        )
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
        
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de renovación inválido"
        )

# =============================================================================
# ENDPOINTS DE RECUPERACIÓN DE CONTRASEÑA CON GMAIL SMTP
# =============================================================================

class RequestPasswordResetRequest(BaseModel):
    email: EmailStr

class VerifyRecoveryCodeRequest(BaseModel):
    email: EmailStr
    code: str

class ResetPasswordWithCodeRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

@router.post("/request-password-reset")
async def request_password_reset(
    request: RequestPasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Solicitar código de recuperación de contraseña vía Gmail SMTP"""
    try:
        email = request.email.lower().strip()
        
        # Verificar que el usuario existe
        user = db.query(User).filter(
            User.email == email,
            User.activo == True
        ).first()
        
        if not user:
            # Por seguridad, no revelar si el email existe o no
            return {
                "success": True,
                "message": "Si el email existe, se ha enviado un código de recuperación"
            }
        
        # Generar código de 6 dígitos
        recovery_code = f"{random.randint(100000, 999999)}"
        
        # Crear registro de recuperación en la base de datos
        recovery_record = PasswordRecovery(
            user_email=email,
            recovery_code=recovery_code,
            expires_at=datetime.utcnow() + timedelta(minutes=15),
            used=False
        )
        
        # Limpiar códigos anteriores para este email
        db.query(PasswordRecovery).filter(
            PasswordRecovery.user_email == email,
            PasswordRecovery.used == False
        ).update({"used": True})
        
        db.add(recovery_record)
        db.commit()
        
        # Enviar email con Gmail SMTP
        email_sent = await email_service.send_password_reset_email(
            to_email=email,
            user_name=f"{user.nombre} {user.apellidos}",
            reset_token=recovery_code
        )
        
        if email_sent:
            return {
                "success": True,
                "message": "Código de recuperación enviado al email",
            }
        else:
            return {
                "success": False,
                "message": "Error enviando el email de recuperación"
            }
        
    except Exception as e:
        print(f"❌ Error en request_password_reset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

@router.post("/verify-recovery-code")
async def verify_recovery_code(
    request: VerifyRecoveryCodeRequest,
    db: Session = Depends(get_db)
):
    """Verificar código de recuperación de 6 dígitos"""
    try:
        email = request.email.lower().strip()
        code = request.code.strip()
        
        # Validar formato del código
        if not code or len(code) != 6 or not code.isdigit():
            return {
                "success": False,
                "message": "Código debe tener 6 dígitos",
                "valid": False
            }
        
        # Buscar código de recuperación válido
        recovery_record = db.query(PasswordRecovery).filter(
            PasswordRecovery.user_email == email,
            PasswordRecovery.recovery_code == code,
            PasswordRecovery.used == False,
            PasswordRecovery.expires_at > datetime.utcnow()
        ).first()
        
        if recovery_record:
            return {
                "success": True,
                "message": "Código válido",
                "valid": True
            }
        else:
            # Verificar si el código existe pero está expirado o usado
            expired_record = db.query(PasswordRecovery).filter(
                PasswordRecovery.user_email == email,
                PasswordRecovery.recovery_code == code
            ).first()
            
            if expired_record:
                if expired_record.used:
                    message = "Código ya utilizado"
                else:
                    message = "Código expirado"
            else:
                message = "Código inválido"
            
            return {
                "success": False,
                "message": message,
                "valid": False
            }
        
    except Exception as e:
        print(f"❌ Error en verify_recovery_code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

@router.post("/reset-password")
async def reset_password_with_code(
    request: ResetPasswordWithCodeRequest,
    db: Session = Depends(get_db)
):
    """Restablecer contraseña usando código de verificación"""
    try:
        email = request.email.lower().strip()
        code = request.code.strip()
        
        # Verificar que el usuario existe
        user = db.query(User).filter(
            User.email == email,
            User.activo == True
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Verificar código y obtener el registro
        recovery_record = db.query(PasswordRecovery).filter(
            PasswordRecovery.user_email == email,
            PasswordRecovery.recovery_code == code,
            PasswordRecovery.used == False,
            PasswordRecovery.expires_at > datetime.utcnow()
        ).first()
        
        if not recovery_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código inválido, expirado o ya utilizado"
            )
        
        # Validar nueva contraseña
        if len(request.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña debe tener al menos 6 caracteres"
            )
        
        # Actualizar contraseña
        user.password_hash = SecurityConfig.get_password_hash(request.new_password)
        user.updated_at = datetime.utcnow()
        
        # Marcar código como usado
        recovery_record.used = True
        recovery_record.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "success": True,
            "message": "Contraseña actualizada exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en reset_password_with_code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

# =============================================================================
# ENDPOINTS PARA COORDINADOR
# =============================================================================

class RegistrarEstudianteCoordinadorRequest(BaseModel):
    nombre: str
    apellidos: str
    email_institucional: EmailStr
    documento_numero: str
    semestre: int

class EstudianteValidoResponse(BaseModel):
    id: int
    codigo_estudiante: str
    nombre: str
    apellidos: str
    email_institucional: str
    documento_numero: str
    programa_academico: str
    semestre: int
    estado: EstadoRegistro
    created_at: datetime

    model_config = {"from_attributes": True}

def verificar_coordinador(current_user: User = Depends(AuthMiddleware.get_current_user)):
    """Middleware para verificar que el usuario es coordinador"""
    if current_user.role != UserRole.COORDINADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="❌ Solo el coordinador puede realizar esta acción."
        )
    return current_user

@router.post("/coordinador/registrar-estudiante", response_model=EstudianteValidoResponse)
async def registrar_estudiante_por_coordinador(
    request: RegistrarEstudianteCoordinadorRequest,
    current_user: User = Depends(verificar_coordinador),
    db: Session = Depends(get_db)
):
    """Pre-registrar estudiante por el coordinador"""
    try:
        # Verificar documento único
        existing_documento = db.query(EstudianteValido).filter(
            EstudianteValido.documento_numero == request.documento_numero
        ).first()
        
        if existing_documento:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"❌ Ya existe un estudiante con el documento {request.documento_numero}."
            )
        
        # Verificar email único
        existing_email = db.query(EstudianteValido).filter(
            EstudianteValido.email_institucional == request.email_institucional.lower()
        ).first()
        
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"❌ Ya existe un estudiante con el email {request.email_institucional}."
            )
        
        # Generar código único de estudiante
        codigo_estudiante = EstudianteValido.generar_codigo_unico()
        
        # Verificar que el código no exista (muy improbable pero por seguridad)
        while db.query(EstudianteValido).filter(EstudianteValido.codigo_estudiante == codigo_estudiante).first():
            codigo_estudiante = EstudianteValido.generar_codigo_unico()
        
        # Crear estudiante válido
        nuevo_estudiante = EstudianteValido(
            codigo_estudiante=codigo_estudiante,
            nombre=request.nombre,
            apellidos=request.apellidos,
            email_institucional=request.email_institucional.lower(),
            documento_numero=request.documento_numero,
            programa_academico="Derecho",  # Fijo para todos
            semestre=request.semestre,
            estado=EstadoRegistro.PENDIENTE,
            activo=True
        )
        
        db.add(nuevo_estudiante)
        db.commit()
        db.refresh(nuevo_estudiante)
        
        return EstudianteValidoResponse.model_validate(nuevo_estudiante)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error registrando estudiante: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

@router.get("/coordinador/estudiantes", response_model=list[EstudianteValidoResponse])
async def listar_estudiantes(
    current_user: User = Depends(verificar_coordinador),
    db: Session = Depends(get_db)
):
    """Listar todos los estudiantes pre-registrados"""
    try:
        estudiantes = db.query(EstudianteValido).order_by(EstudianteValido.created_at.desc()).all()
        return [EstudianteValidoResponse.model_validate(est) for est in estudiantes]
        
    except Exception as e:
        print(f"❌ Error listando estudiantes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

@router.delete("/coordinador/estudiante/{estudiante_id}")
async def eliminar_estudiante(
    estudiante_id: int,
    current_user: User = Depends(verificar_coordinador),
    db: Session = Depends(get_db)
):
    """Eliminar estudiante pre-registrado"""
    try:
        estudiante = db.query(EstudianteValido).filter(EstudianteValido.id == estudiante_id).first()
        
        if not estudiante:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="❌ Estudiante no encontrado."
            )
        
        # Si el estudiante ya se registró, también eliminar el usuario y sus controles operativos
        if estudiante.estado == EstadoRegistro.REGISTRADO:
            usuario = db.query(User).filter(User.codigo_estudiante == estudiante.codigo_estudiante).first()
            if usuario:
                # Primero eliminar todos los controles operativos creados por este usuario
                controles = db.query(ControlOperativo).filter(ControlOperativo.created_by == usuario.id).all()
                for control in controles:
                    # Primero eliminar los documentos asociados al control operativo
                    from app.models.documento import Documento
                    documentos = db.query(Documento).filter(Documento.control_operativo_id == control.id).all()
                    for documento in documentos:
                        db.delete(documento)
                    
                    # Luego eliminar el control operativo
                    db.delete(control)
                
                # Luego eliminar el usuario
                db.delete(usuario)
        
        db.delete(estudiante)
        db.commit()
        
        return {"mensaje": "✅ Estudiante eliminado correctamente."}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error eliminando estudiante: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error eliminando estudiante: {str(e)}"
        )

@router.put("/coordinador/estudiante/{estudiante_id}", response_model=EstudianteValidoResponse)
async def actualizar_estudiante(
    estudiante_id: int,
    request: RegistrarEstudianteCoordinadorRequest,
    current_user: User = Depends(verificar_coordinador),
    db: Session = Depends(get_db)
):
    """Actualizar estudiante pre-registrado"""
    try:
        estudiante = db.query(EstudianteValido).filter(EstudianteValido.id == estudiante_id).first()
        
        if not estudiante:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="❌ Estudiante no encontrado."
            )
        
        # Verificar unicidad de documento (excepto el actual)
        existing_documento = db.query(EstudianteValido).filter(
            EstudianteValido.documento_numero == request.documento_numero,
            EstudianteValido.id != estudiante_id
        ).first()
        
        if existing_documento:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"❌ Ya existe otro estudiante con el documento {request.documento_numero}."
            )
        
        # Verificar unicidad de email (excepto el actual)
        existing_email = db.query(EstudianteValido).filter(
            EstudianteValido.email_institucional == request.email_institucional.lower(),
            EstudianteValido.id != estudiante_id
        ).first()
        
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"❌ Ya existe otro estudiante con el email {request.email_institucional}."
            )
        
        # Actualizar datos
        estudiante.nombre = request.nombre
        estudiante.apellidos = request.apellidos
        estudiante.email_institucional = request.email_institucional.lower()
        estudiante.documento_numero = request.documento_numero
        estudiante.semestre = request.semestre
        
        # Si el estudiante ya tiene usuario creado, también actualizar el usuario
        if estudiante.estado == EstadoRegistro.REGISTRADO:
            usuario = db.query(User).filter(User.codigo_estudiante == estudiante.codigo_estudiante).first()
            if usuario:
                usuario.nombre = request.nombre
                usuario.apellidos = request.apellidos
                usuario.email = request.email_institucional.lower()
                usuario.documento_numero = request.documento_numero
                usuario.semestre = request.semestre
        
        db.commit()
        db.refresh(estudiante)
        
        return EstudianteValidoResponse.model_validate(estudiante)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error actualizando estudiante: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

# =============================================================================
# RUTAS DE PERFIL DE USUARIO
# =============================================================================

class ActualizarPerfilRequest(BaseModel):
    nombre: str
    apellidos: str
    email: str
    telefono: Optional[str] = None

class CambiarPasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.put("/perfil")
async def actualizar_perfil(
    request: ActualizarPerfilRequest,
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar perfil del usuario actual"""
    try:
        # Verificar si el email ya existe para otro usuario
        existing_user = db.query(User).filter(
            User.email == request.email.lower(),
            User.id != current_user.id
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="❌ Ya existe otro usuario con ese email."
            )
        
        # Actualizar datos del usuario
        current_user.nombre = request.nombre
        current_user.apellidos = request.apellidos
        current_user.email = request.email.lower()
        if request.telefono:
            current_user.telefono = request.telefono
        
        db.commit()
        db.refresh(current_user)
        
        return {
            "id": current_user.id,
            "nombre": current_user.nombre,
            "apellidos": current_user.apellidos,
            "email": current_user.email,
            "telefono": current_user.telefono,
            "codigo_estudiante": current_user.codigo_estudiante,
            "role": current_user.role
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error actualizando perfil: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

@router.put("/cambiar-password")
async def cambiar_password(
    request: CambiarPasswordRequest,
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Cambiar contraseña del usuario actual"""
    try:
        # Verificar contraseña actual
        if not SecurityConfig.verify_password(request.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="❌ La contraseña actual es incorrecta."
            )
        
        # Validar nueva contraseña
        if len(request.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="❌ La nueva contraseña debe tener al menos 6 caracteres."
            )
        
        # Actualizar contraseña
        current_user.password_hash = SecurityConfig.hash_password(request.new_password)
        
        db.commit()
        
        return {"mensaje": "✅ Contraseña actualizada correctamente."}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error cambiando contraseña: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

# =============================================================================
# RUTAS DE ESTADÍSTICAS DE ESTUDIANTE
# =============================================================================


# =============================================================================
# RUTAS DE MÉTRICAS Y ACTIVIDAD PARA COORDINADOR
# =============================================================================

def verificar_coordinador_auth(current_user: User = Depends(AuthMiddleware.get_current_user)):
    """Middleware para verificar que el usuario es coordinador"""
    if current_user.role != UserRole.COORDINADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="❌ Solo el coordinador puede acceder a esta información."
        )
    return current_user

@router.get("/coordinador/metricas")
async def obtener_metricas_coordinador(
    current_user: User = Depends(verificar_coordinador_auth),
    db: Session = Depends(get_db)
):
    """Obtener métricas del dashboard del coordinador"""
    try:
        # Contar estudiantes registrados
        estudiantes_registrados = db.query(EstudianteValido).filter(
            EstudianteValido.estado == EstadoRegistro.REGISTRADO
        ).count()
        
        # Contar estudiantes pendientes
        estudiantes_pendientes = db.query(EstudianteValido).filter(
            EstudianteValido.estado == EstadoRegistro.PENDIENTE
        ).count()
        
        # Contar controles operativos del mes actual
        from datetime import datetime, timedelta
        fecha_inicio_mes = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        reportes_este_mes = db.query(ControlOperativo).filter(
            ControlOperativo.created_at >= fecha_inicio_mes
        ).count()
        
        # Contar total de reportes
        total_reportes = db.query(ControlOperativo).count()
        
        return {
            "estudiantesRegistrados": estudiantes_registrados,
            "estudiantesPendientes": estudiantes_pendientes,
            "reportesEsteMes": reportes_este_mes,
            "totalReportes": total_reportes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error obteniendo métricas del coordinador: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

@router.get("/coordinador/actividad-reciente")
async def obtener_actividad_reciente(
    current_user: User = Depends(verificar_coordinador_auth),
    db: Session = Depends(get_db)
):
    """Obtener actividad reciente para el dashboard del coordinador"""
    try:
        actividad = []
        
        # Últimos estudiantes registrados
        estudiantes_recientes = db.query(EstudianteValido).filter(
            EstudianteValido.estado == EstadoRegistro.REGISTRADO
        ).order_by(EstudianteValido.updated_at.desc()).limit(3).all()
        
        for estudiante in estudiantes_recientes:
            if estudiante.updated_at:
                tiempo_transcurrido = datetime.now() - estudiante.updated_at
                if tiempo_transcurrido.days == 0:
                    if tiempo_transcurrido.seconds < 3600:
                        tiempo = "Hace menos de 1 hora"
                    else:
                        tiempo = f"Hace {tiempo_transcurrido.seconds // 3600} horas"
                else:
                    tiempo = f"Hace {tiempo_transcurrido.days} días"
            else:
                tiempo = "Recientemente"
                
            actividad.append({
                "id": f"estudiante_{estudiante.id}",
                "tipo": "registro",
                "mensaje": f"{estudiante.nombre} {estudiante.apellidos} completó su registro",
                "tiempo": tiempo,
                "timestamp": estudiante.updated_at or estudiante.created_at
            })
        
        # Últimos controles operativos
        controles_recientes = db.query(ControlOperativo).order_by(
            ControlOperativo.created_at.desc()
        ).limit(3).all()
        
        for control in controles_recientes:
            if control.created_at:
                tiempo_transcurrido = datetime.now() - control.created_at
                if tiempo_transcurrido.days == 0:
                    if tiempo_transcurrido.seconds < 3600:
                        tiempo = "Hace menos de 1 hora"
                    else:
                        tiempo = f"Hace {tiempo_transcurrido.seconds // 3600} horas"
                else:
                    tiempo = f"Hace {tiempo_transcurrido.days} días"
            else:
                tiempo = "Recientemente"
                
            actividad.append({
                "id": f"control_{control.id}",
                "tipo": "reporte",
                "mensaje": f"Nuevo reporte: Control Operativo #{control.id}",
                "tiempo": tiempo,
                "timestamp": control.created_at
            })
        
        # Ordenar por timestamp (más reciente primero) y limitar a 5 elementos
        actividad_ordenada = sorted(actividad, key=lambda x: x.get("timestamp", datetime.min), reverse=True)[:5]
        
        # Remover timestamp del resultado final
        for item in actividad_ordenada:
            item.pop("timestamp", None)
            
        return actividad_ordenada
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error obteniendo actividad reciente: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

@router.get("/coordinador/estadisticas-perfil")
async def obtener_estadisticas_perfil_coordinador(
    current_user: User = Depends(verificar_coordinador_auth),
    db: Session = Depends(get_db)
):
    """Obtener estadísticas del perfil del coordinador"""
    try:
        # Contar estudiantes gestionados (todos los estudiantes registrados)
        estudiantes_gestionados = db.query(EstudianteValido).count()
        
        # Contar reportes supervisados (total de controles operativos)
        reportes_supervisados = db.query(ControlOperativo).count()
        
        return {
            "estudiantes_gestionados": estudiantes_gestionados,
            "reportes_supervisados": reportes_supervisados,
            "ultimo_acceso": current_user.ultimo_acceso,
            "fecha_ingreso": current_user.created_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error obteniendo estadísticas del perfil coordinador: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )

@router.get("/estudiante/estadisticas")
async def obtener_estadisticas_estudiante(
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener estadísticas del estudiante"""
    try:
        print(f"🔍 Usuario solicitando estadísticas: {current_user.email} (ID: {current_user.id}, Role: {current_user.role})")
        
        # Verificar que el usuario sea estudiante
        if current_user.role != UserRole.ESTUDIANTE:
            print(f"❌ Usuario no es estudiante: {current_user.role}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. Solo estudiantes pueden acceder a estas estadísticas."
            )
        
        print(f"👨‍🎓 Buscando controles operativos para estudiante ID: {current_user.id}")
        
        # Contar controles operativos creados por este estudiante
        try:
            controles_creados = db.query(ControlOperativo).filter(
                ControlOperativo.created_by == current_user.id
            ).count()
            print(f"📊 Total controles del usuario (incluyendo inactivos): {controles_creados}")
            
            controles_activos = db.query(ControlOperativo).filter(
                ControlOperativo.created_by == current_user.id,
                ControlOperativo.activo.is_(True)
            ).count()
            print(f"📊 Controles activos del usuario: {controles_activos}")
            controles_creados = controles_activos
        except Exception as e:
            print(f"❌ Error en consulta de controles: {e}")
            controles_creados = 0
        
        print(f"📊 Controles encontrados: {controles_creados}")
        
        resultado = {
            "controles_creados": controles_creados,
            "ultimo_acceso": current_user.ultimo_acceso.isoformat() if current_user.ultimo_acceso else None,
            "fecha_registro": current_user.created_at.isoformat() if current_user.created_at else None
        }
        
        print(f"✅ Enviando resultado: {resultado}")
        return resultado
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error obteniendo estadísticas del estudiante: {e}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor. Inténtalo nuevamente."
        )