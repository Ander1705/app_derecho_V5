package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"consultorio-juridico/internal/models"
	"consultorio-juridico/internal/services"
	"consultorio-juridico/pkg/auth"
)

type ProfesorHandler struct {
	db                  *gorm.DB
	notificationService *services.NotificationService
}

func NewProfesorHandler(db *gorm.DB, notificationService *services.NotificationService) *ProfesorHandler {
	return &ProfesorHandler{
		db:                  db,
		notificationService: notificationService,
	}
}

func (h *ProfesorHandler) ListarProfesores(c *gin.Context) {
	var usuarios []models.User
	result := h.db.Where("role = ? AND activo = true", "profesor").Find(&usuarios)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener profesores"})
		return
	}

	var profesoresDropdown []models.ProfesorDropdown
	for _, usuario := range usuarios {
		profesoresDropdown = append(profesoresDropdown, models.ProfesorDropdown{
			ID:     usuario.ID,
			Nombre: fmt.Sprintf("%s %s", strings.TrimSpace(usuario.Nombres), strings.TrimSpace(usuario.Apellidos)),
		})
	}

	c.JSON(http.StatusOK, profesoresDropdown)
}

func (h *ProfesorHandler) ObtenerControlesAsignados(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	if user.Role != "profesor" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acceso denegado"})
		return
	}

	// Usar directamente los datos del usuario autenticado
	nombreCompleto := fmt.Sprintf("%s %s", strings.TrimSpace(user.Nombres), strings.TrimSpace(user.Apellidos))

	var controles []models.ControlOperativo
	// Buscar con nombre exacto y también con variaciones de espacios
	dbResult := h.db.Preload("CreatedBy").Preload("DocumentosAdjuntos").
		Where("(TRIM(nombre_docente_responsable) = TRIM(?) OR nombre_docente_responsable = ?) AND activo = true", nombreCompleto, nombreCompleto).
		Order("created_at DESC").
		Find(&controles)

	if dbResult.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener controles"})
		return
	}

	// Crear respuesta con información de calificaciones usando mapas
	var response []map[string]interface{}
	for _, control := range controles {
		// Verificar si ya existe una calificación para este control
		var count int64
		h.db.Model(&models.Calificacion{}).
			Where("control_operativo_id = ? AND estudiante_id = ?", control.ID, control.CreatedByID).
			Count(&count)

		// Convertir el control a mapa y agregar el campo ya_calificado
		controlMap := map[string]interface{}{
			"id":                          control.ID,
			"ciudad":                      control.Ciudad,
			"fecha_dia":                   control.FechaDia,
			"fecha_mes":                   control.FechaMes,
			"fecha_ano":                   control.FechaAno,
			"nombre_docente_responsable":  control.NombreDocenteResponsable,
			"nombre_estudiante":           control.NombreEstudiante,
			"area_consulta":              control.AreaConsulta,
			"remitido_por":               control.RemitidoPor,
			"correo_electronico":         control.CorreoElectronico,
			"nombre_consultante":         control.NombreConsultante,
			"edad":                       control.Edad,
			"fecha_nacimiento_dia":       control.FechaNacimientoDia,
			"fecha_nacimiento_mes":       control.FechaNacimientoMes,
			"fecha_nacimiento_ano":       control.FechaNacimientoAno,
			"lugar_nacimiento":           control.LugarNacimiento,
			"sexo":                       control.Sexo,
			"tipo_documento":             control.TipoDocumento,
			"numero_documento":           control.NumeroDocumento,
			"lugar_expedicion":           control.LugarExpedicion,
			"direccion":                  control.Direccion,
			"barrio":                     control.Barrio,
			"estrato":                    control.Estrato,
			"numero_telefonico":          control.NumeroTelefonico,
			"numero_celular":             control.NumeroCelular,
			"estado_civil":               control.EstadoCivil,
			"escolaridad":                control.Escolaridad,
			"profesion_oficio":           control.ProfesionOficio,
			"descripcion_caso":           control.DescripcionCaso,
			"concepto_estudiante":        control.ConceptoEstudiante,
			"concepto_asesor":            control.ConceptoAsesor,
			"estado_flujo":               control.EstadoFlujo,
			"estado_resultado":           control.EstadoResultado,
			"activo":                     control.Activo,
			"created_at":                 control.CreatedAt,
			"updated_at":                 control.UpdatedAt,
			"created_by":                 control.CreatedByID,
			"created_by_user":            control.CreatedBy,
			"ya_calificado":              count > 0,
		}

		response = append(response, controlMap)
	}

	c.JSON(http.StatusOK, response)
}

func (h *ProfesorHandler) CompletarConcepto(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	if user.Role != "profesor" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acceso denegado"})
		return
	}

	controlID := c.Param("id")
	var req models.ConceptoAsesorRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var control models.ControlOperativo
	if err := h.db.First(&control, controlID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Control operativo no encontrado"})
		return
	}

	// Usar directamente los datos del usuario autenticado
	nombreCompleto := fmt.Sprintf("%s %s", strings.TrimSpace(user.Nombres), strings.TrimSpace(user.Apellidos))
	
	// Verificar con nombres flexibles (ignorando espacios extra)
	if strings.TrimSpace(control.NombreDocenteResponsable) != strings.TrimSpace(nombreCompleto) {
		c.JSON(http.StatusForbidden, gin.H{"error": "No está autorizado para editar este control"})
		return
	}

	// Actualizar concepto y cambiar estado a completo
	control.ConceptoAsesor = req.ConceptoAsesor
	control.EstadoFlujo = "completo"
	control.UpdatedAt = time.Now()

	if err := h.db.Save(&control).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar control operativo"})
		return
	}

	// Enviar notificación al estudiante
	go h.notificationService.NotificarControlCompletadoAEstudiante(control.ID, control.CreatedByID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Concepto del asesor guardado exitosamente",
		"control": control,
	})
}