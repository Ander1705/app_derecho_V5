package models

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RegistroEstudianteRequest struct {
	TipoDocumento     string `json:"tipo_documento" binding:"required"`
	NumeroDocumento   string `json:"numero_documento" binding:"required"`
	Nombres           string `json:"nombres" binding:"required"`
	Apellidos         string `json:"apellidos" binding:"required"`
	NumeroCelular     string `json:"numero_celular" binding:"required"`
	CodigoEstudiantil string `json:"codigo_estudiantil" binding:"required"`
	NombreUsuario     string `json:"nombre_usuario" binding:"required,min=3,max=50"`
	Email             string `json:"email" binding:"required,email"`
	Password          string `json:"password" binding:"required,min=6"`
	Sede              string `json:"sede" binding:"required"`
}

type RegistroProfesorRequest struct {
	TipoDocumento   string `json:"tipo_documento" binding:"required"`
	NumeroDocumento string `json:"numero_documento" binding:"required"`
	Nombres         string `json:"nombres" binding:"required"`
	Apellidos       string `json:"apellidos" binding:"required"`
	NumeroCelular   string `json:"numero_celular" binding:"required"`
	NombreUsuario   string `json:"nombre_usuario" binding:"required,min=3,max=50"`
	Email           string `json:"email" binding:"required,email"`
	Password        string `json:"password" binding:"required,min=6"`
	Sede            string `json:"sede" binding:"required"`
}

type LoginResponse struct {
	AccessToken string       `json:"access_token"`
	TokenType   string       `json:"token_type"`
	User        UserResponse `json:"user"`
	Message     string       `json:"message,omitempty"`
}

type UsuarioEstadoRequest struct {
	Activo bool `json:"activo"`
}

type ProfesorDropdown struct {
	ID     uint   `json:"id"`
	Nombre string `json:"nombre"`
}