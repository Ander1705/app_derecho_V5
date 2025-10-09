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
	result := h.db.Where("role IN ('estudiante', 'profesor') AND activo = true").
		Order("created_at DESC").
		Find(&usuarios)
	
	fmt.Printf("🔍 COORDINADOR: Listando usuarios activos, encontrados: %d\n", len(usuarios))

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
	
	// Filtrar por estado si se proporciona
	estado := c.Query("estado")
	whereClause := "activo = true"
	
	if estado == "pendiente" {
		// Solo controles completos sin resultado asignado
		whereClause += " AND estado_flujo = 'completo' AND (estado_resultado IS NULL OR estado_resultado = '')"
	} else {
		// Comportamiento por defecto: todos los controles completos
		whereClause += " AND estado_flujo IN ('completo', 'con_resultado')"
	}
	
	result := h.db.
		Preload("CreatedBy").
		Where(whereClause).
		Order("created_at DESC").
		Find(&controles)
	
	// Debug log para ver cuántos controles se están devolviendo
	fmt.Printf("🔍 DEBUG: Query: %s, Encontrados %d controles completos\n", whereClause, len(controles))
	fmt.Printf("🔍 DEBUG: Error SQL: %v\n", result.Error)

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

	if control.EstadoFlujo != "completo" && control.EstadoFlujo != "con_resultado" {
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

// EditarEstadoResultado permite al coordinador editar el estado resultado de cualquier control
func (h *CoordinadorHandler) EditarEstadoResultado(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	// Verificar que es coordinador (ya verificado por middleware, pero por seguridad)
	if user.Role != "coordinador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permisos para realizar esta acción"})
		return
	}

	// Obtener ID del control
	controlID := c.Param("id")

	// Obtener request
	var req models.EstadoResultadoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	// Validar estados permitidos
	estadosPermitidos := []string{"asesoria_consulta", "reparto", "auto_reparto", "solicitud_conciliacion"}
	estadoValido := false
	for _, estado := range estadosPermitidos {
		if req.EstadoResultado == estado {
			estadoValido = true
			break
		}
	}
	if !estadoValido {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Estado resultado no válido"})
		return
	}

	// Buscar el control
	var control models.ControlOperativo
	if err := h.db.First(&control, controlID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Control operativo no encontrado"})
		return
	}

	// Los coordinadores pueden editar el estado de cualquier control, independientemente del estado actual
	estadoAnterior := "sin estado"
	if control.EstadoResultado != nil {
		estadoAnterior = *control.EstadoResultado
	}

	// Actualizar estado resultado
	control.EstadoResultado = &req.EstadoResultado
	
	// Si el control no tenía resultado, cambiar flujo a con_resultado
	if control.EstadoFlujo == "completo" {
		control.EstadoFlujo = "con_resultado"
	}

	if err := h.db.Save(&control).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error actualizando estado"})
		return
	}

	// Crear notificación para el estudiante creador
	go func() {
		accion := "modificado"
		if estadoAnterior == "sin estado" {
			accion = "establecido"
		}
		h.notificationService.CrearNotificacion(
			control.CreatedByID,
			control.ID,
			"estado_editado_coordinador",
			fmt.Sprintf("El coordinador ha %s el estado de tu control #%d de %s a %s",
				accion, control.ID, estadoAnterior, req.EstadoResultado),
			"estudiante",
		)
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": "Estado resultado actualizado correctamente",
		"control": control,
		"estado_anterior": estadoAnterior,
	})
}

// ObtenerEstadisticasCompletas obtiene estadísticas exhaustivas de la base de datos
func (h *CoordinadorHandler) ObtenerEstadisticasCompletas(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	
	if user.Role != "coordinador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acceso denegado"})
		return
	}

	// Obtener parámetros de filtro
	mes := c.Query("mes")   // 1-12
	ano := c.Query("ano")   // YYYY

	// Construir WHERE clause para filtros de fecha
	var whereClause string = "activo = true"
	var args []interface{}
	
	if ano != "" {
		whereClause += " AND fecha_ano = ?"
		args = append(args, ano)
	}
	
	if mes != "" {
		whereClause += " AND fecha_mes = ?"
		args = append(args, mes)
	}

	// 1. ESTADÍSTICAS GENERALES
	var totalControles int64
	var controlesPendientes int64
	var controlesCompletos int64
	var controlesConResultado int64
	
	h.db.Model(&models.ControlOperativo{}).Where(whereClause, args...).Count(&totalControles)
	h.db.Model(&models.ControlOperativo{}).Where(whereClause+" AND estado_flujo = 'pendiente_profesor'", args...).Count(&controlesPendientes)
	h.db.Model(&models.ControlOperativo{}).Where(whereClause+" AND estado_flujo = 'completo'", args...).Count(&controlesCompletos)
	h.db.Model(&models.ControlOperativo{}).Where(whereClause+" AND estado_flujo = 'con_resultado'", args...).Count(&controlesConResultado)

	// 2. DISTRIBUCIÓN POR ÁREAS JURÍDICAS (EXHAUSTIVA)
	var distribucionAreas []struct {
		Area     string `json:"area"`
		Cantidad int64  `json:"cantidad"`
		Porcentaje float64 `json:"porcentaje"`
	}

	rows, err := h.db.Raw(`
		SELECT 
			area_consulta as area,
			COUNT(*) as cantidad,
			ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM control_operativos WHERE `+whereClause+`), 0), 2) as porcentaje
		FROM control_operativos 
		WHERE `+whereClause+` AND area_consulta IS NOT NULL AND area_consulta != ''
		GROUP BY area_consulta
		ORDER BY cantidad DESC
	`, args...).Rows()

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var item struct {
				Area       string  `json:"area"`
				Cantidad   int64   `json:"cantidad"`
				Porcentaje float64 `json:"porcentaje"`
			}
			if err := h.db.ScanRows(rows, &item); err == nil {
				distribucionAreas = append(distribucionAreas, item)
			}
		}
	}

	// 3. RESULTADOS DE CASOS POR ÁREA
	var resultadosPorArea []struct {
		Area             string `json:"area"`
		AsesoriaConsulta int64  `json:"asesoria_consulta"`
		Reparto          int64  `json:"reparto"`
		AutoReparto      int64  `json:"auto_reparto"`
		Conciliacion     int64  `json:"solicitud_conciliacion"`
		Total            int64  `json:"total"`
	}

	rowsResultados, err := h.db.Raw(`
		SELECT 
			area_consulta as area,
			SUM(CASE WHEN estado_resultado = 'asesoria_consulta' THEN 1 ELSE 0 END) as asesoria_consulta,
			SUM(CASE WHEN estado_resultado = 'reparto' THEN 1 ELSE 0 END) as reparto,
			SUM(CASE WHEN estado_resultado = 'auto_reparto' THEN 1 ELSE 0 END) as auto_reparto,
			SUM(CASE WHEN estado_resultado = 'solicitud_conciliacion' THEN 1 ELSE 0 END) as solicitud_conciliacion,
			COUNT(*) as total
		FROM control_operativos 
		WHERE `+whereClause+` AND estado_resultado IS NOT NULL AND estado_resultado != ''
		GROUP BY area_consulta
		ORDER BY total DESC
	`, args...).Rows()

	if err == nil {
		defer rowsResultados.Close()
		for rowsResultados.Next() {
			var item struct {
				Area             string `json:"area"`
				AsesoriaConsulta int64  `json:"asesoria_consulta"`
				Reparto          int64  `json:"reparto"`
				AutoReparto      int64  `json:"auto_reparto"`
				Conciliacion     int64  `json:"solicitud_conciliacion"`
				Total            int64  `json:"total"`
			}
			if err := h.db.ScanRows(rowsResultados, &item); err == nil {
				resultadosPorArea = append(resultadosPorArea, item)
			}
		}
	}

	// 4. DISTRIBUCIÓN POR CIUDADES
	var distribucionCiudades []struct {
		Ciudad   string `json:"ciudad"`
		Cantidad int64  `json:"cantidad"`
		Porcentaje float64 `json:"porcentaje"`
	}

	rowsCiudades, err := h.db.Raw(`
		SELECT 
			COALESCE(ciudad, 'Sin Especificar') as ciudad,
			COUNT(*) as cantidad,
			ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM control_operativos WHERE `+whereClause+`), 0), 2) as porcentaje
		FROM control_operativos 
		WHERE `+whereClause+`
		GROUP BY ciudad
		ORDER BY cantidad DESC
		LIMIT 10
	`, args...).Rows()

	if err == nil {
		defer rowsCiudades.Close()
		for rowsCiudades.Next() {
			var item struct {
				Ciudad     string  `json:"ciudad"`
				Cantidad   int64   `json:"cantidad"`
				Porcentaje float64 `json:"porcentaje"`
			}
			if err := h.db.ScanRows(rowsCiudades, &item); err == nil {
				distribucionCiudades = append(distribucionCiudades, item)
			}
		}
	}

	// 5. TENDENCIAS MENSUALES (últimos 6 meses)
	var tendenciasMensuales []struct {
		Mes      int   `json:"mes"`
		Ano      int   `json:"ano"`
		Cantidad int64 `json:"cantidad"`
	}

	rowsTendencias, err := h.db.Raw(`
		SELECT 
			fecha_mes as mes,
			fecha_ano as ano,
			COUNT(*) as cantidad
		FROM control_operativos 
		WHERE activo = true AND fecha_mes IS NOT NULL AND fecha_ano IS NOT NULL
		GROUP BY fecha_ano, fecha_mes
		ORDER BY fecha_ano DESC, fecha_mes DESC
		LIMIT 12
	`).Rows()

	if err == nil {
		defer rowsTendencias.Close()
		for rowsTendencias.Next() {
			var item struct {
				Mes      int   `json:"mes"`
				Ano      int   `json:"ano"`
				Cantidad int64 `json:"cantidad"`
			}
			if err := h.db.ScanRows(rowsTendencias, &item); err == nil {
				tendenciasMensuales = append(tendenciasMensuales, item)
			}
		}
	}

	// 6. TOP PROFESORES (por número de casos)
	var topProfesores []struct {
		Nombre string `json:"nombre"`
		Casos  int64  `json:"casos"`
	}

	rowsProfesores, err := h.db.Raw(`
		SELECT 
			nombre_docente_responsable as nombre,
			COUNT(*) as casos
		FROM control_operativos 
		WHERE `+whereClause+` AND nombre_docente_responsable IS NOT NULL AND nombre_docente_responsable != ''
		GROUP BY nombre_docente_responsable
		ORDER BY casos DESC
		LIMIT 10
	`, args...).Rows()

	if err == nil {
		defer rowsProfesores.Close()
		for rowsProfesores.Next() {
			var item struct {
				Nombre string `json:"nombre"`
				Casos  int64  `json:"casos"`
			}
			if err := h.db.ScanRows(rowsProfesores, &item); err == nil {
				topProfesores = append(topProfesores, item)
			}
		}
	}

	// 7. TOP ESTUDIANTES (por número de casos)
	var topEstudiantes []struct {
		Nombre string `json:"nombre"`
		Casos  int64  `json:"casos"`
	}

	rowsEstudiantes, err := h.db.Raw(`
		SELECT 
			nombre_estudiante as nombre,
			COUNT(*) as casos
		FROM control_operativos 
		WHERE `+whereClause+` AND nombre_estudiante IS NOT NULL AND nombre_estudiante != ''
		GROUP BY nombre_estudiante
		ORDER BY casos DESC
		LIMIT 10
	`, args...).Rows()

	if err == nil {
		defer rowsEstudiantes.Close()
		for rowsEstudiantes.Next() {
			var item struct {
				Nombre string `json:"nombre"`
				Casos  int64  `json:"casos"`
			}
			if err := h.db.ScanRows(rowsEstudiantes, &item); err == nil {
				topEstudiantes = append(topEstudiantes, item)
			}
		}
	}

	// 8. CONTEOS DE USUARIOS ACTIVOS
	var estudiantesActivos int64
	var profesoresActivos int64
	
	h.db.Model(&models.User{}).Where("role = 'estudiante' AND activo = true").Count(&estudiantesActivos)
	h.db.Model(&models.User{}).Where("role = 'profesor' AND activo = true").Count(&profesoresActivos)

	// RESPUESTA COMPLETA
	c.JSON(http.StatusOK, gin.H{
		"general": gin.H{
			"total_controles":       totalControles,
			"controles_pendientes":  controlesPendientes,
			"controles_completos":   controlesCompletos,
			"controles_con_resultado": controlesConResultado,
			"estudiantes_activos":   estudiantesActivos,
			"profesores_activos":    profesoresActivos,
		},
		"por_area":              distribucionAreas,
		"resultados_por_area":   resultadosPorArea,
		"por_ciudad":            distribucionCiudades,
		"tendencias_mensuales":  tendenciasMensuales,
		"top_profesores":        topProfesores,
		"top_estudiantes":       topEstudiantes,
		"filtros": gin.H{
			"mes": mes,
			"ano": ano,
		},
	})
}