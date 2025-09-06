package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"consultorio-juridico/internal/models"
	"consultorio-juridico/internal/services"
	"consultorio-juridico/pkg/auth"
)

type CoordinadorHandler struct {
	db                  *gorm.DB
	notificationService *services.NotificationService
}

func NewCoordinadorHandler(db *gorm.DB, notificationService *services.NotificationService) *CoordinadorHandler {
	return &CoordinadorHandler{
		db:                  db,
		notificationService: notificationService,
	}
}

func (h *CoordinadorHandler) ListarUsuarios(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	
	if user.Role != "coordinador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acceso denegado"})
		return
	}

	var usuarios []models.User
	result := h.db.Where("role IN ('estudiante', 'profesor')").
		Order("created_at DESC").
		Find(&usuarios)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener usuarios"})
		return
	}

	c.JSON(http.StatusOK, usuarios)
}

func (h *CoordinadorHandler) CambiarEstadoUsuario(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	
	if user.Role != "coordinador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acceso denegado"})
		return
	}

	userID := c.Param("id")
	var req models.UsuarioEstadoRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var targetUser models.User
	if err := h.db.First(&targetUser, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuario no encontrado"})
		return
	}

	// No permitir desactivar coordinadores
	if targetUser.Role == "coordinador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "No se puede desactivar un coordinador"})
		return
	}

	targetUser.Activo = req.Activo
	targetUser.UpdatedAt = time.Now()

	if err := h.db.Save(&targetUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar usuario"})
		return
	}

	// También actualizar en tabla específica (estudiante/profesor)
	switch targetUser.Role {
	case "estudiante":
		h.db.Model(&models.Estudiante{}).Where("user_id = ?", targetUser.ID).Update("activo", req.Activo)
	case "profesor":
		h.db.Model(&models.Profesor{}).Where("user_id = ?", targetUser.ID).Update("activo", req.Activo)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Estado del usuario actualizado",
		"usuario": targetUser,
	})
}

func (h *CoordinadorHandler) ListarControlesCompletos(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	
	if user.Role != "coordinador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acceso denegado"})
		return
	}

	var controles []models.ControlOperativo
	query := h.db.Preload("CreatedBy").Where("activo = true")
	
	// Filtrar por estado si se proporciona
	estado := c.Query("estado")
	if estado == "pendiente" {
		// Solo controles completos sin resultado asignado
		query = query.Where("estado_flujo = 'completo' AND (estado_resultado IS NULL OR estado_resultado = '')")
	} else {
		// Comportamiento por defecto: todos los controles completos
		query = query.Where("estado_flujo IN ('completo', 'con_resultado')")
	}
	
	result := query.Order("created_at DESC").Find(&controles)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener controles"})
		return
	}

	c.JSON(http.StatusOK, controles)
}

func (h *CoordinadorHandler) AsignarResultado(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	
	if user.Role != "coordinador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acceso denegado"})
		return
	}

	controlID := c.Param("id")
	var req models.EstadoResultadoRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validar que el estado resultado sea válido
	estadosValidos := map[string]bool{
		"asesoria_consulta":      true,
		"auto_reparto":           true,
		"reparto":                true,
		"solicitud_conciliacion": true,
	}

	if !estadosValidos[req.EstadoResultado] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Estado resultado no válido"})
		return
	}

	var control models.ControlOperativo
	if err := h.db.First(&control, controlID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Control operativo no encontrado"})
		return
	}

	if control.EstadoFlujo != "completo" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El control debe estar completo antes de asignar resultado"})
		return
	}

	control.EstadoResultado = &req.EstadoResultado
	control.EstadoFlujo = "con_resultado"
	control.UpdatedAt = time.Now()

	if err := h.db.Save(&control).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al asignar resultado"})
		return
	}

	// Enviar notificación al estudiante
	go h.notificationService.NotificarResultadoAsignadoAEstudiante(control.ID, control.CreatedByID, req.EstadoResultado)

	c.JSON(http.StatusOK, gin.H{
		"message": "Resultado asignado exitosamente",
		"control": control,
	})
}

func (h *CoordinadorHandler) ObtenerEstadisticas(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	
	if user.Role != "coordinador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acceso denegado"})
		return
	}

	var estadisticas struct {
		EstudiantesRegistrados int64 `json:"estudiantes_registrados"`
		ProfesoresRegistrados  int64 `json:"profesores_registrados"`
		ControlesPendientes    int64 `json:"controles_pendientes"`
		TotalControles        int64 `json:"total_controles"`
	}

	// Contar estudiantes registrados
	h.db.Model(&models.User{}).Where("role = 'estudiante'").Count(&estadisticas.EstudiantesRegistrados)
	
	// Contar profesores registrados  
	h.db.Model(&models.User{}).Where("role = 'profesor'").Count(&estadisticas.ProfesoresRegistrados)
	
	// Contar controles pendientes (completos pero sin resultado)
	h.db.Model(&models.ControlOperativo{}).
		Where("estado_flujo = 'completo' AND (estado_resultado IS NULL OR estado_resultado = '') AND activo = true").
		Count(&estadisticas.ControlesPendientes)
	
	// Contar total de controles operativos
	h.db.Model(&models.ControlOperativo{}).Where("activo = true").Count(&estadisticas.TotalControles)

	c.JSON(http.StatusOK, estadisticas)
}