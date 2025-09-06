package handlers

import (
	"fmt"
	"net/http"
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
	var profesores []models.Profesor
	result := h.db.Preload("User").Where("activo = true").Find(&profesores)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener profesores"})
		return
	}

	var profesoresDropdown []models.ProfesorDropdown
	for _, prof := range profesores {
		profesoresDropdown = append(profesoresDropdown, models.ProfesorDropdown{
			ID:     prof.ID,
			Nombre: fmt.Sprintf("%s %s", prof.Nombres, prof.Apellidos),
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

	var profesor models.Profesor
	if err := h.db.Where("user_id = ?", user.ID).First(&profesor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profesor no encontrado"})
		return
	}

	nombreCompleto := fmt.Sprintf("%s %s", profesor.Nombres, profesor.Apellidos)

	var controles []models.ControlOperativo
	result := h.db.Preload("CreatedBy").
		Where("nombre_docente_responsable = ? AND activo = true", nombreCompleto).
		Order("created_at DESC").
		Find(&controles)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener controles"})
		return
	}

	c.JSON(http.StatusOK, controles)
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

	// Verificar que este profesor esté asignado a este control
	var profesor models.Profesor
	if err := h.db.Where("user_id = ?", user.ID).First(&profesor).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profesor no encontrado"})
		return
	}

	nombreCompleto := fmt.Sprintf("%s %s", profesor.Nombres, profesor.Apellidos)
	
	if control.NombreDocenteResponsable != nombreCompleto {
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