package models

import (
	"time"
)

type User struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	NombreUsuario   string    `gorm:"uniqueIndex" json:"nombre_usuario"`
	Email           string    `gorm:"uniqueIndex" json:"email"`
	PasswordHash    string    `json:"-"`
	Role            string    `gorm:"default:'estudiante'" json:"role"`
	Activo          bool      `gorm:"default:true" json:"activo"`
	TipoDocumento   string    `gorm:"type:varchar(50)" json:"tipo_documento"`
	NumeroDocumento string    `gorm:"type:varchar(50)" json:"numero_documento"`
	Nombres         string    `gorm:"type:varchar(100)" json:"nombres"`
	Apellidos       string    `gorm:"type:varchar(100)" json:"apellidos"`
	NumeroCelular   string    `gorm:"type:varchar(20)" json:"numero_celular"`
	Sede            string    `gorm:"type:varchar(100)" json:"sede"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Estudiante struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	UserID            uint      `gorm:"unique" json:"user_id"`
	TipoDocumento     string    `json:"tipo_documento"`
	NumeroDocumento   string    `gorm:"unique" json:"numero_documento"`
	Nombres           string    `json:"nombres"`
	Apellidos         string    `json:"apellidos"`
	NumeroCelular     string    `json:"numero_celular"`
	CodigoEstudiantil int       `gorm:"unique" json:"codigo_estudiantil"`
	Sede              string    `json:"sede"`
	Activo            bool      `gorm:"default:true" json:"activo"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
	User              User      `gorm:"foreignKey:UserID" json:"user"`
}

type Profesor struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	UserID          uint      `gorm:"unique" json:"user_id"`
	TipoDocumento   string    `json:"tipo_documento"`
	NumeroDocumento string    `gorm:"unique" json:"numero_documento"`
	Nombres         string    `json:"nombres"`
	Apellidos       string    `json:"apellidos"`
	NumeroCelular   string    `json:"numero_celular"`
	Sede            string    `json:"sede"`
	Activo          bool      `gorm:"default:true" json:"activo"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	User            User      `gorm:"foreignKey:UserID" json:"user"`
}

type UserResponse struct {
	ID                uint      `json:"id"`
	TipoDocumento     string    `json:"tipo_documento"`
	NumeroDocumento   string    `json:"numero_documento"`
	Nombres           string    `json:"nombres"`
	Apellidos         string    `json:"apellidos"`
	NumeroCelular     string    `json:"numero_celular"`
	NombreUsuario     string    `json:"nombre_usuario"`
	Email             string    `json:"email"`
	Role              string    `json:"role"`
	Sede              string    `json:"sede"`
	CodigoEstudiantil *string   `json:"codigo_estudiantil,omitempty"`
	Activo            bool      `json:"activo"`
	CreatedAt         time.Time `json:"created_at"`
}