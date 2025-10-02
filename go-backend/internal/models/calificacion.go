package models

import (
	"time"
	"gorm.io/gorm"
)

// Calificacion representa la evaluación de un estudiante en un control operativo específico
type Calificacion struct {
	ID                    uint      `gorm:"primaryKey" json:"id"`
	ControlOperativoID    uint      `gorm:"not null;index" json:"control_operativo_id"`
	EstudianteID          uint      `gorm:"not null;index" json:"estudiante_id"`
	ProfesorEvaluadorID   *uint     `gorm:"index" json:"profesor_evaluador_id"`
	CoordinadorEvaluadorID *uint    `gorm:"index" json:"coordinador_evaluador_id"`
	
	// Criterios de evaluación (1-5)
	CumplimientoHorario   int `gorm:"not null;check:cumplimiento_horario >= 1 AND cumplimiento_horario <= 5" json:"cumplimiento_horario"`
	PresentacionPersonal  int `gorm:"not null;check:presentacion_personal >= 1 AND presentacion_personal <= 5" json:"presentacion_personal"`
	ConocimientoJuridico  int `gorm:"not null;check:conocimiento_juridico >= 1 AND conocimiento_juridico <= 5" json:"conocimiento_juridico"`
	TrabajoEquipo         int `gorm:"not null;check:trabajo_equipo >= 1 AND trabajo_equipo <= 5" json:"trabajo_equipo"`
	AtencionUsuario       int `gorm:"not null;check:atencion_usuario >= 1 AND atencion_usuario <= 5" json:"atencion_usuario"`
	
	// Promedio calculado automáticamente
	PromedioGeneral       float64 `json:"promedio_general"`
	
	// Observaciones adicionales
	Observaciones         string  `gorm:"type:text" json:"observaciones"`
	
	// Metadatos
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
	
	// Relaciones
	ControlOperativo      ControlOperativo `gorm:"foreignKey:ControlOperativoID" json:"control_operativo,omitempty"`
	Estudiante            User             `gorm:"foreignKey:EstudianteID" json:"estudiante,omitempty"`
	ProfesorEvaluador     *User            `gorm:"foreignKey:ProfesorEvaluadorID" json:"profesor_evaluador,omitempty"`
	CoordinadorEvaluador  *User            `gorm:"foreignKey:CoordinadorEvaluadorID" json:"coordinador_evaluador,omitempty"`
}

// CalificacionRequest DTO para crear/actualizar calificaciones
type CalificacionRequest struct {
	ControlOperativoID   uint   `json:"control_operativo_id" binding:"required"`
	EstudianteID         uint   `json:"estudiante_id" binding:"required"`
	CumplimientoHorario  int    `json:"cumplimiento_horario" binding:"required,min=1,max=5"`
	PresentacionPersonal int    `json:"presentacion_personal" binding:"required,min=1,max=5"`
	ConocimientoJuridico int    `json:"conocimiento_juridico" binding:"required,min=1,max=5"`
	TrabajoEquipo        int    `json:"trabajo_equipo" binding:"required,min=1,max=5"`
	AtencionUsuario      int    `json:"atencion_usuario" binding:"required,min=1,max=5"`
	Observaciones        string `json:"observaciones"`
}

// CalificacionResponse DTO para respuestas
type CalificacionResponse struct {
	ID                    uint      `json:"id"`
	ControlOperativoID    uint      `json:"control_operativo_id"`
	EstudianteID          uint      `json:"estudiante_id"`
	EstudianteNombre      string    `json:"estudiante_nombre"`
	ProfesorEvaluador     string    `json:"profesor_evaluador"`
	CoordinadorEvaluador  string    `json:"coordinador_evaluador"`
	CumplimientoHorario   int       `json:"cumplimiento_horario"`
	PresentacionPersonal  int       `json:"presentacion_personal"`
	ConocimientoJuridico  int       `json:"conocimiento_juridico"`
	TrabajoEquipo         int       `json:"trabajo_equipo"`
	AtencionUsuario       int       `json:"atencion_usuario"`
	PromedioGeneral       float64   `json:"promedio_general"`
	Observaciones         string    `json:"observaciones"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

// EstadisticasCalificacion para reportes
type EstadisticasCalificacion struct {
	EstudianteID         uint    `json:"estudiante_id"`
	EstudianteNombre     string  `json:"estudiante_nombre"`
	TotalCalificaciones  int     `json:"total_calificaciones"`
	PromedioGeneral      float64 `json:"promedio_general"`
	PromedioCumplimiento float64 `json:"promedio_cumplimiento"`
	PromedioPresentacion float64 `json:"promedio_presentacion"`
	PromedioConocimiento float64 `json:"promedio_conocimiento"`
	PromedioTrabajo      float64 `json:"promedio_trabajo"`
	PromedioAtencion     float64 `json:"promedio_atencion"`
}

// CalcularPromedio calcula el promedio de una calificación
func (c *Calificacion) CalcularPromedio() {
	total := c.CumplimientoHorario + c.PresentacionPersonal + c.ConocimientoJuridico + c.TrabajoEquipo + c.AtencionUsuario
	c.PromedioGeneral = float64(total) / 5.0
}

// TableName especifica el nombre de tabla para GORM
func (Calificacion) TableName() string {
	return "calificaciones"
}

// BeforeSave hook de GORM para calcular promedio antes de guardar
func (c *Calificacion) BeforeSave(tx *gorm.DB) error {
	c.CalcularPromedio()
	return nil
}