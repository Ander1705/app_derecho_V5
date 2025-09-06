package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"consultorio-juridico/internal/models"
	"consultorio-juridico/internal/services"
	"consultorio-juridico/pkg/auth"
	"consultorio-juridico/pkg/pdf"
)

type ControlOperativoHandler struct {
	db                  *gorm.DB
	notificationService *services.NotificationService
	pdfGenerator        *pdf.PDFGenerator
}

func NewControlOperativoHandler(db *gorm.DB, notificationService *services.NotificationService, pdfGenerator *pdf.PDFGenerator) *ControlOperativoHandler {
	return &ControlOperativoHandler{
		db:                  db,
		notificationService: notificationService,
		pdfGenerator:        pdfGenerator,
	}
}

func (h *ControlOperativoHandler) CrearControl(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	var req models.ControlOperativoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	// Crear control operativo
	control := models.ControlOperativo{
		Ciudad:                   req.Ciudad,
		FechaDia:                 req.FechaDia,
		FechaMes:                 req.FechaMes,
		FechaAno:                 req.FechaAno,
		NombreDocenteResponsable: req.NombreDocenteResponsable,
		NombreEstudiante:         req.NombreEstudiante,
		AreaConsulta:             req.AreaConsulta,
		RemitidoPor:              req.RemitidoPor,
		CorreoElectronico:        req.CorreoElectronico,
		NombreConsultante:        req.NombreConsultante,
		Edad:                     req.Edad,
		FechaNacimientoDia:       req.FechaNacimientoDia,
		FechaNacimientoMes:       req.FechaNacimientoMes,
		FechaNacimientoAno:       req.FechaNacimientoAno,
		LugarNacimiento:          req.LugarNacimiento,
		Sexo:                     req.Sexo,
		TipoDocumento:            req.TipoDocumento,
		NumeroDocumento:          req.NumeroDocumento,
		LugarExpedicion:          req.LugarExpedicion,
		Direccion:                req.Direccion,
		Barrio:                   req.Barrio,
		Estrato:                  req.Estrato,
		NumeroTelefonico:         req.NumeroTelefonico,
		NumeroCelular:            req.NumeroCelular,
		EstadoCivil:              req.EstadoCivil,
		Escolaridad:              req.Escolaridad,
		ProfesionOficio:          req.ProfesionOficio,
		DescripcionCaso:          req.DescripcionCaso,
		ConceptoEstudiante:       req.ConceptoEstudiante,
		EstadoFlujo:              "pendiente_profesor",
		Activo:                   true,
		CreatedByID:              user.ID,
	}

	if err := h.db.Create(&control).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creando control operativo"})
		return
	}

	// Enviar notificación al profesor
	go h.notificationService.NotificarNuevoControlAProfesor(control.ID, req.NombreDocenteResponsable)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Control operativo creado exitosamente",
		"control": control,
	})
}

func (h *ControlOperativoHandler) ListarControles(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	var controles []models.ControlOperativo
	query := h.db.Preload("CreatedBy").Where("activo = true")

	// Filtrar por rol
	switch user.Role {
	case "estudiante":
		// Los estudiantes solo ven sus propios controles
		query = query.Where("created_by_id = ?", user.ID)
	case "coordinador":
		// Los coordinadores ven todos los controles
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "Acceso denegado"})
		return
	}

	if err := query.Order("created_at DESC").Find(&controles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo controles"})
		return
	}

	c.JSON(http.StatusOK, controles)
}

func (h *ControlOperativoHandler) ObtenerControl(c *gin.Context) {
	controlID := c.Param("id")
	
	var control models.ControlOperativo
	if err := h.db.Preload("CreatedBy").First(&control, controlID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Control operativo no encontrado"})
		return
	}

	c.JSON(http.StatusOK, control)
}

func (h *ControlOperativoHandler) GenerarPDF(c *gin.Context) {
	controlID := c.Param("id")
	
	var control models.ControlOperativo
	if err := h.db.Preload("CreatedBy").First(&control, controlID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Control operativo no encontrado"})
		return
	}

	// Generar PDF
	pdfBytes, err := h.pdfGenerator.GenerarControlOperativo(&control)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generando PDF"})
		return
	}

	// Configurar headers para descarga
	filename := fmt.Sprintf("control_operativo_%d.pdf", control.ID)
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Length", strconv.Itoa(len(pdfBytes)))

	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}