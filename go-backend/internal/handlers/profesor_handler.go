package handlers

import (
	"fmt"
	"net/http"
	"strconv"
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

	var controles []models.ControlOperativo
	// Buscar controles asignados directamente por ID del profesor
	dbResult := h.db.Preload("CreatedBy").Preload("ProfesorAsignado").Preload("DocumentosAdjuntos").
		Where("profesor_asignado_id = ? AND activo = true", user.ID).
		Order("created_at DESC").
		Find(&controles)
	
	fmt.Printf("🔍 PROFESOR: Buscando controles para profesor ID %d, encontrados: %d\n", user.ID, len(controles))

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
			"profesor_asignado_id":       control.ProfesorAsignadoID,
			"created_by_user":            control.CreatedBy,
			"profesor_asignado":          control.ProfesorAsignado,
			"ya_calificado":              count > 0,
		}

		response = append(response, controlMap)
	}

	c.JSON(http.StatusOK, response)
}

func (h *ProfesorHandler) CompletarConcepto(c *gin.Context) {
	controlID := c.Param("id")
	var request struct {
		ConceptoAsesor string `json:"concepto_asesor" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Concepto requerido"})
		return
	}

	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	// UPDATE directo sin SELECT previo - MÁXIMO RENDIMIENTO
	result := h.db.Model(&models.ControlOperativo{}).
		Where("id = ? AND profesor_asignado_id = ? AND activo = true", controlID, user.ID).
		Updates(map[string]interface{}{
			"concepto_asesor": request.ConceptoAsesor,
			"estado_flujo":    "completo",
			"updated_at":      time.Now(),
		})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar concepto"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Control no encontrado o no asignado"})
		return
	}

	// Notificación async (no bloqueante)
	go func() {
		// Solo buscar created_by_id para notificación
		var createdByID uint
		h.db.Model(&models.ControlOperativo{}).
			Select("created_by_id").
			Where("id = ?", controlID).
			Scan(&createdByID)
		
		if createdByID > 0 {
			controlIDUint, _ := strconv.ParseUint(controlID, 10, 32)
			h.notificationService.NotificarControlCompletadoAEstudiante(uint(controlIDUint), createdByID)
		}
	}()

	// Respuesta inmediata
	c.JSON(http.StatusOK, gin.H{
		"message": "Concepto guardado exitosamente",
		"status":  "completed",
	})
}