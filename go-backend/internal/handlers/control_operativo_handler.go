package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	
	"time"

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
	queryService        *services.QueryService
}

func NewControlOperativoHandler(db *gorm.DB, notificationService *services.NotificationService, pdfGenerator *pdf.PDFGenerator) *ControlOperativoHandler {
	return &ControlOperativoHandler{
		db:                  db,
		notificationService: notificationService,
		pdfGenerator:        pdfGenerator,
		queryService:        services.NewQueryService(db),
	}
}

func (h *ControlOperativoHandler) CrearControl(c *gin.Context) {
	fmt.Printf("🔍 BACKEND: Petición CrearControl recibida\n")
	
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		fmt.Printf("❌ BACKEND: Usuario no autenticado\n")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	
	fmt.Printf("✅ BACKEND: Usuario autenticado: %s (ID: %d)\n", user.NombreUsuario, user.ID)

	var req models.ControlOperativoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Printf("❌ Error binding JSON: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Datos inválidos: %v", err)})
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
		ProfesorAsignadoID:       req.ProfesorID,
		EstadoFlujo:              "pendiente_profesor",
		Activo:                   true,
		CreatedByID:              user.ID,
	}
	
	fmt.Printf("🔍 BACKEND: Asignando profesor ID: %v al control\n", req.ProfesorID)

	if err := h.db.Create(&control).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creando control operativo"})
		return
	}

	// **OPTIMIZACIÓN MÁXIMA**: Respuesta inmediata sin preloads
	// Solo agregar datos del usuario ya disponibles en contexto
	control.CreatedBy = *user

	// **PROCESAMIENTO ASÍNCRONO**: Todo lo que no es crítico para respuesta inmediata
	go func() {
		// Procesar documentos adjuntos de manera asíncrona
		if len(req.DocumentosAdjuntos) > 0 {
			h.procesarDocumentosAdjuntos(control.ID, req.DocumentosAdjuntos)
		}

		// Enviar notificación al profesor de manera asíncrona
		if req.ProfesorID != nil {
			h.notificationService.NotificarNuevoControlAProfesor(control.ID, *req.ProfesorID)
		}
	}()

	// **RESPUESTA INSTANTÁNEA**: Sin consultas adicionales a BD
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

	// Parsear parámetros de paginación
	pagination := services.PaginationParams{
		Page:   1,
		Limit:  1000,
		Sort:   "created_at",
		Order:  "desc",
		Search: c.Query("search"),
	}

	if page := c.Query("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			pagination.Page = p
		}
	}
	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 1000 {
			pagination.Limit = l
		}
	}
	if sort := c.Query("sort"); sort != "" {
		pagination.Sort = sort
	}
	if order := c.Query("order"); order != "" {
		pagination.Order = order
	}

	// Parsear parámetros de filtrado
	filters := services.FilterParams{
		EstadoFlujo:     c.Query("estado_flujo"),
		EstadoResultado: c.Query("estado_resultado"),
		AreaConsulta:    c.Query("area_consulta"),
		DateFrom:        c.Query("date_from"),
		DateTo:          c.Query("date_to"),
	}

	// Filtros específicos por mes y año
	if month := c.Query("month"); month != "" {
		year := c.Query("year")
		if year == "" {
			year = strconv.Itoa(time.Now().Year())
		}
		
		// Construir fechas de inicio y fin del mes
		if m, err := strconv.Atoi(month); err == nil && m >= 1 && m <= 12 {
			if y, err := strconv.Atoi(year); err == nil {
				startDate := fmt.Sprintf("%04d-%02d-01", y, m)
				// Calcular último día del mes
				nextMonth := time.Date(y, time.Month(m+1), 1, 0, 0, 0, 0, time.UTC)
				endDate := nextMonth.AddDate(0, 0, -1).Format("2006-01-02")
				
				filters.DateFrom = startDate
				filters.DateTo = endDate
			}
		}
	}

	// Filtrar por rol
	switch user.Role {
	case "estudiante":
		// Los estudiantes solo ven sus propios controles
		filters.CreatedByID = user.ID
		filters.Activo = &[]bool{true}[0] // Asegurar que solo vean controles activos
	case "profesor":
		// Los profesores ven controles donde aparecen como responsables
		// Usar el nombre completo del profesor, no el email
		nombreCompleto := fmt.Sprintf("%s %s", strings.TrimSpace(user.Nombres), strings.TrimSpace(user.Apellidos))
		filters.ProfesorResponsable = nombreCompleto
		filters.Activo = &[]bool{true}[0]
		fmt.Printf("🔍 PROFESOR filtro: Buscando controles para '%s'\n", nombreCompleto)
	case "coordinador":
		// Los coordinadores ven todos los controles activos
		filters.Activo = &[]bool{true}[0]
		fmt.Printf("🔍 COORDINADOR: Ver todos los controles activos\n")
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "Acceso denegado"})
		return
	}

	fmt.Printf("🔍 HANDLER - Usuario: %s (Role: %s, ID: %d)\n", user.NombreUsuario, user.Role, user.ID)
	fmt.Printf("🔍 HANDLER - Filtros aplicados: %+v\n", filters)
	
	// Usar el servicio de consultas optimizado
	result, err := h.queryService.GetControlesOperativos(pagination, filters)
	if err != nil {
		fmt.Printf("❌ Error en consulta optimizada: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo controles"})
		return
	}

	fmt.Printf("✅ HANDLER - Controles encontrados: %d\n", result.TotalRecords)
	c.JSON(http.StatusOK, result)
}

func (h *ControlOperativoHandler) ObtenerControl(c *gin.Context) {
	controlIDStr := c.Param("id")
	
	// Convertir string a uint
	controlID, err := strconv.ParseUint(controlIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}
	
	var control models.ControlOperativo
	if err := h.db.Preload("CreatedBy").First(&control, uint(controlID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Control operativo no encontrado"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al buscar control operativo"})
		}
		return
	}

	c.JSON(http.StatusOK, control)
}

// BuscarControles permite buscar controles por múltiples criterios
func (h *ControlOperativoHandler) BuscarControles(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	// Obtener parámetros de búsqueda
	searchID := c.Query("id")
	searchCedula := c.Query("cedula")
	searchNombre := c.Query("nombre")
	searchConsultante := c.Query("consultante")
	searchArea := c.Query("area")
	searchEstado := c.Query("estado")
	
	// Parsear parámetros de paginación
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	
	// Construir consulta base
	query := h.db.Model(&models.ControlOperativo{}).Preload("CreatedBy")
	
	// Filtros según el rol del usuario
	switch user.Role {
	case "estudiante":
		query = query.Where("created_by_id = ? AND activo = true", user.ID)
	case "profesor":
		// Obtener información del profesor
		var profesor models.Profesor
		if err := h.db.Where("user_id = ?", user.ID).First(&profesor).Error; err == nil {
			nombreCompleto := fmt.Sprintf("%s %s", strings.TrimSpace(profesor.Nombres), strings.TrimSpace(profesor.Apellidos))
			query = query.Where("(TRIM(nombre_docente_responsable) = TRIM(?) OR nombre_docente_responsable = ?) AND activo = true", nombreCompleto, nombreCompleto)
		}
	case "coordinador":
		query = query.Where("activo = true")
	}
	
	// Aplicar filtros de búsqueda con lógica OR más flexible
	
	// Si hay ID, buscar por ID O por cédula (números)
	if searchID != "" {
		if id, err := strconv.ParseUint(searchID, 10, 32); err == nil {
			// Buscar por ID exacto O por número de documento que contenga la cadena
			query = query.Where("id = ? OR numero_documento ILIKE ?", uint(id), "%"+searchID+"%")
		} else {
			// Si no es un número válido, buscar solo por documento
			query = query.Where("numero_documento ILIKE ?", "%"+searchID+"%")
		}
	}
	
	if searchCedula != "" {
		// Buscar por número de documento (más flexible)
		query = query.Where("numero_documento ILIKE ?", "%"+searchCedula+"%")
	}
	
	// Búsqueda por nombres - MUCHO más flexible SIN TILDES
	if searchNombre != "" {
		// Dividir el término de búsqueda en palabras para buscar por partes
		palabras := strings.Fields(strings.ToLower(searchNombre))
		if len(palabras) > 0 {
			var condiciones []string
			var valores []interface{}
			
			// Para cada palabra, buscar en nombre_estudiante Y nombre_consultante SIN TILDES
			for _, palabra := range palabras {
				condiciones = append(condiciones, "(unaccent(LOWER(nombre_estudiante)) LIKE unaccent(?) OR unaccent(LOWER(nombre_consultante)) LIKE unaccent(?))")
				valores = append(valores, "%"+palabra+"%", "%"+palabra+"%")
			}
			
			// Unir todas las condiciones con OR (más flexible)
			query = query.Where(strings.Join(condiciones, " OR "), valores...)
		}
	}
	
	if searchConsultante != "" {
		// Búsqueda más flexible por consultante SIN TILDES
		palabras := strings.Fields(strings.ToLower(searchConsultante))
		if len(palabras) > 0 {
			var condiciones []string
			var valores []interface{}
			
			for _, palabra := range palabras {
				condiciones = append(condiciones, "unaccent(LOWER(nombre_consultante)) LIKE unaccent(?)")
				valores = append(valores, "%"+palabra+"%")
			}
			
			query = query.Where(strings.Join(condiciones, " OR "), valores...)
		}
	}
	
	if searchArea != "" {
		query = query.Where("LOWER(area_consulta) ILIKE ?", "%"+strings.ToLower(searchArea)+"%")
	}
	
	if searchEstado != "" {
		query = query.Where("estado_flujo = ?", searchEstado)
	}
	
	// Contar total de registros
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al contar registros"})
		return
	}
	
	// Obtener registros con paginación
	offset := (page - 1) * limit
	var controles []models.ControlOperativo
	
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&controles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al buscar controles"})
		return
	}
	
	// Calcular metadatos de paginación
	totalPages := (int(total) + limit - 1) / limit
	
	response := gin.H{
		"controles": controles,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
			"has_next":    page < totalPages,
			"has_prev":    page > 1,
		},
		"filters_applied": gin.H{
			"id":          searchID,
			"cedula":      searchCedula,
			"nombre":      searchNombre,
			"consultante": searchConsultante,
			"area":        searchArea,
			"estado":      searchEstado,
		},
	}
	
	c.JSON(http.StatusOK, response)
}

func (h *ControlOperativoHandler) GenerarPDF(c *gin.Context) {
	controlIDStr := c.Param("id")
	
	// Convertir string a uint
	controlID, err := strconv.ParseUint(controlIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}
	
	var control models.ControlOperativo
	if err := h.db.Preload("CreatedBy").Preload("DocumentosAdjuntos").First(&control, uint(controlID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Control operativo no encontrado"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al buscar control operativo"})
		}
		return
	}

	// Obtener rutas de archivos PDF adjuntos
	var archivosAdjuntos []string
	for _, doc := range control.DocumentosAdjuntos {
		if doc.TipoArchivo == "application/pdf" && doc.RutaArchivo != "" {
			archivosAdjuntos = append(archivosAdjuntos, doc.RutaArchivo)
		}
	}

	// Generar PDF (ya incluye manejo de adjuntos internamente)
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

// EstablecerEstadoResultado permite a estudiantes (después del concepto del profesor) y coordinadores establecer el estado resultado
func (h *ControlOperativoHandler) EstablecerEstadoResultado(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	// Obtener ID del control
	controlID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de control inválido"})
		return
	}

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

	// Verificar permisos según el rol
	if user.Role == "estudiante" {
		// Los estudiantes solo pueden establecer estado si:
		// 1. Son el creador del control
		// 2. El profesor ya completó el concepto (estado_flujo = 'completo')
		if control.CreatedByID != user.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permisos para modificar este control"})
			return
		}
		
		if control.EstadoFlujo != "completo" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Solo puedes establecer el estado después de que el profesor complete su concepto"})
			return
		}
	} else if user.Role == "coordinador" {
		// Los coordinadores pueden establecer estado en cualquier momento para cualquier control
		// No hay restricciones adicionales
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "No tienes permisos para realizar esta acción"})
		return
	}

	// Actualizar estado resultado y cambiar flujo a con_resultado
	control.EstadoResultado = &req.EstadoResultado
	control.EstadoFlujo = "con_resultado"

	if err := h.db.Save(&control).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error actualizando estado"})
		return
	}

	// Crear notificación para coordinador si el que actualiza es estudiante
	if user.Role == "estudiante" {
		go func() {
			h.notificationService.CrearNotificacion(
				0, // Para todos los coordinadores
				control.ID,
				"estado_actualizado",
				fmt.Sprintf("El estudiante %s ha establecido el estado '%s' para el control #%d", 
					user.Nombres+" "+user.Apellidos, req.EstadoResultado, control.ID),
				"coordinador",
			)
		}()
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Estado resultado establecido correctamente",
		"control": control,
	})
}

// UploadTempFile maneja la subida temporal de archivos
func (h *ControlOperativoHandler) UploadTempFile(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	// Obtener el archivo del formulario
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No se pudo obtener el archivo"})
		return
	}

	// Validar que sea PDF
	if !strings.HasSuffix(strings.ToLower(file.Filename), ".pdf") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Solo se permiten archivos PDF"})
		return
	}

	// Validar tamaño (5MB máximo)
	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El archivo excede el límite de 5MB"})
		return
	}

	// Crear directorio temporal si no existe
	tempDir := "storage/uploads/temp"
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creando directorio temporal"})
		return
	}

	// Generar nombre único para el archivo
	timestamp := time.Now().Unix()
	filename := fmt.Sprintf("%d_%d_%s", user.ID, timestamp, file.Filename)
	filepath := filepath.Join(tempDir, filename)

	// Guardar archivo temporalmente
	if err := c.SaveUploadedFile(file, filepath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error guardando archivo"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Archivo subido exitosamente",
		"filename": filename,
		"size":     file.Size,
		"original": file.Filename,
	})
}

// procesarDocumentosAdjuntos mueve archivos temporales a la ubicación final
func (h *ControlOperativoHandler) procesarDocumentosAdjuntos(controlID uint, documentos []string) {
	tempDir := "storage/uploads/temp"
	finalDir := fmt.Sprintf("storage/uploads/control-operativo/%d", controlID)
	
	// Crear directorio final si no existe
	if err := os.MkdirAll(finalDir, 0755); err != nil {
		fmt.Printf("Error creando directorio final: %v\n", err)
		return
	}

	for _, filename := range documentos {
		tempPath := filepath.Join(tempDir, filename)
		finalPath := filepath.Join(finalDir, filename)

		// Verificar que el archivo temporal existe
		if _, err := os.Stat(tempPath); os.IsNotExist(err) {
			fmt.Printf("Archivo temporal no encontrado: %s\n", tempPath)
			continue
		}

		// Mover archivo de temporal a final
		if err := os.Rename(tempPath, finalPath); err != nil {
			fmt.Printf("Error moviendo archivo %s: %v\n", filename, err)
			continue
		}

		// Obtener información del archivo
		fileInfo, err := os.Stat(finalPath)
		if err != nil {
			fmt.Printf("Error obteniendo info del archivo %s: %v\n", filename, err)
			continue
		}

		// Crear registro en base de datos
		documento := models.DocumentoAdjunto{
			ControlOperativoID: controlID,
			NombreOriginal:     filename,
			NombreArchivo:      filename,
			TipoArchivo:        "application/pdf",
			TamanoBytes:        fileInfo.Size(),
			RutaArchivo:        finalPath,
			ConvertidoPDF:      true,
			RutaPDF:            finalPath,
		}

		if err := h.db.Create(&documento).Error; err != nil {
			fmt.Printf("Error guardando documento en BD: %v\n", err)
		}
	}
}

