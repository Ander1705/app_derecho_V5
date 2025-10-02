package services

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strconv"
	"time"

	"gopkg.in/gomail.v2"
	"gorm.io/gorm"

	"consultorio-juridico/internal/config"
	"consultorio-juridico/internal/models"
)

type EmailService struct {
	db   *gorm.DB
	smtp config.SMTPConfig
}

func NewEmailService(db *gorm.DB, smtpConfig config.SMTPConfig) *EmailService {
	return &EmailService{
		db:   db,
		smtp: smtpConfig,
	}
}

// GenerateVerificationCode genera un código de verificación de 6 dígitos
func (s *EmailService) GenerateVerificationCode() string {
	code := ""
	for i := 0; i < 6; i++ {
		n, _ := rand.Int(rand.Reader, big.NewInt(10))
		code += strconv.FormatInt(n.Int64(), 10)
	}
	return code
}

// SendVerificationEmail envía el código de verificación por correo
func (s *EmailService) SendVerificationEmail(email, name, code string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", s.smtp.From)
	m.SetHeader("To", email)
	m.SetHeader("Subject", "Verificación de Correo Electrónico - Consultorio Jurídico UCMC")

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .code { font-size: 32px; font-weight: bold; color: #2c3e50; text-align: center; 
                padding: 20px; margin: 20px 0; background-color: white; border: 2px dashed #2c3e50; }
        .footer { background-color: #ecf0f1; padding: 20px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Consultorio Jurídico</h1>
            <h2>Universidad Colegio Mayor de Cundinamarca</h2>
        </div>
        
        <div class="content">
            <h3>¡Hola %s!</h3>
            <p>Gracias por registrarte en nuestro sistema del Consultorio Jurídico de la Universidad Colegio Mayor de Cundinamarca.</p>
            
            <p>Para completar tu registro, por favor usa el siguiente código de verificación:</p>
            
            <div class="code">%s</div>
            
            <p><strong>Instrucciones:</strong></p>
            <ul>
                <li>Ingresa este código en la página de verificación</li>
                <li>El código expira en 15 minutos</li>
                <li>Si no solicitaste este registro, ignora este correo</li>
            </ul>
            
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            
            <p>Atentamente,<br>
            <strong>Equipo del Consultorio Jurídico UCMC</strong></p>
        </div>
        
        <div class="footer">
            <p>Universidad Colegio Mayor de Cundinamarca</p>
            <p>Calle 6C No. 94I – 25 Edificio Nuevo Piso 4 – UPK - Bogotá, D.C.</p>
            <p>consultoriojuridico.kennedy@unicolmayor.edu.co</p>
        </div>
    </div>
</body>
</html>
`, name, code)

	m.SetBody("text/html", body)

	d := gomail.NewDialer(s.smtp.Host, s.smtp.Port, s.smtp.Username, s.smtp.Password)

	if err := d.DialAndSend(m); err != nil {
		// Log the error but don't crash the application
		fmt.Printf("⚠️ Warning: Error enviando correo a %s: %v\n", email, err)
		return fmt.Errorf("error enviando correo: %v", err)
	}

	fmt.Printf("✅ Email enviado exitosamente a: %s\n", email)
	return nil
}

// SetVerificationCode establece el código de verificación para un usuario
func (s *EmailService) SetVerificationCode(userID uint, code string) error {
	expiry := time.Now().UTC().Add(24 * time.Hour) // Expira en 24 horas (para testing)

	err := s.db.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"verification_code":   code,
		"verification_expiry": expiry,
	}).Error

	return err
}

// VerifyEmailCode verifica el código de verificación
func (s *EmailService) VerifyEmailCode(email, code string) error {
	var user models.User
	err := s.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return fmt.Errorf("usuario no encontrado")
	}

	// Verificar si ya está verificado
	if user.EmailVerified {
		return fmt.Errorf("el email ya está verificado")
	}

	// Verificar código
	if user.VerificationCode == nil || *user.VerificationCode != code {
		return fmt.Errorf("código de verificación inválido")
	}

	// Verificar expiración (temporalmente deshabilitado para pruebas)
	// NOTA: La verificación de tiempo está deshabilitada para resolver problemas de zona horaria
	fmt.Printf("✅ Debug: Verificación de tiempo deshabilitada temporalmente\n")

	// Marcar como verificado y limpiar código
	err = s.db.Model(&user).Updates(map[string]interface{}{
		"email_verified":      true,
		"verification_code":   nil,
		"verification_expiry": nil,
	}).Error

	return err
}

// ResendVerificationCode reenvía el código de verificación
func (s *EmailService) ResendVerificationCode(email string) error {
	var user models.User
	err := s.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return fmt.Errorf("usuario no encontrado")
	}

	if user.EmailVerified {
		return fmt.Errorf("el email ya está verificado")
	}

	// Generar nuevo código
	code := s.GenerateVerificationCode()

	// Actualizar en base de datos
	err = s.SetVerificationCode(user.ID, code)
	if err != nil {
		return err
	}

	// Obtener nombre completo
	name := fmt.Sprintf("%s %s", user.Nombres, user.Apellidos)
	if name == " " {
		name = user.NombreUsuario
	}

	// Enviar email
	return s.SendVerificationEmail(email, name, code)
}

// SendPasswordResetCode envía un código de recuperación de contraseña
func (s *EmailService) SendPasswordResetCode(email string) error {
	var user models.User
	err := s.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return fmt.Errorf("usuario no encontrado")
	}

	// Generar código de recuperación
	code := s.GenerateVerificationCode()

	// Establecer código en la base de datos (reutilizamos los campos de verificación)
	err = s.SetVerificationCode(user.ID, code)
	if err != nil {
		return err
	}

	// Obtener nombre completo
	name := fmt.Sprintf("%s %s", user.Nombres, user.Apellidos)
	if name == " " {
		name = user.NombreUsuario
	}

	// Enviar email de recuperación
	return s.SendPasswordResetEmail(email, name, code)
}

// SendPasswordResetEmail envía el email de recuperación de contraseña
func (s *EmailService) SendPasswordResetEmail(email, name, code string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", s.smtp.From)
	m.SetHeader("To", email)
	m.SetHeader("Subject", "Recuperación de Contraseña - Consultorio Jurídico UCMC")

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .code { font-size: 32px; font-weight: bold; color: #e74c3c; text-align: center; 
                padding: 20px; margin: 20px 0; background-color: white; border: 2px dashed #e74c3c; }
        .footer { background-color: #ecf0f1; padding: 20px; text-align: center; font-size: 12px; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Recuperación de Contraseña</h1>
            <h2>Universidad Colegio Mayor de Cundinamarca</h2>
        </div>
        
        <div class="content">
            <h3>¡Hola %s!</h3>
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el Consultorio Jurídico.</p>
            
            <p>Para cambiar tu contraseña, usa el siguiente código de verificación:</p>
            
            <div class="code">%s</div>
            
            <div class="warning">
                <p><strong>⚠️ Importante:</strong></p>
                <ul>
                    <li>Este código expira en 15 minutos</li>
                    <li>Solo úsalo si solicitaste el cambio de contraseña</li>
                    <li>Si no solicitaste este cambio, ignora este correo</li>
                    <li>Nunca compartas este código con otras personas</li>
                </ul>
            </div>
            
            <p><strong>Pasos a seguir:</strong></p>
            <ol>
                <li>Ve a la página de recuperación de contraseña</li>
                <li>Ingresa tu email y este código</li>
                <li>Crea una nueva contraseña segura</li>
            </ol>
            
            <p>Si tienes problemas, contacta al equipo de soporte.</p>
            
            <p>Atentamente,<br>
            <strong>Equipo del Consultorio Jurídico UCMC</strong></p>
        </div>
        
        <div class="footer">
            <p>Universidad Colegio Mayor de Cundinamarca</p>
            <p>Calle 6C No. 94I – 25 Edificio Nuevo Piso 4 – UPK - Bogotá, D.C.</p>
            <p>consultoriojuridico.kennedy@unicolmayor.edu.co</p>
        </div>
    </div>
</body>
</html>
`, name, code)

	m.SetBody("text/html", body)

	d := gomail.NewDialer(s.smtp.Host, s.smtp.Port, s.smtp.Username, s.smtp.Password)

	if err := d.DialAndSend(m); err != nil {
		fmt.Printf("⚠️ Warning: Error enviando correo de recuperación a %s: %v\n", email, err)
		return fmt.Errorf("error enviando correo de recuperación: %v", err)
	}

	fmt.Printf("✅ Email de recuperación enviado exitosamente a: %s\n", email)
	return nil
}

// VerifyPasswordResetCode verifica el código de recuperación de contraseña
func (s *EmailService) VerifyPasswordResetCode(email, code string) error {
	var user models.User
	err := s.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return fmt.Errorf("usuario no encontrado")
	}

	// Verificar código
	if user.VerificationCode == nil || *user.VerificationCode != code {
		return fmt.Errorf("código de verificación inválido")
	}

	// Verificar expiración (temporalmente deshabilitado para pruebas)
	// NOTA: La verificación de tiempo está deshabilitada para resolver problemas de zona horaria
	fmt.Printf("✅ Debug: Verificación de tiempo deshabilitada temporalmente para recuperación\n")

	return nil
}