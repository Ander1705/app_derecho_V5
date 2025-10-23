package services

import (
	"errors"
	"fmt"
	"strconv"

	"gorm.io/gorm"

	"consultorio-juridico/internal/models"
	"consultorio-juridico/pkg/auth"
)

type AuthService struct {
	db           *gorm.DB
	jwtSecret    string
	jwtExp       int
	emailService *EmailService
}

func NewAuthService(db *gorm.DB, jwtSecret string, jwtExp int, emailService *EmailService) *AuthService {
	return &AuthService{
		db:           db,
		jwtSecret:    jwtSecret,
		jwtExp:       jwtExp,
		emailService: emailService,
	}
}

func (s *AuthService) Login(req models.LoginRequest) (*models.LoginResponse, error) {
	var user models.User
	var estudiante models.Estudiante
	var profesor models.Profesor

	if err := s.db.Where("email = ? AND activo = true", req.Email).First(&user).Error; err != nil {
		return nil, errors.New("credenciales inválidas")
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		return nil, errors.New("credenciales inválidas")
	}

	// Verificar si el email está verificado
	if !user.EmailVerified {
		return nil, errors.New("debes verificar tu correo electrónico antes de iniciar sesión")
	}

	userResponse := models.UserResponse{
		ID:            user.ID,
		NombreUsuario: user.NombreUsuario,
		Email:         user.Email,
		Role:          user.Role,
		Activo:        user.Activo,
		EmailVerified: user.EmailVerified,
		CreatedAt:     user.CreatedAt,
	}

	// Obtener datos específicos según rol
	switch user.Role {
	case "estudiante":
		if err := s.db.Where("user_id = ?", user.ID).First(&estudiante).Error; err == nil {
			// Validar si el estudiante está activo
			if !estudiante.Activo {
				return nil, errors.New("cuenta suspendida. Contacte al coordinador.")
			}
			
			userResponse.TipoDocumento = estudiante.TipoDocumento
			userResponse.NumeroDocumento = estudiante.NumeroDocumento
			userResponse.Nombres = estudiante.Nombres
			userResponse.Apellidos = estudiante.Apellidos
			userResponse.NumeroCelular = estudiante.NumeroCelular
			userResponse.Sede = estudiante.Sede
			codigo := strconv.Itoa(estudiante.CodigoEstudiantil)
			userResponse.CodigoEstudiantil = &codigo
		}
	case "profesor":
		if err := s.db.Where("user_id = ?", user.ID).First(&profesor).Error; err == nil {
			userResponse.TipoDocumento = profesor.TipoDocumento
			userResponse.NumeroDocumento = profesor.NumeroDocumento
			userResponse.Nombres = profesor.Nombres
			userResponse.Apellidos = profesor.Apellidos
			userResponse.NumeroCelular = profesor.NumeroCelular
			userResponse.Sede = profesor.Sede
		}
	}

	token, err := auth.GenerateToken(&user, s.jwtSecret, s.jwtExp)
	if err != nil {
		return nil, errors.New("error generando token")
	}

	return &models.LoginResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		User:        userResponse,
	}, nil
}

func (s *AuthService) RegistrarEstudiante(req models.RegistroEstudianteRequest) (*models.LoginResponse, error) {
	// Verificar que el email sea único
	var existingUser models.User
	if err := s.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return nil, errors.New("el email ya está registrado")
	}

	// Verificar que el número de documento sea único
	var existingEstudiante models.Estudiante
	if err := s.db.Where("numero_documento = ?", req.NumeroDocumento).First(&existingEstudiante).Error; err == nil {
		return nil, errors.New("el número de documento ya está registrado")
	}

	// Hash de la contraseña
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, errors.New("error procesando contraseña")
	}

	codigoEstudiantil, err := strconv.Atoi(req.CodigoEstudiantil)
	if err != nil {
		return nil, errors.New("código estudiantil inválido")
	}

	// Crear usuario (verificado automáticamente para pruebas)
	user := models.User{
		NombreUsuario:   req.NombreUsuario,
		Email:           req.Email,
		PasswordHash:    hashedPassword,
		Role:            "estudiante",
		Activo:          true,
		EmailVerified:   false, // HABILITADO: Verificación por correo electrónico
		TipoDocumento:   req.TipoDocumento,
		NumeroDocumento: req.NumeroDocumento,
		Nombres:         req.Nombres,
		Apellidos:       req.Apellidos,
		NumeroCelular:   req.NumeroCelular,
		Sede:            req.Sede,
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, errors.New("error creando usuario")
	}

	// Crear registro de estudiante
	estudiante := models.Estudiante{
		UserID:            user.ID,
		TipoDocumento:     req.TipoDocumento,
		NumeroDocumento:   req.NumeroDocumento,
		Nombres:           req.Nombres,
		Apellidos:         req.Apellidos,
		NumeroCelular:     req.NumeroCelular,
		CodigoEstudiantil: codigoEstudiantil,
		Sede:              req.Sede,
		Activo:            true,
	}

	if err := s.db.Create(&estudiante).Error; err != nil {
		s.db.Delete(&user) // Rollback
		return nil, errors.New("error creando registro de estudiante")
	}

	// Generar y enviar código de verificación
	code := s.emailService.GenerateVerificationCode()
	if err := s.emailService.SetVerificationCode(user.ID, code); err != nil {
		return nil, errors.New("error configurando verificación")
	}

	// Enviar email de verificación
	name := fmt.Sprintf("%s %s", user.Nombres, user.Apellidos)
	if err := s.emailService.SendVerificationEmail(user.Email, name, code); err != nil {
		return nil, fmt.Errorf("error enviando email de verificación: %v", err)
	}

	return &models.LoginResponse{
		Message: "Registro exitoso. Por favor verifica tu correo electrónico para activar tu cuenta.",
	}, nil
}

func (s *AuthService) RegistrarProfesor(req models.RegistroProfesorRequest) (*models.LoginResponse, error) {
	// Verificar que el email sea único
	var existingUser models.User
	if err := s.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return nil, errors.New("el email ya está registrado")
	}

	// Hash de la contraseña
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, errors.New("error procesando contraseña")
	}

	// Crear usuario (verificado automáticamente para pruebas)
	user := models.User{
		NombreUsuario:   req.NombreUsuario,
		Email:           req.Email,
		PasswordHash:    hashedPassword,
		Role:            "profesor",
		Activo:          true,
		EmailVerified:   false, // HABILITADO: Verificación por correo electrónico
		TipoDocumento:   req.TipoDocumento,
		NumeroDocumento: req.NumeroDocumento,
		Nombres:         req.Nombres,
		Apellidos:       req.Apellidos,
		NumeroCelular:   req.NumeroCelular,
		Sede:            req.Sede,
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, errors.New("error creando usuario")
	}

	// Crear registro de profesor
	profesor := models.Profesor{
		UserID:          user.ID,
		TipoDocumento:   req.TipoDocumento,
		NumeroDocumento: req.NumeroDocumento,
		Nombres:         req.Nombres,
		Apellidos:       req.Apellidos,
		NumeroCelular:   req.NumeroCelular,
		Sede:            req.Sede,
		Activo:          true,
	}

	if err := s.db.Create(&profesor).Error; err != nil {
		s.db.Delete(&user) // Rollback
		return nil, errors.New("error creando registro de profesor")
	}

	// Generar y enviar código de verificación
	code := s.emailService.GenerateVerificationCode()
	if err := s.emailService.SetVerificationCode(user.ID, code); err != nil {
		return nil, errors.New("error configurando verificación")
	}

	// Enviar email de verificación
	name := fmt.Sprintf("%s %s", user.Nombres, user.Apellidos)
	if err := s.emailService.SendVerificationEmail(user.Email, name, code); err != nil {
		return nil, fmt.Errorf("error enviando email de verificación: %v", err)
	}

	return &models.LoginResponse{
		Message: "Registro exitoso. Por favor verifica tu correo electrónico para activar tu cuenta.",
	}, nil
}

func (s *AuthService) ObtenerPerfil(userID uint) (*models.UserResponse, error) {
	var user models.User
	var estudiante models.Estudiante
	var profesor models.Profesor

	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, errors.New("usuario no encontrado")
	}

	userResponse := models.UserResponse{
		ID:            user.ID,
		NombreUsuario: user.NombreUsuario,
		Email:         user.Email,
		Role:          user.Role,
		Activo:        user.Activo,
		EmailVerified: user.EmailVerified,
		CreatedAt:     user.CreatedAt,
	}

	switch user.Role {
	case "estudiante":
		if err := s.db.Where("user_id = ?", user.ID).First(&estudiante).Error; err == nil {
			userResponse.TipoDocumento = estudiante.TipoDocumento
			userResponse.NumeroDocumento = estudiante.NumeroDocumento
			userResponse.Nombres = estudiante.Nombres
			userResponse.Apellidos = estudiante.Apellidos
			userResponse.NumeroCelular = estudiante.NumeroCelular
			userResponse.Sede = estudiante.Sede
			codigo := strconv.Itoa(estudiante.CodigoEstudiantil)
			userResponse.CodigoEstudiantil = &codigo
		}
	case "profesor":
		if err := s.db.Where("user_id = ?", user.ID).First(&profesor).Error; err == nil {
			userResponse.TipoDocumento = profesor.TipoDocumento
			userResponse.NumeroDocumento = profesor.NumeroDocumento
			userResponse.Nombres = profesor.Nombres
			userResponse.Apellidos = profesor.Apellidos
			userResponse.NumeroCelular = profesor.NumeroCelular
			userResponse.Sede = profesor.Sede
		}
	}

	return &userResponse, nil
}

// VerificarEmail verifica el código de email del usuario
func (s *AuthService) VerificarEmail(req models.VerifyEmailRequest) error {
	return s.emailService.VerifyEmailCode(req.Email, req.Code)
}

// ReenviarCodigoVerificacion reenvía el código de verificación
func (s *AuthService) ReenviarCodigoVerificacion(req models.ResendVerificationRequest) error {
	return s.emailService.ResendVerificationCode(req.Email)
}

// ForgotPassword envía código de recuperación de contraseña por email
func (s *AuthService) ForgotPassword(req models.ForgotPasswordRequest) error {
	// Verificar que el usuario existe
	var user models.User
	if err := s.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Por seguridad, no revelar si el email existe o no
		return nil
	}

	// Enviar código de recuperación usando el servicio de email
	return s.emailService.SendPasswordResetCode(req.Email)
}

// ResetPassword cambia la contraseña usando el código de verificación
func (s *AuthService) ResetPassword(req models.ResetPasswordRequest) error {
	// Verificar el código de recuperación
	var user models.User
	if err := s.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return errors.New("usuario no encontrado")
	}

	// Verificar código usando el servicio de email
	if err := s.emailService.VerifyPasswordResetCode(req.Email, req.Code); err != nil {
		return err
	}

	// Hashear nueva contraseña
	hashedPassword, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		return errors.New("error procesando nueva contraseña")
	}

	// Actualizar contraseña en la base de datos
	if err := s.db.Model(&user).Update("password_hash", hashedPassword).Error; err != nil {
		return errors.New("error actualizando contraseña")
	}

	// Limpiar código de verificación
	s.db.Model(&user).Updates(models.User{
		VerificationCode:   nil,
		VerificationExpiry: nil,
	})

	return nil
}