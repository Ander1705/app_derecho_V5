package models

import (
	"time"
)

type ControlOperativo struct {
	ID                       uint      `gorm:"primaryKey" json:"id"`
	Ciudad                   string    `gorm:"type:varchar(100)" json:"ciudad"`
	FechaDia                 int       `gorm:"not null" json:"fecha_dia"`
	FechaMes                 int       `gorm:"not null" json:"fecha_mes"`
	FechaAno                 int       `gorm:"not null" json:"fecha_ano"`
	NombreDocenteResponsable string    `gorm:"type:varchar(255)" json:"nombre_docente_responsable"`
	NombreEstudiante         string    `gorm:"type:varchar(255)" json:"nombre_estudiante"`
	AreaConsulta             string    `gorm:"type:varchar(100)" json:"area_consulta"`
	RemitidoPor              string    `gorm:"type:varchar(255)" json:"remitido_por"`
	CorreoElectronico        string    `gorm:"type:varchar(255)" json:"correo_electronico"`
	NombreConsultante        string    `gorm:"type:varchar(255)" json:"nombre_consultante"`
	Edad                     int       `json:"edad"`
	FechaNacimientoDia       int       `json:"fecha_nacimiento_dia"`
	FechaNacimientoMes       int       `json:"fecha_nacimiento_mes"`
	FechaNacimientoAno       int       `json:"fecha_nacimiento_ano"`
	LugarNacimiento          string    `gorm:"type:varchar(255)" json:"lugar_nacimiento"`
	Sexo                     string    `gorm:"type:varchar(20)" json:"sexo"`
	TipoDocumento            string    `gorm:"type:varchar(10)" json:"tipo_documento"`
	NumeroDocumento          string    `gorm:"type:varchar(20)" json:"numero_documento"`
	LugarExpedicion          string    `gorm:"type:varchar(255)" json:"lugar_expedicion"`
	Direccion                string    `gorm:"type:varchar(255)" json:"direccion"`
	Barrio                   string    `gorm:"type:varchar(100)" json:"barrio"`
	Estrato                  int       `json:"estrato"`
	NumeroTelefonico         string    `gorm:"type:varchar(20)" json:"numero_telefonico"`
	NumeroCelular            string    `gorm:"type:varchar(20)" json:"numero_celular"`
	EstadoCivil              string    `gorm:"type:varchar(50)" json:"estado_civil"`
	Escolaridad              string    `gorm:"type:varchar(100)" json:"escolaridad"`
	ProfesionOficio          string    `gorm:"type:varchar(100)" json:"profesion_oficio"`
	DescripcionCaso          string    `gorm:"type:text" json:"descripcion_caso"`
	ConceptoEstudiante       string    `gorm:"type:text" json:"concepto_estudiante"`
	ConceptoAsesor           string    `gorm:"type:text" json:"concepto_asesor"`
	EstadoFlujo              string    `gorm:"type:varchar(50);default:'pendiente_profesor'" json:"estado_flujo"`
	EstadoResultado          *string   `gorm:"type:varchar(50)" json:"estado_resultado"`
	Activo                   bool      `gorm:"default:true" json:"activo"`
	CreatedAt                time.Time `json:"created_at"`
	UpdatedAt                time.Time `json:"updated_at"`
	CreatedByID              uint      `gorm:"not null" json:"created_by"`
	CreatedBy                User      `gorm:"foreignKey:CreatedByID" json:"created_by_user,omitempty"`
	DocumentosAdjuntos       []DocumentoAdjunto `gorm:"foreignKey:ControlOperativoID" json:"documentos_adjuntos,omitempty"`
	Notificaciones           []Notificacion     `gorm:"foreignKey:ControlOperativoID" json:"notificaciones,omitempty"`
}

type DocumentoAdjunto struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	ControlOperativoID uint      `gorm:"not null" json:"control_operativo_id"`
	NombreOriginal     string    `gorm:"type:varchar(255)" json:"nombre_original"`
	NombreArchivo      string    `gorm:"type:varchar(255)" json:"nombre_archivo"`
	TipoArchivo        string    `gorm:"type:varchar(50)" json:"tipo_archivo"`
	TamanoBytes        int64     `json:"tamano_bytes"`
	RutaArchivo        string    `gorm:"type:varchar(500)" json:"ruta_archivo"`
	ConvertidoPDF      bool      `gorm:"default:false" json:"convertido_pdf"`
	RutaPDF            string    `gorm:"type:varchar(500)" json:"ruta_pdf"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type Notificacion struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	ControlOperativoID uint      `gorm:"not null" json:"control_operativo_id"`
	UserID             uint      `gorm:"not null" json:"user_id"`
	TipoNotificacion   string    `gorm:"type:varchar(100)" json:"tipo_notificacion"`
	Mensaje            string    `gorm:"type:text" json:"mensaje"`
	Leida              bool      `gorm:"default:false" json:"leida"`
	CreatedAt          time.Time `json:"created_at"`
	User               User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	ControlOperativo   ControlOperativo `gorm:"foreignKey:ControlOperativoID" json:"control_operativo,omitempty"`
}

// DTOs para requests
type ControlOperativoRequest struct {
	Ciudad                   string `json:"ciudad" binding:"required"`
	FechaDia                 int    `json:"fecha_dia" binding:"required"`
	FechaMes                 int    `json:"fecha_mes" binding:"required"`
	FechaAno                 int    `json:"fecha_ano" binding:"required"`
	NombreDocenteResponsable string `json:"nombre_docente_responsable" binding:"required"`
	NombreEstudiante         string `json:"nombre_estudiante" binding:"required"`
	AreaConsulta             string `json:"area_consulta" binding:"required"`
	RemitidoPor              string `json:"remitido_por"`
	CorreoElectronico        string `json:"correo_electronico"`
	NombreConsultante        string `json:"nombre_consultante" binding:"required"`
	Edad                     int    `json:"edad"`
	FechaNacimientoDia       int    `json:"fecha_nacimiento_dia"`
	FechaNacimientoMes       int    `json:"fecha_nacimiento_mes"`
	FechaNacimientoAno       int    `json:"fecha_nacimiento_ano"`
	LugarNacimiento          string `json:"lugar_nacimiento"`
	Sexo                     string `json:"sexo"`
	TipoDocumento            string `json:"tipo_documento"`
	NumeroDocumento          string `json:"numero_documento"`
	LugarExpedicion          string `json:"lugar_expedicion"`
	Direccion                string `json:"direccion"`
	Barrio                   string `json:"barrio"`
	Estrato                  int    `json:"estrato"`
	NumeroTelefonico         string `json:"numero_telefonico"`
	NumeroCelular            string `json:"numero_celular"`
	EstadoCivil              string `json:"estado_civil"`
	Escolaridad              string `json:"escolaridad"`
	ProfesionOficio          string `json:"profesion_oficio"`
	DescripcionCaso          string `json:"descripcion_caso" binding:"required"`
	ConceptoEstudiante       string `json:"concepto_estudiante" binding:"required"`
}

type ConceptoAsesorRequest struct {
	ConceptoAsesor string `json:"concepto_asesor" binding:"required"`
}

type EstadoResultadoRequest struct {
	EstadoResultado string `json:"estado_resultado" binding:"required"`
}