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
)

type CalificacionHandler struct {
	db                  *gorm.DB
	notificationService *services.NotificationService
}

func NewCalificacionHandler(db *gorm.DB, notificationService *services.NotificationService) *CalificacionHandler {
	return &CalificacionHandler{
		db:                  db,
		notificationService: notificationService,
	}
}

// CrearCalificacion permite a profesores y coordinadores crear calificaciones
func (h *CalificacionHandler) CrearCalificacion(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	// Solo profesores y coordinadores pueden crear calificaciones
	if user.Role != "profesor" && user.Role != "coordinador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permisos para crear calificaciones"})
		return
	}

	var req models.CalificacionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos", "details": err.Error()})
		return
	}

	// Verificar que el control operativo existe
	var control models.ControlOperativo
	if err := h.db.First(&control, req.ControlOperativoID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Control operativo no encontrado"})
		return
	}

	// Verificar que el estudiante existe
	var estudiante models.User
	if err := h.db.Where("id = ? AND role = 'estudiante'", req.EstudianteID).First(&estudiante).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Estudiante no encontrado"})
		return
	}

	// Verificar si ya existe una calificación para este control y estudiante
	var existingCalificacion models.Calificacion
	if err := h.db.Where("control_operativo_id = ? AND estudiante_id = ?", req.ControlOperativoID, req.EstudianteID).First(&existingCalificacion).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Ya existe una calificación para este estudiante en este control operativo"})
		return
	}

	// Crear la calificación
	calificacion := models.Calificacion{
		ControlOperativoID:   req.ControlOperativoID,
		EstudianteID:         req.EstudianteID,
		CumplimientoHorario:  req.CumplimientoHorario,
		PresentacionPersonal: req.PresentacionPersonal,
		ConocimientoJuridico: req.ConocimientoJuridico,
		TrabajoEquipo:        req.TrabajoEquipo,
		AtencionUsuario:      req.AtencionUsuario,
		Observaciones:        req.Observaciones,
	}

	// Asignar evaluador según el rol
	if user.Role == "profesor" {
		calificacion.ProfesorEvaluadorID = &user.ID
	} else if user.Role == "coordinador" {
		calificacion.CoordinadorEvaluadorID = &user.ID
	}

	// El hook BeforeSave calculará automáticamente el promedio
	if err := h.db.Create(&calificacion).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creando calificación"})
		return
	}

	// Cargar solo campos mínimos necesarios para respuesta
	var calificacionCompleta models.Calificacion
	err := h.db.
		Preload("Estudiante", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, nombre_usuario, email")
		}).
		Preload("ControlOperativo", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, nombre_consultante, area_consulta")
		}).
		First(&calificacionCompleta, calificacion.ID).Error
	
	if err != nil {
		fmt.Printf("⚠️ Warning: Error cargando relaciones de calificación: %v\n", err)
		calificacionCompleta = calificacion
	} else {
		calificacion = calificacionCompleta
	}

	// Crear notificación para el estudiante
	go func() {
		evaluadorNombre := user.Nombres + " " + user.Apellidos
		h.notificationService.CrearNotificacion(
			calificacion.EstudianteID,
			calificacion.ControlOperativoID,
			"calificacion_recibida",
			fmt.Sprintf("Has recibido una calificación de %s para el control #%d. Promedio: %.1f/5.0",
				evaluadorNombre, calificacion.ControlOperativoID, calificacion.PromedioGeneral),
			"estudiante",
		)
	}()

	c.JSON(http.StatusCreated, gin.H{
		"message":      "Calificación creada correctamente",
		"calificacion": calificacion,
	})
}

// ObtenerCalificacion obtiene una calificación específica
func (h *CalificacionHandler) ObtenerCalificacion(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	calificacionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de calificación inválido"})
		return
	}

	var calificacion models.Calificacion
	query := h.db.Preload("Estudiante").Preload("ProfesorEvaluador").Preload("CoordinadorEvaluador").Preload("ControlOperativo")

	if err := query.First(&calificacion, calificacionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Calificación no encontrada"})
		return
	}

	// Verificar permisos: estudiantes solo pueden ver sus propias calificaciones
	if user.Role == "estudiante" && calificacion.EstudianteID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permisos para ver esta calificación"})
		return
	}

	c.JSON(http.StatusOK, calificacion)
}

// ListarCalificaciones lista calificaciones con filtros
func (h *CalificacionHandler) ListarCalificaciones(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	var calificaciones []models.Calificacion
	query := h.db.
		Preload("Estudiante", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, nombre_usuario, email")
		}).
		Preload("ControlOperativo", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, nombre_consultante, area_consulta")
		})

	// Filtrar según el rol del usuario
	switch user.Role {
	case "estudiante":
		// Los estudiantes solo ven sus propias calificaciones
		query = query.Where("estudiante_id = ?", user.ID)
	case "profesor":
		// Los profesores pueden ver calificaciones que hayan creado o todas si es para reportes
		if c.Query("todas") == "true" {
			// No filtrar, mostrar todas (para reportes)
		} else {
			query = query.Where("profesor_evaluador_id = ?", user.ID)
		}
	case "coordinador":
		// Los coordinadores pueden ver todas las calificaciones
		// No aplicar filtros adicionales
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permisos para ver calificaciones"})
		return
	}

	// Filtros adicionales
	if estudianteID := c.Query("estudiante_id"); estudianteID != "" {
		query = query.Where("estudiante_id = ?", estudianteID)
	}

	if controlID := c.Query("control_operativo_id"); controlID != "" {
		query = query.Where("control_operativo_id = ?", controlID)
	}

	// Paginación
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Calificacion{}).Count(&total)

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&calificaciones).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo calificaciones"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"calificaciones": calificaciones,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// ActualizarCalificacion permite actualizar una calificación existente
func (h *CalificacionHandler) ActualizarCalificacion(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	// Solo profesores y coordinadores pueden actualizar calificaciones
	if user.Role != "profesor" && user.Role != "coordinador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permisos para actualizar calificaciones"})
		return
	}

	calificacionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de calificación inválido"})
		return
	}

	var req models.CalificacionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos", "details": err.Error()})
		return
	}

	var calificacion models.Calificacion
	if err := h.db.First(&calificacion, calificacionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Calificación no encontrada"})
		return
	}

	// Verificar permisos: solo el evaluador original o coordinadores pueden actualizar
	if user.Role == "profesor" && (calificacion.ProfesorEvaluadorID == nil || *calificacion.ProfesorEvaluadorID != user.ID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Solo puedes actualizar calificaciones que hayas creado"})
		return
	}

	// Actualizar campos
	calificacion.CumplimientoHorario = req.CumplimientoHorario
	calificacion.PresentacionPersonal = req.PresentacionPersonal
	calificacion.ConocimientoJuridico = req.ConocimientoJuridico
	calificacion.TrabajoEquipo = req.TrabajoEquipo
	calificacion.AtencionUsuario = req.AtencionUsuario
	calificacion.Observaciones = req.Observaciones

	// El hook BeforeSave calculará automáticamente el promedio
	if err := h.db.Save(&calificacion).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error actualizando calificación"})
		return
	}

	// Cargar relaciones para la respuesta
	h.db.Preload("Estudiante").Preload("ProfesorEvaluador").Preload("CoordinadorEvaluador").Find(&calificacion)

	// Crear notificación para el estudiante
	go func() {
		evaluadorNombre := user.Nombres + " " + user.Apellidos
		h.notificationService.CrearNotificacion(
			calificacion.EstudianteID,
			calificacion.ControlOperativoID,
			"calificacion_actualizada",
			fmt.Sprintf("%s ha actualizado tu calificación para el control #%d. Nuevo promedio: %.1f/5.0",
				evaluadorNombre, calificacion.ControlOperativoID, calificacion.PromedioGeneral),
			"estudiante",
		)
	}()

	c.JSON(http.StatusOK, gin.H{
		"message":      "Calificación actualizada correctamente",
		"calificacion": calificacion,
	})
}

// ObtenerEstadisticasEstudiante obtiene estadísticas de calificaciones de un estudiante
func (h *CalificacionHandler) ObtenerEstadisticasEstudiante(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	estudianteID, err := strconv.ParseUint(c.Param("estudiante_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de estudiante inválido"})
		return
	}

	// Verificar permisos: estudiantes solo pueden ver sus propias estadísticas
	if user.Role == "estudiante" && uint(estudianteID) != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permisos para ver estas estadísticas"})
		return
	}

	// Obtener información del estudiante
	var estudiante models.User
	if err := h.db.Where("id = ? AND role = 'estudiante'", estudianteID).First(&estudiante).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Estudiante no encontrado"})
		return
	}

	// Consulta para obtener estadísticas
	var tempStats struct {
		TotalCalificaciones  int     `json:"total_calificaciones"`
		PromedioGeneral      float64 `json:"promedio_general"`
		PromedioCumplimiento float64 `json:"promedio_cumplimiento"`
		PromedioPresentacion float64 `json:"promedio_presentacion"`
		PromedioConocimiento float64 `json:"promedio_conocimiento"`
		PromedioTrabajo      float64 `json:"promedio_trabajo"`
		PromedioAtencion     float64 `json:"promedio_atencion"`
	}
	
	result := h.db.Model(&models.Calificacion{}).
		Where("estudiante_id = ?", estudianteID).
		Select(`
			COUNT(*) as total_calificaciones,
			AVG(promedio_general) as promedio_general,
			AVG(cumplimiento_horario) as promedio_cumplimiento,
			AVG(presentacion_personal) as promedio_presentacion,
			AVG(conocimiento_juridico) as promedio_conocimiento,
			AVG(trabajo_equipo) as promedio_trabajo,
			AVG(atencion_usuario) as promedio_atencion
		`).
		Scan(&tempStats)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo estadísticas"})
		return
	}

	// Crear respuesta directamente con gin.H para evitar problemas de serialización
	c.JSON(http.StatusOK, gin.H{
		"estudiante_id":         uint(estudianteID),
		"estudiante_nombre":     estudiante.Nombres + " " + estudiante.Apellidos,
		"total_calificaciones":  tempStats.TotalCalificaciones,
		"promedio_general":      tempStats.PromedioGeneral,
		"promedio_cumplimiento": tempStats.PromedioCumplimiento,
		"promedio_presentacion": tempStats.PromedioPresentacion,
		"promedio_conocimiento": tempStats.PromedioConocimiento,
		"promedio_trabajo":      tempStats.PromedioTrabajo,
		"promedio_atencion":     tempStats.PromedioAtencion,
	})
}

// ListarCalificacionesEstudiante obtiene todas las calificaciones del estudiante autenticado
func (h *CalificacionHandler) ListarCalificacionesEstudiante(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	// Solo estudiantes pueden usar este endpoint
	if user.Role != "estudiante" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Solo estudiantes pueden usar este endpoint"})
		return
	}

	var calificaciones []models.Calificacion
	
	// Consulta con preloads
	query := h.db.Preload("ProfesorEvaluador").Preload("CoordinadorEvaluador").Preload("ControlOperativo").
		Where("estudiante_id = ?", user.ID)

	if err := query.Order("created_at DESC").Find(&calificaciones).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo calificaciones"})
		return
	}

	// Calcular estadísticas básicas
	var totalCalificaciones int = len(calificaciones)
	var sumaPromedio float64 = 0
	
	for _, cal := range calificaciones {
		sumaPromedio += cal.PromedioGeneral
	}
	
	var promedioGeneral float64 = 0
	if totalCalificaciones > 0 {
		promedioGeneral = sumaPromedio / float64(totalCalificaciones)
	}

	c.JSON(http.StatusOK, gin.H{
		"calificaciones": calificaciones,
		"estadisticas": gin.H{
			"total_calificaciones": totalCalificaciones,
			"promedio_general":     promedioGeneral,
		},
	})
}