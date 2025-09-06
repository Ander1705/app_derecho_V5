package services

import (
	"errors"
	"strconv"

	"gorm.io/gorm"

	"consultorio-juridico/internal/models"
	"consultorio-juridico/pkg/auth"
)

type AuthService struct {
	db        *gorm.DB
	jwtSecret string
	jwtExp    int
}

func NewAuthService(db *gorm.DB, jwtSecret string, jwtExp int) *AuthService {
	return &AuthService{
		db:        db,
		jwtSecret: jwtSecret,
		jwtExp:    jwtExp,
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

	userResponse := models.UserResponse{
		ID:            user.ID,
		NombreUsuario: user.NombreUsuario,
		Email:         user.Email,
		Role:          user.Role,
		Activo:        user.Activo,
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

	// Crear usuario
	user := models.User{
		NombreUsuario:   req.NombreUsuario,
		Email:           req.Email,
		PasswordHash:    hashedPassword,
		Role:            "estudiante",
		Activo:          true,
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

	// Generar token
	token, err := auth.GenerateToken(&user, s.jwtSecret, s.jwtExp)
	if err != nil {
		return nil, errors.New("error generando token")
	}

	userResponse := models.UserResponse{
		ID:                user.ID,
		TipoDocumento:     estudiante.TipoDocumento,
		NumeroDocumento:   estudiante.NumeroDocumento,
		Nombres:           estudiante.Nombres,
		Apellidos:         estudiante.Apellidos,
		NumeroCelular:     estudiante.NumeroCelular,
		NombreUsuario:     user.NombreUsuario,
		Email:             user.Email,
		Role:              user.Role,
		Sede:              estudiante.Sede,
		Activo:            user.Activo,
		CreatedAt:         user.CreatedAt,
	}
	codigo := strconv.Itoa(estudiante.CodigoEstudiantil)
	userResponse.CodigoEstudiantil = &codigo

	return &models.LoginResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		User:        userResponse,
		Message:     "Estudiante registrado exitosamente",
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

	// Crear usuario
	user := models.User{
		NombreUsuario:   req.NombreUsuario,
		Email:           req.Email,
		PasswordHash:    hashedPassword,
		Role:            "profesor",
		Activo:          true,
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

	// Generar token
	token, err := auth.GenerateToken(&user, s.jwtSecret, s.jwtExp)
	if err != nil {
		return nil, errors.New("error generando token")
	}

	userResponse := models.UserResponse{
		ID:              user.ID,
		TipoDocumento:   profesor.TipoDocumento,
		NumeroDocumento: profesor.NumeroDocumento,
		Nombres:         profesor.Nombres,
		Apellidos:       profesor.Apellidos,
		NumeroCelular:   profesor.NumeroCelular,
		NombreUsuario:   user.NombreUsuario,
		Email:           user.Email,
		Role:            user.Role,
		Sede:            profesor.Sede,
		Activo:          user.Activo,
		CreatedAt:       user.CreatedAt,
	}

	return &models.LoginResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		User:        userResponse,
		Message:     "Profesor registrado exitosamente",
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