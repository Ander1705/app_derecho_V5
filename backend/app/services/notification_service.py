import asyncio
import os
from typing import List
from datetime import datetime
from app.services.email_service import email_service
from app.config.database import SessionLocal
from app.models.user import User, UserRole
from jinja2 import Template
import logging

class NotificationService:
    """
    Servicio para envío de correos automáticos al coordinador
    """
    
    def __init__(self):
        self.base_url = os.getenv("APP_URL", "http://localhost:3000")
        
    async def send_coordinator_notification(
        self,
        event_type: str,
        event_data: dict,
        created_by_email: str = None
    ) -> bool:
        """
        Enviar notificación automática a todos los coordinadores
        """
        try:
            db = SessionLocal()
            
            # Obtener todos los coordinadores activos
            coordinadores = db.query(User).filter(
                User.role == UserRole.COORDINADOR,
                User.activo == True
            ).all()
            
            if not coordinadores:
                logging.warning("No hay coordinadores para notificar")
                db.close()
                return False
            
            # Obtener información del usuario que creó la actividad
            created_by_name = "Usuario del sistema"
            if created_by_email:
                creator = db.query(User).filter(User.email == created_by_email).first()
                if creator:
                    created_by_name = f"{creator.nombre} {creator.apellidos}"
            
            db.close()
            
            # Generar contenido del correo según el tipo de evento
            subject, html_content, redirect_url = self._generate_notification_content(
                event_type, event_data, created_by_name
            )
            
            # Enviar correo a todos los coordinadores
            success_count = 0
            for coordinador in coordinadores:
                try:
                    email_sent = await email_service.send_email(
                        to_email=coordinador.email,
                        subject=subject,
                        html_content=html_content
                    )
                    if email_sent:
                        success_count += 1
                        logging.info(f"Notificación enviada a coordinador: {coordinador.email}")
                    else:
                        logging.error(f"Error enviando notificación a: {coordinador.email}")
                        
                except Exception as e:
                    logging.error(f"Error enviando a {coordinador.email}: {e}")
            
            return success_count > 0
            
        except Exception as e:
            logging.error(f"Error en send_coordinator_notification: {e}")
            return False
    
    def _generate_notification_content(self, event_type: str, event_data: dict, created_by_name: str):
        """
        Generar contenido del correo según el tipo de evento
        """
        now = datetime.now().strftime("%d/%m/%Y %H:%M")
        
        if event_type == "nuevo_estudiante":
            subject = "[Sistema UCMC] Nuevo Estudiante Registrado"
            redirect_url = f"{self.base_url}/coordinador/estudiantes?search={event_data.get('email', '')}"
            
            html_template = Template("""
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Nuevo Estudiante Registrado</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #e6f3ff 0%, #cce7ff 100%);
                        margin: 0;
                        padding: 30px 15px;
                        min-height: 100vh;
                    }
                    .email-container {
                        max-width: 650px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 20px;
                        overflow: hidden;
                        box-shadow: 0 20px 60px rgba(0, 102, 204, 0.15);
                    }
                    .header-greeting {
                        background: linear-gradient(135deg, #f8fbff 0%, #e8f4fd 100%);
                        padding: 25px 45px;
                        border-bottom: 2px solid #e3f2fd;
                    }
                    .greeting-text {
                        font-size: 18px;
                        color: #1a365d;
                        font-weight: 600;
                        margin: 0;
                    }
                    .main-header {
                        background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
                        padding: 70px 40px 50px;
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                    }
                    .main-header::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                                    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%);
                    }
                    .shield-container {
                        position: relative;
                        z-index: 2;
                        margin-bottom: 25px;
                    }
                    .university-shield {
                        width: 90px;
                        height: 90px;
                        background: #ffffff;
                        border-radius: 50%;
                        margin: 0 auto;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                        padding: 15px;
                    }
                    .shield-svg {
                        width: 60px;
                        height: 60px;
                        filter: drop-shadow(0 2px 4px rgba(0,102,204,0.3));
                    }
                    .header-title {
                        color: #ffffff;
                        font-size: 32px;
                        font-weight: 800;
                        margin: 0;
                        text-shadow: 0 2px 10px rgba(0,0,0,0.2);
                        position: relative;
                        z-index: 2;
                    }
                    .header-subtitle {
                        color: rgba(255,255,255,0.95);
                        font-size: 16px;
                        font-weight: 500;
                        margin-top: 8px;
                        position: relative;
                        z-index: 2;
                    }
                    .main-content {
                        background-color: #ffffff;
                        border-radius: 15px;
                        margin: -35px 35px 0;
                        padding: 55px 45px;
                        box-shadow: 0 15px 40px rgba(0,102,204,0.12);
                        position: relative;
                        z-index: 3;
                    }
                    .main-title {
                        font-size: 28px;
                        font-weight: 700;
                        color: #1a202c;
                        text-align: center;
                        margin-bottom: 20px;
                        line-height: 1.3;
                    }
                    .main-description {
                        font-size: 17px;
                        color: #4a5568;
                        text-align: center;
                        line-height: 1.7;
                        margin-bottom: 45px;
                    }
                    .student-details {
                        background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
                        border: 3px solid #0066cc;
                        border-radius: 15px;
                        padding: 35px 30px;
                        margin: 45px 0;
                    }
                    .detail-row {
                        display: flex;
                        padding: 12px 0;
                        border-bottom: 1px solid rgba(0,102,204,0.1);
                        align-items: center;
                    }
                    .detail-row:last-child {
                        border-bottom: none;
                    }
                    .detail-label {
                        font-weight: 700;
                        color: #1a365d;
                        width: 140px;
                        font-size: 15px;
                    }
                    .detail-value {
                        color: #4a5568;
                        font-size: 15px;
                        font-weight: 500;
                    }
                    .primary-button {
                        display: inline-block;
                        background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
                        color: #ffffff;
                        padding: 18px 45px;
                        text-decoration: none;
                        border-radius: 12px;
                        font-size: 17px;
                        font-weight: 700;
                        margin: 35px auto;
                        text-align: center;
                        box-shadow: 0 8px 20px rgba(0,102,204,0.3);
                        transition: all 0.3s ease;
                    }
                    .features-section {
                        padding: 70px 40px;
                        background: linear-gradient(135deg, #f8fbff 0%, #f0f8ff 100%);
                    }
                    .features-title {
                        text-align: center;
                        font-size: 22px;
                        color: #1a365d;
                        font-weight: 700;
                        margin-bottom: 50px;
                    }
                    .features-grid {
                        display: table;
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .feature-row {
                        display: table-row;
                    }
                    .feature-item {
                        display: table-cell;
                        width: 33.33%;
                        padding: 25px 20px;
                        text-align: center;
                        vertical-align: top;
                    }
                    .feature-icon {
                        width: 70px;
                        height: 70px;
                        background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
                        border-radius: 50%;
                        margin: 0 auto 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 32px;
                        color: #ffffff;
                        box-shadow: 0 8px 20px rgba(0,102,204,0.25);
                    }
                    .feature-title {
                        font-size: 18px;
                        font-weight: 700;
                        color: #1a365d;
                        margin-bottom: 15px;
                        line-height: 1.3;
                    }
                    .feature-description {
                        font-size: 15px;
                        color: #4a5568;
                        line-height: 1.6;
                    }
                    .bottom-section {
                        padding: 50px 40px;
                        text-align: center;
                        background-color: #ffffff;
                    }
                    .bottom-text {
                        font-size: 18px;
                        color: #4a5568;
                        margin-bottom: 30px;
                        line-height: 1.5;
                    }
                    .secondary-button {
                        display: inline-block;
                        background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
                        color: #ffffff;
                        padding: 15px 35px;
                        text-decoration: none;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: 700;
                        box-shadow: 0 6px 15px rgba(0,102,204,0.25);
                        transition: all 0.3s ease;
                    }
                    .footer {
                        background: linear-gradient(135deg, #f8fbff 0%, #e8f4fd 100%);
                        padding: 45px 40px 25px;
                        text-align: center;
                        border-top: 3px solid #e3f2fd;
                    }
                    .footer-logo {
                        font-size: 24px;
                        font-weight: 800;
                        color: #0066cc;
                        margin-bottom: 30px;
                        text-shadow: 0 1px 3px rgba(0,102,204,0.2);
                    }
                    .footer-links {
                        margin-bottom: 30px;
                    }
                    .footer-link {
                        color: #1a365d;
                        text-decoration: none;
                        font-size: 15px;
                        font-weight: 600;
                        margin: 0 20px;
                        transition: color 0.3s ease;
                    }
                    .social-icons {
                        margin-bottom: 30px;
                    }
                    .social-icon {
                        width: 35px;
                        height: 35px;
                        background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
                        border-radius: 50%;
                        display: inline-block;
                        margin: 0 8px;
                        box-shadow: 0 3px 8px rgba(0,0,0,0.15);
                    }
                    .footer-text {
                        font-size: 13px;
                        color: #4a5568;
                        line-height: 1.6;
                        margin: 12px 0;
                        font-weight: 500;
                    }
                    .footer-brand {
                        font-weight: 700;
                        color: #1a365d;
                    }
                    
                    @media (max-width: 600px) {
                        body { padding: 15px 10px; }
                        .email-container { border-radius: 15px; }
                        .header-greeting { padding: 20px 25px; }
                        .main-header { padding: 50px 25px 35px; }
                        .university-shield { width: 70px; height: 70px; }
                        .main-content { margin: -25px 20px 0; padding: 40px 30px; }
                        .features-section { padding: 50px 25px; }
                        .feature-item { display: block; width: 100%; padding: 20px 10px; }
                        .feature-icon { width: 60px; height: 60px; font-size: 28px; }
                        .bottom-section { padding: 40px 25px; }
                        .footer { padding: 35px 25px 20px; }
                        .detail-row { flex-direction: column; align-items: flex-start; }
                        .detail-label { width: 100%; margin-bottom: 5px; }
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <!-- Header con saludo -->
                    <div class="header-greeting">
                        <p class="greeting-text">Hello, Coordinador</p>
                    </div>
                    
                    <!-- Sección principal con degradado azul y escudo -->
                    <div class="main-header">
                        <div class="shield-container">
                            <div class="university-shield">
                                <svg class="shield-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <linearGradient id="shieldGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" style="stop-color:#0066cc;stop-opacity:1" />
                                            <stop offset="100%" style="stop-color:#004499;stop-opacity:1" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M50 10 L20 25 L20 60 Q20 80 50 90 Q80 80 80 60 L80 25 Z" fill="url(#shieldGradient1)"/>
                                    <circle cx="50" cy="40" r="12" fill="#ffffff"/>
                                    <rect x="45" y="55" width="10" height="15" fill="#ffffff"/>
                                    <text x="50" y="45" text-anchor="middle" fill="#0066cc" font-size="8" font-weight="bold">UCMC</text>
                                </svg>
                            </div>
                        </div>
                        <h1 class="header-title">Sistema Jurídico</h1>
                        <p class="header-subtitle">Universidad Colegio Mayor de Cundinamarca</p>
                    </div>
                    
                    <!-- Contenido principal en tarjeta blanca -->
                    <div class="main-content">
                        <h1 class="main-title">Registro Exitoso</h1>
                        <p class="main-description">
                            Un nuevo estudiante se ha registrado exitosamente en el Sistema Jurídico UCMC. Revisa la información detallada a continuación.
                        </p>
                        
                        <div class="student-details">
                            <div class="detail-row">
                                <div class="detail-label">Estudiante:</div>
                                <div class="detail-value">{{ nombre_estudiante }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Email:</div>
                                <div class="detail-value">{{ email_estudiante }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Código:</div>
                                <div class="detail-value">{{ codigo_estudiante }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Programa:</div>
                                <div class="detail-value">{{ programa }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Fecha Registro:</div>
                                <div class="detail-value">{{ fecha_registro }}</div>
                            </div>
                        </div>
                        
                        <center>
                            <a href="{{ redirect_url }}" class="primary-button">Ver Estudiante</a>
                        </center>
                    </div>
                    
                    <!-- Sección de características (3 columnas) -->
                    <div class="features-section">
                        <h2 class="features-title">Funcionalidades del Sistema</h2>
                        <div class="features-grid">
                            <div class="feature-row">
                                <div class="feature-item">
                                    <div class="feature-icon">📋</div>
                                    <h3 class="feature-title">Control Operativo</h3>
                                    <p class="feature-description">Gestiona y supervisa todas las actividades del consultorio jurídico de manera eficiente.</p>
                                </div>
                                <div class="feature-item">
                                    <div class="feature-icon">👨‍🎓</div>
                                    <h3 class="feature-title">Gestión Estudiantil</h3>
                                    <p class="feature-description">Administra estudiantes, asesores y actividades académicas del consultorio.</p>
                                </div>
                                <div class="feature-item">
                                    <div class="feature-icon">🔔</div>
                                    <h3 class="feature-title">Notificaciones</h3>
                                    <p class="feature-description">Notificaciones automáticas de actividades importantes del sistema.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Sección final con call-to-action -->
                    <div class="bottom-section">
                        <p class="bottom-text">Accede a todas las funcionalidades del sistema jurídico</p>
                        <a href="{{ redirect_url }}" class="secondary-button">Ir al Panel de Control</a>
                    </div>
                    
                    <!-- Footer -->
                    <div class="footer">
                        <div class="footer-logo">UCMC</div>
                        <div class="footer-links">
                            <a href="#" class="footer-link">Soporte Técnico</a> |
                            <a href="#" class="footer-link">Seguridad</a> |
                            <a href="#" class="footer-link">Centro de Ayuda</a>
                        </div>
                        <div class="social-icons">
                            <span class="social-icon"></span>
                            <span class="social-icon"></span>
                            <span class="social-icon"></span>
                        </div>
                        <div class="footer-text">
                            Este es un mensaje automático del Sistema Jurídico UCMC.<br>
                            <span class="footer-brand">© {{ year }} Universidad Colegio Mayor de Cundinamarca</span>
                        </div>
                        <div class="footer-text">
                            Para gestionar las preferencias de comunicación, contacta al administrador del sistema.<br>
                            Sistema desarrollado para optimizar la gestión del Consultorio Jurídico.
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """)
            
            html_content = html_template.render(
                nombre_estudiante=f"{event_data.get('nombre', '')} {event_data.get('apellidos', '')}",
                email_estudiante=event_data.get('email', ''),
                codigo_estudiante=event_data.get('codigo_estudiante', 'N/A'),
                fecha_registro=now,
                programa=event_data.get('programa_academico', 'Derecho'),
                redirect_url=redirect_url,
                year=datetime.now().year
            )
            
        elif event_type == "nuevo_control_operativo":
            subject = "[Sistema UCMC] Nuevo Control Operativo Creado"
            redirect_url = f"{self.base_url}/coordinador/control-operativo?search={event_data.get('numero_control', '')}"
            
            html_template = Template("""
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Nuevo Control Operativo</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        background-color: #f8f9fa;
                        margin: 0;
                        padding: 20px 0;
                    }
                    .email-container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                    }
                    .header-greeting {
                        background-color: #f8f9fa;
                        padding: 20px 40px;
                        border-bottom: 1px solid #e9ecef;
                    }
                    .greeting-text {
                        font-size: 16px;
                        color: #333333;
                        margin: 0;
                    }
                    .main-header {
                        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                        padding: 60px 40px;
                        text-align: center;
                        position: relative;
                    }
                    .ucmc-logo {
                        width: 80px;
                        height: 80px;
                        background-color: #ffffff;
                        border-radius: 50%;
                        margin: 0 auto 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 28px;
                        font-weight: 800;
                        color: #8b5cf6;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    }
                    .main-content {
                        background-color: #ffffff;
                        border-radius: 8px;
                        margin: -40px 40px 0;
                        padding: 50px 40px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                        position: relative;
                        z-index: 1;
                    }
                    .main-title {
                        font-size: 24px;
                        font-weight: 700;
                        color: #333333;
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .main-description {
                        font-size: 16px;
                        color: #6b7280;
                        text-align: center;
                        line-height: 1.6;
                        margin-bottom: 40px;
                    }
                    .control-details {
                        background-color: #f8f9fa;
                        border: 2px solid #8b5cf6;
                        border-radius: 8px;
                        padding: 30px;
                        margin: 40px 0;
                    }
                    .detail-row {
                        display: flex;
                        padding: 8px 0;
                        border-bottom: 1px solid #e9ecef;
                    }
                    .detail-row:last-child {
                        border-bottom: none;
                    }
                    .detail-label {
                        font-weight: 700;
                        color: #333333;
                        width: 160px;
                        font-size: 14px;
                    }
                    .detail-value {
                        color: #6b7280;
                        font-size: 14px;
                    }
                    .primary-button {
                        display: inline-block;
                        background-color: #8b5cf6;
                        color: #ffffff;
                        padding: 15px 40px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        margin: 30px auto;
                        text-align: center;
                    }
                    .features-section {
                        padding: 60px 40px;
                        background-color: #ffffff;
                    }
                    .features-grid {
                        display: table;
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .feature-row {
                        display: table-row;
                    }
                    .feature-item {
                        display: table-cell;
                        width: 33.33%;
                        padding: 20px 15px;
                        text-align: center;
                        vertical-align: top;
                    }
                    .feature-icon {
                        width: 50px;
                        height: 50px;
                        background-color: #8b5cf6;
                        border-radius: 50%;
                        margin: 0 auto 15px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 24px;
                        color: #ffffff;
                    }
                    .feature-title {
                        font-size: 16px;
                        font-weight: 700;
                        color: #333333;
                        margin-bottom: 10px;
                    }
                    .feature-description {
                        font-size: 14px;
                        color: #6b7280;
                        line-height: 1.5;
                    }
                    .bottom-section {
                        padding: 40px;
                        text-align: center;
                        background-color: #ffffff;
                    }
                    .bottom-text {
                        font-size: 16px;
                        color: #6b7280;
                        margin-bottom: 25px;
                    }
                    .secondary-button {
                        display: inline-block;
                        background-color: #8b5cf6;
                        color: #ffffff;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                    }
                    .footer {
                        background-color: #f8f9fa;
                        padding: 40px 40px 20px;
                        text-align: center;
                        border-top: 1px solid #e9ecef;
                    }
                    .footer-logo {
                        font-size: 20px;
                        font-weight: 700;
                        color: #8b5cf6;
                        margin-bottom: 25px;
                    }
                    .footer-links {
                        margin-bottom: 25px;
                    }
                    .footer-link {
                        color: #6b7280;
                        text-decoration: none;
                        font-size: 14px;
                        margin: 0 15px;
                    }
                    .social-icons {
                        margin-bottom: 25px;
                    }
                    .social-icon {
                        width: 30px;
                        height: 30px;
                        background-color: #6b7280;
                        border-radius: 50%;
                        display: inline-block;
                        margin: 0 5px;
                    }
                    .footer-text {
                        font-size: 12px;
                        color: #6b7280;
                        line-height: 1.5;
                        margin: 10px 0;
                    }
                    
                    @media (max-width: 600px) {
                        .header-greeting { padding: 15px 20px; }
                        .main-header { padding: 40px 20px; }
                        .main-content { margin: -30px 20px 0; padding: 35px 25px; }
                        .features-section { padding: 40px 20px; }
                        .feature-item { display: block; width: 100%; padding: 15px 0; }
                        .bottom-section { padding: 30px 20px; }
                        .footer { padding: 30px 20px 15px; }
                        .detail-row { flex-direction: column; }
                        .detail-label { width: 100%; margin-bottom: 5px; }
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <!-- Header con saludo -->
                    <div class="header-greeting">
                        <p class="greeting-text">Hello, Coordinador</p>
                    </div>
                    
                    <!-- Sección principal con degradado morado -->
                    <div class="main-header">
                        <div class="ucmc-logo">UCMC</div>
                    </div>
                    
                    <!-- Contenido principal en tarjeta blanca -->
                    <div class="main-content">
                        <h1 class="main-title">Nueva Actividad Registrada</h1>
                        <p class="main-description">
                            Se ha creado un nuevo control operativo en el Sistema Jurídico UCMC. Revisa los detalles a continuación.
                        </p>
                        
                        <div class="control-details">
                            <div class="detail-row">
                                <div class="detail-label">Número Control:</div>
                                <div class="detail-value">{{ numero_control }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Consultante:</div>
                                <div class="detail-value">{{ nombre_consultante }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Área Consulta:</div>
                                <div class="detail-value">{{ area_consulta }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Teléfono:</div>
                                <div class="detail-value">{{ telefono_consultante }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Creado por:</div>
                                <div class="detail-value">{{ created_by }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Fecha:</div>
                                <div class="detail-value">{{ fecha_creacion }}</div>
                            </div>
                        </div>
                        
                        <center>
                            <a href="{{ redirect_url }}" class="primary-button">Ver Actividad</a>
                        </center>
                    </div>
                    
                    <!-- Sección de características (3 columnas) -->
                    <div class="features-section">
                        <div class="features-grid">
                            <div class="feature-row">
                                <div class="feature-item">
                                    <div class="feature-icon">📄</div>
                                    <h3 class="feature-title">Control Operativo</h3>
                                    <p class="feature-description">Gestiona y supervisa todas las actividades del consultorio jurídico.</p>
                                </div>
                                <div class="feature-item">
                                    <div class="feature-icon">👥</div>
                                    <h3 class="feature-title">Gestión Estudiantil</h3>
                                    <p class="feature-description">Administra estudiantes y todas las actividades académicas.</p>
                                </div>
                                <div class="feature-item">
                                    <div class="feature-icon">🔔</div>
                                    <h3 class="feature-title">Notificaciones</h3>
                                    <p class="feature-description">Notificaciones automáticas de actividades importantes.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Sección final con call-to-action -->
                    <div class="bottom-section">
                        <p class="bottom-text">Accede a todas las funcionalidades del sistema</p>
                        <a href="{{ redirect_url }}" class="secondary-button">Acceder al Panel</a>
                    </div>
                    
                    <!-- Footer -->
                    <div class="footer">
                        <div class="footer-logo">UCMC</div>
                        <div class="footer-links">
                            <a href="#" class="footer-link">Soporte</a> |
                            <a href="#" class="footer-link">Seguridad</a> |
                            <a href="#" class="footer-link">Ayuda</a>
                        </div>
                        <div class="social-icons">
                            <span class="social-icon"></span>
                            <span class="social-icon"></span>
                            <span class="social-icon"></span>
                        </div>
                        <div class="footer-text">
                            Este es un mensaje automático del Sistema Jurídico UCMC.<br>
                            © {{ year }} Universidad Colegio Mayor de Cundinamarca
                        </div>
                        <div class="footer-text">
                            Para gestionar las preferencias de comunicación, contacta al administrador del sistema.
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """)
            
            html_content = html_template.render(
                numero_control=event_data.get('numero_control', 'N/A'),
                nombre_consultante=event_data.get('nombre_consultante', ''),
                area_consulta=event_data.get('area_consulta', ''),
                created_by=created_by_name,
                fecha_creacion=now,
                telefono_consultante=event_data.get('telefono_consultante', 'N/A'),
                redirect_url=redirect_url,
                year=datetime.now().year
            )
        
        else:
            # Template genérico para otros tipos de eventos
            subject = "[Sistema UCMC] Nueva Actividad Registrada"
            redirect_url = self.base_url
            
            html_template = Template("""
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Nueva Actividad</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        background-color: #f8f9fa;
                        margin: 0;
                        padding: 20px 0;
                    }
                    .email-container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                    }
                    .header-greeting {
                        background-color: #f8f9fa;
                        padding: 20px 40px;
                        border-bottom: 1px solid #e9ecef;
                    }
                    .greeting-text {
                        font-size: 16px;
                        color: #333333;
                        margin: 0;
                    }
                    .main-header {
                        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                        padding: 60px 40px;
                        text-align: center;
                        position: relative;
                    }
                    .ucmc-logo {
                        width: 80px;
                        height: 80px;
                        background-color: #ffffff;
                        border-radius: 50%;
                        margin: 0 auto 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 28px;
                        font-weight: 800;
                        color: #8b5cf6;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    }
                    .main-content {
                        background-color: #ffffff;
                        border-radius: 8px;
                        margin: -40px 40px 0;
                        padding: 50px 40px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                        position: relative;
                        z-index: 1;
                    }
                    .main-title {
                        font-size: 24px;
                        font-weight: 700;
                        color: #333333;
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .main-description {
                        font-size: 16px;
                        color: #6b7280;
                        text-align: center;
                        line-height: 1.6;
                        margin-bottom: 40px;
                    }
                    .activity-details {
                        background-color: #f8f9fa;
                        border: 2px solid #8b5cf6;
                        border-radius: 8px;
                        padding: 30px;
                        margin: 40px 0;
                    }
                    .detail-row {
                        display: flex;
                        padding: 8px 0;
                        border-bottom: 1px solid #e9ecef;
                    }
                    .detail-row:last-child {
                        border-bottom: none;
                    }
                    .detail-label {
                        font-weight: 700;
                        color: #333333;
                        width: 140px;
                        font-size: 14px;
                    }
                    .detail-value {
                        color: #6b7280;
                        font-size: 14px;
                    }
                    .primary-button {
                        display: inline-block;
                        background-color: #8b5cf6;
                        color: #ffffff;
                        padding: 15px 40px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        margin: 30px auto;
                        text-align: center;
                    }
                    .features-section {
                        padding: 60px 40px;
                        background-color: #ffffff;
                    }
                    .features-grid {
                        display: table;
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .feature-row {
                        display: table-row;
                    }
                    .feature-item {
                        display: table-cell;
                        width: 33.33%;
                        padding: 20px 15px;
                        text-align: center;
                        vertical-align: top;
                    }
                    .feature-icon {
                        width: 50px;
                        height: 50px;
                        background-color: #8b5cf6;
                        border-radius: 50%;
                        margin: 0 auto 15px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 24px;
                        color: #ffffff;
                    }
                    .feature-title {
                        font-size: 16px;
                        font-weight: 700;
                        color: #333333;
                        margin-bottom: 10px;
                    }
                    .feature-description {
                        font-size: 14px;
                        color: #6b7280;
                        line-height: 1.5;
                    }
                    .bottom-section {
                        padding: 40px;
                        text-align: center;
                        background-color: #ffffff;
                    }
                    .bottom-text {
                        font-size: 16px;
                        color: #6b7280;
                        margin-bottom: 25px;
                    }
                    .secondary-button {
                        display: inline-block;
                        background-color: #8b5cf6;
                        color: #ffffff;
                        padding: 12px 30px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                    }
                    .footer {
                        background-color: #f8f9fa;
                        padding: 40px 40px 20px;
                        text-align: center;
                        border-top: 1px solid #e9ecef;
                    }
                    .footer-logo {
                        font-size: 20px;
                        font-weight: 700;
                        color: #8b5cf6;
                        margin-bottom: 25px;
                    }
                    .footer-links {
                        margin-bottom: 25px;
                    }
                    .footer-link {
                        color: #6b7280;
                        text-decoration: none;
                        font-size: 14px;
                        margin: 0 15px;
                    }
                    .social-icons {
                        margin-bottom: 25px;
                    }
                    .social-icon {
                        width: 30px;
                        height: 30px;
                        background-color: #6b7280;
                        border-radius: 50%;
                        display: inline-block;
                        margin: 0 5px;
                    }
                    .footer-text {
                        font-size: 12px;
                        color: #6b7280;
                        line-height: 1.5;
                        margin: 10px 0;
                    }
                    
                    @media (max-width: 600px) {
                        .header-greeting { padding: 15px 20px; }
                        .main-header { padding: 40px 20px; }
                        .main-content { margin: -30px 20px 0; padding: 35px 25px; }
                        .features-section { padding: 40px 20px; }
                        .feature-item { display: block; width: 100%; padding: 15px 0; }
                        .bottom-section { padding: 30px 20px; }
                        .footer { padding: 30px 20px 15px; }
                        .detail-row { flex-direction: column; }
                        .detail-label { width: 100%; margin-bottom: 5px; }
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <!-- Header con saludo -->
                    <div class="header-greeting">
                        <p class="greeting-text">Hello, Coordinador</p>
                    </div>
                    
                    <!-- Sección principal con degradado morado -->
                    <div class="main-header">
                        <div class="ucmc-logo">UCMC</div>
                    </div>
                    
                    <!-- Contenido principal en tarjeta blanca -->
                    <div class="main-content">
                        <h1 class="main-title">Nueva Actividad Registrada</h1>
                        <p class="main-description">
                            Se ha registrado una nueva actividad en el Sistema Jurídico UCMC. Revisa los detalles a continuación.
                        </p>
                        
                        <div class="activity-details">
                            <div class="detail-row">
                                <div class="detail-label">Tipo Actividad:</div>
                                <div class="detail-value">{{ event_type }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Realizada por:</div>
                                <div class="detail-value">{{ created_by }}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">Fecha:</div>
                                <div class="detail-value">{{ fecha }}</div>
                            </div>
                        </div>
                        
                        <center>
                            <a href="{{ redirect_url }}" class="primary-button">Ver Actividad</a>
                        </center>
                    </div>
                    
                    <!-- Sección de características (3 columnas) -->
                    <div class="features-section">
                        <div class="features-grid">
                            <div class="feature-row">
                                <div class="feature-item">
                                    <div class="feature-icon">📄</div>
                                    <h3 class="feature-title">Control Operativo</h3>
                                    <p class="feature-description">Gestiona y supervisa todas las actividades del consultorio jurídico.</p>
                                </div>
                                <div class="feature-item">
                                    <div class="feature-icon">👥</div>
                                    <h3 class="feature-title">Gestión Estudiantil</h3>
                                    <p class="feature-description">Administra estudiantes y todas las actividades académicas.</p>
                                </div>
                                <div class="feature-item">
                                    <div class="feature-icon">🔔</div>
                                    <h3 class="feature-title">Notificaciones</h3>
                                    <p class="feature-description">Notificaciones automáticas de actividades importantes.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Sección final con call-to-action -->
                    <div class="bottom-section">
                        <p class="bottom-text">Accede a todas las funcionalidades del sistema</p>
                        <a href="{{ redirect_url }}" class="secondary-button">Acceder al Panel</a>
                    </div>
                    
                    <!-- Footer -->
                    <div class="footer">
                        <div class="footer-logo">UCMC</div>
                        <div class="footer-links">
                            <a href="#" class="footer-link">Soporte</a> |
                            <a href="#" class="footer-link">Seguridad</a> |
                            <a href="#" class="footer-link">Ayuda</a>
                        </div>
                        <div class="social-icons">
                            <span class="social-icon"></span>
                            <span class="social-icon"></span>
                            <span class="social-icon"></span>
                        </div>
                        <div class="footer-text">
                            Este es un mensaje automático del Sistema Jurídico UCMC.<br>
                            © {{ year }} Universidad Colegio Mayor de Cundinamarca
                        </div>
                        <div class="footer-text">
                            Para gestionar las preferencias de comunicación, contacta al administrador del sistema.
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """)
            
            html_content = html_template.render(
                event_type=event_type,
                created_by=created_by_name,
                fecha=now,
                redirect_url=redirect_url
            )
        
        return subject, html_content, redirect_url
    
    async def notify_new_student_registration(self, student_data: dict, registered_by_email: str = None) -> bool:
        """
        Notificar registro de nuevo estudiante
        """
        return await self.send_coordinator_notification(
            event_type="nuevo_estudiante",
            event_data=student_data,
            created_by_email=registered_by_email
        )
    
    async def notify_new_control_operativo(self, control_data: dict, created_by_email: str = None) -> bool:
        """
        Notificar creación de nuevo control operativo
        """
        return await self.send_coordinator_notification(
            event_type="nuevo_control_operativo", 
            event_data=control_data,
            created_by_email=created_by_email
        )

# Instancia global del servicio de notificaciones
notification_service = NotificationService()