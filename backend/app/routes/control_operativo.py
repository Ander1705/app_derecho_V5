from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel
import os
import tempfile

# Imports del proyecto
from app.config.database import get_db
from app.middleware.auth import AuthMiddleware
from app.models.user import User, UserRole
from app.models.control_operativo import ControlOperativo
from app.models.documento import Documento
from app.services.pdf_generator import pdf_generator
from app.services.notification_service import notification_service

router = APIRouter()

# =============================================================================
# MODELOS PYDANTIC PARA REQUESTS Y RESPONSES  
# =============================================================================

class ControlOperativoCreate(BaseModel):
    # I. DATOS DEL USUARIO
    ciudad: str = "Bogotá D.C"
    fecha_dia: int
    fecha_mes: int
    fecha_ano: int
    nombre_docente_responsable: Optional[str] = None
    nombre_estudiante: str
    area_consulta: Optional[str] = None
    
    # II. INFORMACIÓN GENERAL DEL CONSULTANTE
    remitido_por: Optional[str] = None
    correo_electronico: Optional[str] = None
    nombre_consultante: str
    edad: Optional[int] = None
    fecha_nacimiento_dia: Optional[int] = None
    fecha_nacimiento_mes: Optional[int] = None
    fecha_nacimiento_ano: Optional[int] = None
    lugar_nacimiento: Optional[str] = None
    sexo: Optional[str] = None
    tipo_documento: Optional[str] = None
    numero_documento: str
    lugar_expedicion: Optional[str] = None
    direccion: Optional[str] = None
    barrio: Optional[str] = None
    estrato: Optional[int] = None
    numero_telefonico: Optional[str] = None
    numero_celular: Optional[str] = None
    estado_civil: Optional[str] = None
    escolaridad: Optional[str] = None
    profesion_oficio: Optional[str] = None
    
    # III. BREVE DESCRIPCIÓN DEL CASO
    descripcion_caso: Optional[str] = None
    
    # IV. CONCEPTO DEL ESTUDIANTE
    concepto_estudiante: Optional[str] = None
    
    # V. CONCEPTO DEL ASESOR JURÍDICO
    concepto_asesor: Optional[str] = None

class ControlOperativoUpdate(BaseModel):
    # I. DATOS DEL USUARIO
    ciudad: Optional[str] = None
    fecha_dia: Optional[int] = None
    fecha_mes: Optional[int] = None
    fecha_ano: Optional[int] = None
    nombre_docente_responsable: Optional[str] = None
    nombre_estudiante: Optional[str] = None
    area_consulta: Optional[str] = None
    
    # II. INFORMACIÓN GENERAL DEL CONSULTANTE
    remitido_por: Optional[str] = None
    correo_electronico: Optional[str] = None
    nombre_consultante: Optional[str] = None
    edad: Optional[int] = None
    fecha_nacimiento_dia: Optional[int] = None
    fecha_nacimiento_mes: Optional[int] = None
    fecha_nacimiento_ano: Optional[int] = None
    lugar_nacimiento: Optional[str] = None
    sexo: Optional[str] = None
    tipo_documento: Optional[str] = None
    numero_documento: Optional[str] = None
    lugar_expedicion: Optional[str] = None
    direccion: Optional[str] = None
    barrio: Optional[str] = None
    estrato: Optional[int] = None
    numero_telefonico: Optional[str] = None
    numero_celular: Optional[str] = None
    estado_civil: Optional[str] = None
    escolaridad: Optional[str] = None
    profesion_oficio: Optional[str] = None
    
    # III. BREVE DESCRIPCIÓN DEL CASO
    descripcion_caso: Optional[str] = None
    
    # IV. CONCEPTO DEL ESTUDIANTE
    concepto_estudiante: Optional[str] = None
    
    # V. CONCEPTO DEL ASESOR JURÍDICO
    concepto_asesor: Optional[str] = None

class ControlOperativoResponse(BaseModel):
    id: int
    # I. DATOS DEL USUARIO
    ciudad: str
    fecha_dia: int
    fecha_mes: int
    fecha_ano: int
    nombre_docente_responsable: Optional[str]
    nombre_estudiante: str
    area_consulta: Optional[str]
    
    # II. INFORMACIÓN GENERAL DEL CONSULTANTE
    remitido_por: Optional[str]
    correo_electronico: Optional[str]
    nombre_consultante: str
    edad: Optional[int]
    fecha_nacimiento_dia: Optional[int]
    fecha_nacimiento_mes: Optional[int]
    fecha_nacimiento_ano: Optional[int]
    lugar_nacimiento: Optional[str]
    sexo: Optional[str]
    tipo_documento: Optional[str]
    numero_documento: str
    lugar_expedicion: Optional[str]
    direccion: Optional[str]
    barrio: Optional[str]
    estrato: Optional[int]
    numero_telefonico: Optional[str]
    numero_celular: Optional[str]
    estado_civil: Optional[str]
    escolaridad: Optional[str]
    profesion_oficio: Optional[str]
    
    # III. BREVE DESCRIPCIÓN DEL CASO
    descripcion_caso: Optional[str]
    
    # IV. CONCEPTO DEL ESTUDIANTE
    concepto_estudiante: Optional[str]
    
    # V. CONCEPTO DEL ASESOR JURÍDICO
    concepto_asesor: Optional[str]
    
    # Campos de control
    activo: bool
    created_at: datetime
    updated_at: datetime
    created_by: int

    model_config = {"from_attributes": True}

# =============================================================================
# ENDPOINTS CRUD
# =============================================================================

@router.post("/", response_model=ControlOperativoResponse)
async def crear_control_operativo(
    control_data: ControlOperativoCreate,
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nuevo control operativo"""
    try:
        # Convertir datos a diccionario
        data_dict = control_data.model_dump()
        
        # Auto-llenar algunos campos basados en el usuario actual
        if current_user.role == UserRole.ESTUDIANTE:
            # Si es estudiante, usar sus datos
            data_dict['nombre_estudiante'] = current_user.nombre_completo
        
        # Crear el control operativo
        db_control = ControlOperativo(
            created_by=current_user.id,
            **data_dict
        )
        
        db.add(db_control)
        db.commit()
        db.refresh(db_control)
        
        # Enviar notificación automática al coordinador
        try:
            control_data = {
                'numero_control': str(db_control.id),
                'nombre_consultante': db_control.nombre_consultante,
                'area_consulta': db_control.area_consulta or 'No especificada',
                'telefono_consultante': db_control.numero_telefonico or db_control.numero_celular or 'No especificado'
            }
            await notification_service.notify_new_control_operativo(control_data, current_user.email)
        except Exception as notification_error:
            print(f"⚠️ Error enviando notificación de nuevo control operativo: {notification_error}")
        
        return ControlOperativoResponse.model_validate(db_control)
        
    except Exception as e:
        print(f"❌ Error creando control operativo: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )

@router.get("/list")
async def listar_controles_operativos_simple(
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Listar todos los controles operativos sin paginación (usado por dashboard)"""
    try:
        print(f"🔍 Usuario consultando lista: {current_user.email} (ID: {current_user.id}, Role: {current_user.role})")
        
        if current_user.role == UserRole.COORDINADOR:
            # Coordinadores ven todos los controles
            controles = db.query(ControlOperativo).filter(
                ControlOperativo.activo == True
            ).order_by(ControlOperativo.created_at.desc()).all()
        else:
            # Estudiantes ven solo los suyos
            print(f"👨‍🎓 Buscando controles del estudiante con ID: {current_user.id}")
            controles = db.query(ControlOperativo).filter(
                ControlOperativo.created_by == current_user.id,
                ControlOperativo.activo == True
            ).order_by(ControlOperativo.created_at.desc()).all()
            print(f"📊 Encontrados {len(controles)} controles para el estudiante")
        
        # Respuesta simple para uso en dashboard y filtros
        controles_data = [{
            "id": control.id,
            "nombre_consultante": control.nombre_consultante,
            "numero_documento": control.numero_documento,
            "nombre_estudiante": control.nombre_estudiante,
            "area_consulta": control.area_consulta,
            "fecha_dia": control.fecha_dia,
            "fecha_mes": control.fecha_mes,
            "fecha_ano": control.fecha_ano,
            "created_at": control.created_at.isoformat() if control.created_at else None,
            "activo": control.activo
        } for control in controles]
        
        return controles_data
        
    except Exception as e:
        print(f"❌ Error listando controles operativos (simple): {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/")
async def listar_controles_operativos(
    page: int = 1,
    limit: int = 50,  # Límite por defecto - últimos 50 según CLAUDE.md
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Listar controles operativos con paginación OPTIMIZADA"""
    try:
        # Calcular offset para paginación
        offset = (page - 1) * limit
        
        if current_user.role == UserRole.COORDINADOR:
            # Coordinadores ven controles con PAGINACIÓN (no todos)
            controles = db.query(ControlOperativo).order_by(
                ControlOperativo.created_at.desc()
            ).offset(offset).limit(limit).all()
            
            # Total count para paginación (consulta optimizada)
            total = db.query(ControlOperativo).count()
        else:
            # Estudiantes ven solo los suyos con PAGINACIÓN
            controles = db.query(ControlOperativo).filter(
                ControlOperativo.created_by == current_user.id,
                ControlOperativo.activo == True
            ).order_by(ControlOperativo.created_at.desc()).offset(offset).limit(limit).all()
            
            # Total count para estudiante
            total = db.query(ControlOperativo).filter(
                ControlOperativo.created_by == current_user.id,
                ControlOperativo.activo == True
            ).count()
        
        # Calcular información de paginación
        total_pages = (total + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1
        
        # Respuesta optimizada con campos esenciales para la lista y filtros
        controles_data = [{
            "id": control.id,
            "nombre_consultante": control.nombre_consultante,
            "numero_documento": control.numero_documento,
            "nombre_estudiante": control.nombre_estudiante,
            "area_consulta": control.area_consulta,
            "fecha_dia": control.fecha_dia,
            "fecha_mes": control.fecha_mes,
            "fecha_ano": control.fecha_ano,
            "created_at": control.created_at.isoformat() if control.created_at else None,
            "activo": control.activo
        } for control in controles]
        
        # Respuesta paginada
        return {
            "items": controles_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
                "has_next": has_next,
                "has_prev": has_prev
            }
        }
        
    except Exception as e:
        print(f"❌ Error listando controles operativos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/{control_id}")
async def obtener_control_operativo(
    control_id: int,
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener control operativo por ID"""
    try:
        # Coordinadores pueden ver cualquier control (activo o inactivo)
        if current_user.role == UserRole.COORDINADOR:
            control = db.query(ControlOperativo).filter(
                ControlOperativo.id == control_id
            ).first()
        else:
            # Estudiantes solo pueden ver sus propios controles activos
            control = db.query(ControlOperativo).filter(
                ControlOperativo.id == control_id,
                ControlOperativo.created_by == current_user.id,
                ControlOperativo.activo == True
            ).first()
        
        if not control:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Control operativo no encontrado"
            )
        
        # Respuesta simplificada
        return {
            "id": control.id,
            "ciudad": control.ciudad,
            "fecha_dia": control.fecha_dia,
            "fecha_mes": control.fecha_mes,
            "fecha_ano": control.fecha_ano,
            "nombre_docente_responsable": getattr(control, 'nombre_docente_responsable', None),
            "nombre_estudiante": control.nombre_estudiante,
            "area_consulta": getattr(control, 'area_consulta', None),
            "remitido_por": getattr(control, 'remitido_por', None),
            "correo_electronico": getattr(control, 'correo_electronico', None),
            "nombre_consultante": control.nombre_consultante,
            "edad": getattr(control, 'edad', None),
            "fecha_nacimiento_dia": getattr(control, 'fecha_nacimiento_dia', None),
            "fecha_nacimiento_mes": getattr(control, 'fecha_nacimiento_mes', None),
            "fecha_nacimiento_ano": getattr(control, 'fecha_nacimiento_ano', None),
            "lugar_nacimiento": getattr(control, 'lugar_nacimiento', None),
            "sexo": getattr(control, 'sexo', None),
            "tipo_documento": getattr(control, 'tipo_documento', None),
            "numero_documento": control.numero_documento,
            "lugar_expedicion": getattr(control, 'lugar_expedicion', None),
            "direccion": getattr(control, 'direccion', None),
            "barrio": getattr(control, 'barrio', None),
            "estrato": getattr(control, 'estrato', None),
            "numero_telefonico": getattr(control, 'numero_telefonico', None),
            "numero_celular": getattr(control, 'numero_celular', None),
            "estado_civil": getattr(control, 'estado_civil', None),
            "escolaridad": getattr(control, 'escolaridad', None),
            "profesion_oficio": getattr(control, 'profesion_oficio', None),
            "descripcion_caso": getattr(control, 'descripcion_caso', None),
            "concepto_estudiante": getattr(control, 'concepto_estudiante', None),
            "concepto_asesor": getattr(control, 'concepto_asesor', None),
            "activo": control.activo,
            "created_at": control.created_at.isoformat() if control.created_at else None,
            "updated_at": control.updated_at.isoformat() if control.updated_at else None,
            "created_by": control.created_by
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error obteniendo control operativo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.put("/{control_id}")
async def actualizar_control_operativo(
    control_id: int,
    control_update: ControlOperativoUpdate,
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar control operativo"""
    try:
        # Coordinadores pueden editar cualquier control (activo o inactivo)
        if current_user.role == UserRole.COORDINADOR:
            control = db.query(ControlOperativo).filter(
                ControlOperativo.id == control_id
            ).first()
        else:
            # Estudiantes no pueden editar controles operativos
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Los estudiantes no pueden editar controles operativos"
            )
        
        if not control:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Control operativo no encontrado"
            )
        
        # Solo coordinadores pueden editar (ya verificado arriba)
        
        # Actualizar campos
        update_data = control_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(control, field, value)
        
        # Actualizar timestamp
        try:
            from datetime import datetime
            control.updated_at = datetime.now()
        except:
            pass  # Si falla el timestamp, continuar con la actualización
        
        db.commit()
        db.refresh(control)
        
        print(f"✅ Control operativo {control_id} actualizado por {current_user.role} (ID: {current_user.id})")
        
        # Respuesta simplificada para evitar errores de validación
        return {
            "id": control.id,
            "ciudad": control.ciudad,
            "fecha_dia": control.fecha_dia,
            "fecha_mes": control.fecha_mes,
            "fecha_ano": control.fecha_ano,
            "nombre_estudiante": control.nombre_estudiante,
            "nombre_consultante": control.nombre_consultante,
            "numero_documento": control.numero_documento,
            "descripcion_caso": control.descripcion_caso,
            "concepto_estudiante": control.concepto_estudiante,
            "concepto_asesor": control.concepto_asesor,
            "activo": control.activo,
            "created_at": control.created_at.isoformat() if control.created_at else None,
            "updated_at": control.updated_at.isoformat() if control.updated_at else None,
            "created_by": control.created_by
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error actualizando control operativo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.delete("/{control_id}")
async def eliminar_control_operativo(
    control_id: int,
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar control operativo"""
    try:
        control = db.query(ControlOperativo).filter(
            ControlOperativo.id == control_id
        ).first()
        
        if not control:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Control operativo no encontrado"
            )
        
        # Solo coordinadores pueden eliminar controles operativos
        if current_user.role != UserRole.COORDINADOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo coordinadores pueden eliminar controles operativos"
            )
        
        # Eliminación lógica
        control.activo = False
        try:
            from datetime import datetime
            control.updated_at = datetime.now()
        except:
            pass  # Si falla el timestamp, continuar con la eliminación
        
        db.commit()
        
        print(f"✅ Control operativo {control_id} eliminado por {current_user.role} (ID: {current_user.id})")
        
        return {"mensaje": "Control operativo eliminado correctamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error eliminando control operativo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/{control_id}/reactivar")
async def reactivar_control_operativo(
    control_id: int,
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Reactivar control operativo eliminado - Solo coordinadores"""
    try:
        # Solo coordinadores pueden reactivar
        if current_user.role != UserRole.COORDINADOR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo coordinadores pueden reactivar controles operativos"
            )
        
        control = db.query(ControlOperativo).filter(
            ControlOperativo.id == control_id
        ).first()
        
        if not control:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Control operativo no encontrado"
            )
        
        # Reactivar el control
        control.activo = True
        try:
            from datetime import datetime
            control.updated_at = datetime.now()
        except:
            pass
        
        db.commit()
        
        print(f"✅ Control operativo {control_id} reactivado por coordinador (ID: {current_user.id})")
        
        return {"mensaje": "Control operativo reactivado correctamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error reactivando control operativo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/{control_id}/pdf")
async def generar_pdf_control_operativo(
    control_id: int,
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Generar y descargar PDF del control operativo"""
    try:
        # Obtener control operativo con documentos adjuntos
        from sqlalchemy.orm import joinedload
        control = db.query(ControlOperativo).options(
            joinedload(ControlOperativo.documentos)
        ).filter(
            ControlOperativo.id == control_id,
            ControlOperativo.activo == True
        ).first()
        
        # Verificar que se encontró el control operativo
        print(f"🔍 Control operativo {control_id} {'encontrado' if control else 'NO encontrado'}")
        
        if not control:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Control operativo no encontrado"
            )
        
        # Verificar permisos
        if current_user.role == UserRole.ESTUDIANTE and control.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para generar el PDF de este control operativo"
            )
        
        # Generar PDF usando el generador con PDFs adjuntos unidos
        pdf_buffer = pdf_generator.generate_pdf_with_attachments(control)
        
        # Nombre del archivo
        fecha_str = f"{control.fecha_ano}{control.fecha_mes:02d}{control.fecha_dia:02d}" if control.fecha_ano and control.fecha_mes and control.fecha_dia else datetime.now().strftime('%Y%m%d')
        nombre_archivo = f"control_operativo_{control.id}_{fecha_str}.pdf"
        
        # Retornar el PDF como respuesta de streaming
        return StreamingResponse(
            iter([pdf_buffer.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generando PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

# =============================================================================
# ENDPOINTS PARA MANEJO DE ARCHIVOS
# =============================================================================

@router.post("/{control_id}/documentos/upload")
async def subir_documentos(
    control_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Subir múltiples documentos a un control operativo"""
    try:
        # Verificar que el control operativo existe
        control = db.query(ControlOperativo).filter(
            ControlOperativo.id == control_id,
            ControlOperativo.activo == True
        ).first()
        
        if not control:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Control operativo no encontrado"
            )
        
        # Verificar permisos
        if current_user.role == UserRole.ESTUDIANTE and control.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para subir archivos a este control operativo"
            )
        
        # Verificar límite de archivos (30 máximo)
        documentos_existentes = db.query(Documento).filter(
            Documento.control_operativo_id == control_id,
            Documento.activo == True
        ).count()
        
        if documentos_existentes + len(files) > 30:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Máximo 30 archivos por control operativo. Ya tienes {documentos_existentes} archivos."
            )
        
        documentos_creados = []
        
        for file in files:
            # Validar que solo sean archivos PDF
            if not file.filename.lower().endswith('.pdf'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Solo se permiten archivos PDF. El archivo {file.filename} no es válido."
                )
            
            # Validar tipo de archivo y tamaño individual
            if file.size > 5 * 1024 * 1024:  # 5MB máximo por archivo individual
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El archivo {file.filename} es muy grande (máximo 5MB por archivo)"
                )
            
            # Leer contenido del archivo
            contenido = await file.read()
            
            # Generar nombre único para el archivo
            import uuid
            extension = file.filename.split('.')[-1] if '.' in file.filename else ''
            nombre_unico = f"{uuid.uuid4()}.{extension}" if extension else str(uuid.uuid4())
            
            # Crear documento en la base de datos
            documento = Documento(
                control_operativo_id=control_id,
                nombre_original=file.filename,
                nombre_archivo=nombre_unico,
                tipo_contenido=file.content_type or 'application/octet-stream',
                tamaño=file.size,
                contenido=contenido,
                created_by=current_user.id
            )
            
            db.add(documento)
            documentos_creados.append({
                "nombre_original": file.filename,
                "tipo_contenido": file.content_type,
                "tamaño": file.size
            })
        
        db.commit()
        
        print(f"✅ {len(files)} documentos subidos para control operativo {control_id}")
        
        return {
            "mensaje": f"{len(files)} archivos subidos correctamente",
            "documentos": documentos_creados
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error subiendo documentos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/{control_id}/documentos")
async def listar_documentos(
    control_id: int,
    page: int = 1,
    limit: int = 50,  # Límite para escalabilidad
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Listar documentos de un control operativo con PAGINACIÓN"""
    try:
        # Verificar que el control operativo existe
        control = db.query(ControlOperativo).filter(
            ControlOperativo.id == control_id,
            ControlOperativo.activo == True
        ).first()
        
        if not control:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Control operativo no encontrado"
            )
        
        # Verificar permisos
        if current_user.role == UserRole.ESTUDIANTE and control.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para ver los archivos de este control operativo"
            )
        
        # Calcular offset
        offset = (page - 1) * limit
        
        # Obtener documentos con PAGINACIÓN
        documentos = db.query(Documento).filter(
            Documento.control_operativo_id == control_id,
            Documento.activo == True
        ).order_by(Documento.created_at.desc()).offset(offset).limit(limit).all()
        
        # Total count
        total = db.query(Documento).filter(
            Documento.control_operativo_id == control_id,
            Documento.activo == True
        ).count()
        
        # Información de paginación
        total_pages = (total + limit - 1) // limit
        
        return {
            "items": [doc.to_dict() for doc in documentos],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error listando documentos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/{control_id}/documentos/{documento_id}/download")
async def descargar_documento(
    control_id: int,
    documento_id: int,
    current_user: User = Depends(AuthMiddleware.get_current_user),
    db: Session = Depends(get_db)
):
    """Descargar un documento específico"""
    try:
        # Verificar que el documento existe y pertenece al control operativo
        documento = db.query(Documento).filter(
            Documento.id == documento_id,
            Documento.control_operativo_id == control_id,
            Documento.activo == True
        ).first()
        
        if not documento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Documento no encontrado"
            )
        
        # Verificar permisos
        control = documento.control_operativo
        if current_user.role == UserRole.ESTUDIANTE and control.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para descargar este archivo"
            )
        
        # Retornar archivo como respuesta de streaming
        return StreamingResponse(
            iter([documento.contenido]),
            media_type=documento.tipo_contenido,
            headers={"Content-Disposition": f"attachment; filename={documento.nombre_original}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error descargando documento: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )