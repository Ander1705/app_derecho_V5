import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
import logging
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    """
    Servicio de correo profesional con diseño institucional UCMC
    """
    
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.email_user = os.getenv("SMTP_USER", "").strip()
        self.email_password = os.getenv("SMTP_PASS", "").strip()
        self.from_email = os.getenv("FROM_EMAIL", "andersoncastelblanco@gmail.com")
        self.from_name = "Consultorio Jurídico UCMC"
        
        # Estado de configuración
        self.is_configured = bool(self.email_user and self.email_password)
        
        if self.is_configured:
            logging.info(f"✅ Email service configured: {self.email_user}")
        else:
            logging.warning("⚠️ Email service NOT configured - missing credentials")
            logging.info("📧 To enable emails, configure SMTP_USER and SMTP_PASS in .env")
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Enviar email con contenido HTML y texto plano
        """
        if not self.is_configured:
            logging.warning(f"📧 Email NOT SENT to {to_email}: SMTP not configured")
            logging.info(f"📋 Subject: '{subject}'")
            logging.info("🔧 Configure SMTP_USER and SMTP_PASS in .env to enable email sending")
            return True  # Return True para no romper el flujo de la aplicación
        
        try:
            logging.info(f"📤 Sending email to {to_email}: '{subject}'")
            
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.email_user}>"
            message["To"] = to_email
            
            if text_content:
                text_part = MIMEText(text_content, "plain", "utf-8")
                message.attach(text_part)
            
            html_part = MIMEText(html_content, "html", "utf-8")
            message.attach(html_part)
            
            context = ssl.create_default_context()
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.email_user, self.email_password)
                server.send_message(message)
            
            logging.info(f"✅ Email sent successfully to {to_email}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logging.error(f"❌ SMTP Authentication failed: {str(e)}")
            logging.error("🔧 Check your email credentials and App Password")
            return False
        except Exception as e:
            logging.error(f"❌ Error sending email to {to_email}: {str(e)}")
            return False
    
    async def send_password_reset_email(
        self,
        to_email: str,
        user_name: str,
        reset_token: str
    ) -> bool:
        """
        Enviar email de recuperación de contraseña con diseño profesional UCMC
        """
        subject = "🔐 Recuperación de Contraseña - Sistema Jurídico UCMC"
        
        # Diseño HTML profesional con escudo y colores institucionales morados
        html_content = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperación de Contraseña</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8f9fa;
            padding: 20px;
            line-height: 1.6;
        }}
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }}
        
        /* Header con escudo universitario */
        .header {{
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }}
        .university-shield {{
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }}
        .shield-icon {{
            font-size: 40px;
            color: #8b5cf6;
            font-weight: bold;
        }}
        .header-title {{
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }}
        .header-subtitle {{
            font-size: 16px;
            opacity: 0.95;
            font-weight: 400;
        }}
        
        /* Saludo personalizado */
        .greeting {{
            background: #f8f9fa;
            padding: 25px 30px;
            border-bottom: 1px solid #e9ecef;
        }}
        .greeting-text {{
            font-size: 18px;
            color: #495057;
            font-weight: 500;
            text-align: center;
        }}
        
        /* Contenido principal */
        .main-content {{
            padding: 40px 30px;
        }}
        .main-title {{
            font-size: 24px;
            color: #2d3748;
            font-weight: 700;
            margin-bottom: 20px;
            text-align: center;
        }}
        .description {{
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 30px;
            text-align: center;
            line-height: 1.6;
        }}
        
        /* Código de verificación */
        .code-container {{
            background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
            border: 2px solid #8b5cf6;
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
        }}
        .code-label {{
            font-size: 14px;
            color: #6b46c1;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
        }}
        .verification-code {{
            font-size: 36px;
            font-weight: 800;
            color: #7c3aed;
            font-family: 'Courier New', monospace;
            letter-spacing: 4px;
            padding: 20px;
            background: white;
            border-radius: 10px;
            border: 1px solid #c4b5fd;
            display: inline-block;
            margin: 10px 0;
            box-shadow: 0 4px 10px rgba(139, 92, 246, 0.2);
        }}
        
        /* Botón de acción */
        .action-button {{
            text-align: center;
            margin: 30px 0;
        }}
        .btn {{
            display: inline-block;
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }}
        .btn:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
        }}
        
        /* Instrucciones importantes */
        .instructions {{
            background: #f8f9fa;
            border-left: 4px solid #8b5cf6;
            padding: 25px;
            margin: 30px 0;
            border-radius: 5px;
        }}
        .instructions-title {{
            font-size: 18px;
            color: #2d3748;
            font-weight: 600;
            margin-bottom: 15px;
        }}
        .instructions ul {{
            list-style: none;
            padding: 0;
        }}
        .instructions li {{
            padding: 8px 0;
            color: #4a5568;
            position: relative;
            padding-left: 25px;
        }}
        .instructions li:before {{
            content: '✓';
            position: absolute;
            left: 0;
            color: #8b5cf6;
            font-weight: bold;
        }}
        
        /* Footer */
        .footer {{
            background: #2d3748;
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .footer-logo {{
            font-size: 20px;
            font-weight: 700;
            color: #8b5cf6;
            margin-bottom: 15px;
        }}
        .footer-text {{
            font-size: 14px;
            opacity: 0.8;
            margin: 8px 0;
        }}
        
        /* Responsive */
        @media (max-width: 600px) {{
            body {{ padding: 10px; }}
            .header {{ padding: 30px 20px; }}
            .main-content {{ padding: 30px 20px; }}
            .header-title {{ font-size: 24px; }}
            .verification-code {{ font-size: 28px; letter-spacing: 3px; }}
            .university-shield {{ width: 70px; height: 70px; }}
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header con escudo universitario -->
        <div class="header">
            <div class="university-shield">
                <div class="shield-icon">🛡️</div>
            </div>
            <h1 class="header-title">Sistema Jurídico UCMC</h1>
            <p class="header-subtitle">Universidad Colegio Mayor de Cundinamarca</p>
        </div>
        
        <!-- Saludo personalizado -->
        <div class="greeting">
            <p class="greeting-text">Hola, {user_name}</p>
        </div>
        
        <!-- Contenido principal -->
        <div class="main-content">
            <h2 class="main-title">🔐 Recuperación de Contraseña</h2>
            <p class="description">
                Hemos recibido una solicitud para restablecer tu contraseña en el Sistema Jurídico UCMC. 
                Utiliza el siguiente código de verificación para continuar con el proceso:
            </p>
            
            <!-- Código de verificación -->
            <div class="code-container">
                <div class="code-label">Código de Verificación</div>
                <div class="verification-code">{reset_token}</div>
            </div>
            
            <!-- Botón de acción -->
            <div class="action-button">
                <a href="#" class="btn">🔑 Confirmar Código</a>
            </div>
            
            <!-- Instrucciones importantes -->
            <div class="instructions">
                <h3 class="instructions-title">📋 Instrucciones importantes:</h3>
                <ul>
                    <li>Este código es válido por <strong>15 minutos</strong></li>
                    <li>Solo puede utilizarse <strong>una vez</strong></li>
                    <li>No compartas este código con nadie</li>
                    <li>Si no solicitaste este cambio, ignora este correo</li>
                    <li>Contacta al administrador si tienes problemas</li>
                </ul>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-logo">🏛️ UCMC - Consultorio Jurídico</div>
            <div class="footer-text">
                Este es un mensaje automático del Sistema Jurídico UCMC
            </div>
            <div class="footer-text">
                © 2025 Universidad Colegio Mayor de Cundinamarca
            </div>
        </div>
    </div>
</body>
</html>
        """
        
        # Versión texto plano profesional
        text_content = f"""
🏛️ SISTEMA JURÍDICO UCMC - RECUPERACIÓN DE CONTRASEÑA
========================================================

Hola {user_name},

Hemos recibido una solicitud para restablecer tu contraseña en el Sistema Jurídico de la Universidad Colegio Mayor de Cundinamarca.

🔐 CÓDIGO DE VERIFICACIÓN: {reset_token}

📋 INSTRUCCIONES:
1. Accede a la página de recuperación de contraseña
2. Ingresa el código de verificación mostrado arriba
3. Crea una nueva contraseña segura
4. Confirma tu nueva contraseña

⚠️ INFORMACIÓN IMPORTANTE:
- Este código es válido por 15 minutos
- Solo puede utilizarse una vez
- No compartas este código con nadie
- Si no solicitaste este cambio, ignora este correo

Si tienes problemas, contacta al administrador del sistema.

Saludos cordiales,
🏛️ Consultorio Jurídico UCMC

---
© 2025 Universidad Colegio Mayor de Cundinamarca
Este es un mensaje automático del sistema.
        """
        
        return await self.send_email(to_email, subject, html_content, text_content)

# Global email service instance
email_service = EmailService()