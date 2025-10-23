// ==============================================================================
// SERVICIO DE CONSULTAS OPTIMIZADO PARA CONSULTORIO JURÍDICO UCMC
// Desarrollador Principal: Anderson Felipe Montaña Castelblanco
// Optimizado para manejar consultas complejas con alto rendimiento
// ==============================================================================

package services

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"consultorio-juridico/internal/models"
)

// QueryService servicio para consultas optimizadas
type QueryService struct {
	db *gorm.DB
}

// NewQueryService crea una nueva instancia del servicio
func NewQueryService(db *gorm.DB) *QueryService {
	return &QueryService{db: db}
}

// PaginationParams parámetros de paginación
type PaginationParams struct {
	Page     int    `json:"page" form:"page"`
	Limit    int    `json:"limit" form:"limit"`
	Sort     string `json:"sort" form:"sort"`
	Order    string `json:"order" form:"order"`
	Search   string `json:"search" form:"search"`
}

// PaginationResult resultado de paginación
type PaginationResult struct {
	Data         interface{} `json:"data"`
	CurrentPage  int         `json:"current_page"`
	PerPage      int         `json:"per_page"`
	TotalPages   int         `json:"total_pages"`
	TotalRecords int64       `json:"total_records"`
	HasNext      bool        `json:"has_next"`
	HasPrev      bool        `json:"has_prev"`
	From         int         `json:"from"`
	To           int         `json:"to"`
}

// FilterParams parámetros de filtrado
type FilterParams struct {
	EstadoFlujo           string `json:"estado_flujo" form:"estado_flujo"`
	EstadoResultado       string `json:"estado_resultado" form:"estado_resultado"`
	AreaConsulta          string `json:"area_consulta" form:"area_consulta"`
	CreatedByID           uint   `json:"created_by_id" form:"created_by_id"`
	ProfesorResponsable   string `json:"profesor_responsable" form:"profesor_responsable"`
	DateFrom              string `json:"date_from" form:"date_from"`
	DateTo                string `json:"date_to" form:"date_to"`
	Activo                *bool  `json:"activo" form:"activo"`
}

// GetControlesOperativos obtiene controles operativos con paginación y filtros optimizados
func (qs *QueryService) GetControlesOperativos(pagination PaginationParams, filters FilterParams) (*PaginationResult, error) {
	// Validar y ajustar parámetros de paginación
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.Limit <= 0 || pagination.Limit > 100 {
		pagination.Limit = 20
	}
	if pagination.Sort == "" {
		pagination.Sort = "created_at"
	}
	if pagination.Order == "" {
		pagination.Order = "desc"
	}

	// Construir query base para contar registros (sin Select ni Preloads)
	countQuery := qs.db.Model(&models.ControlOperativo{})
	countQuery = qs.applyControlOperativoFilters(countQuery, filters, pagination.Search)

	// Contar total de registros
	var totalRecords int64
	if err := countQuery.Count(&totalRecords).Error; err != nil {
		return nil, fmt.Errorf("error contando registros: %v", err)
	}

	// Construir query para datos con preloads optimizados
	query := qs.db.Model(&models.ControlOperativo{}).
		Select("control_operativos.*").
		Preload("CreatedBy", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, nombres, apellidos, email, role")
		})

	// Aplicar filtros a la query de datos
	query = qs.applyControlOperativoFilters(query, filters, pagination.Search)

	// Calcular paginación
	totalPages := int((totalRecords + int64(pagination.Limit) - 1) / int64(pagination.Limit))
	offset := (pagination.Page - 1) * pagination.Limit

	// Aplicar ordenamiento y paginación
	orderClause := fmt.Sprintf("%s %s", pagination.Sort, pagination.Order)
	query = query.Order(orderClause).Limit(pagination.Limit).Offset(offset)

	// Ejecutar consulta
	var controles []models.ControlOperativo
	if err := query.Find(&controles).Error; err != nil {
		return nil, fmt.Errorf("error obteniendo controles: %v", err)
	}

	// Construir resultado
	result := &PaginationResult{
		Data:         controles,
		CurrentPage:  pagination.Page,
		PerPage:      pagination.Limit,
		TotalPages:   totalPages,
		TotalRecords: totalRecords,
		HasNext:      pagination.Page < totalPages,
		HasPrev:      pagination.Page > 1,
		From:         offset + 1,
		To:           offset + len(controles),
	}

	return result, nil
}

// GetCalificaciones obtiene calificaciones con paginación optimizada
func (qs *QueryService) GetCalificaciones(pagination PaginationParams, userRole string, userID uint) (*PaginationResult, error) {
	// Validar parámetros
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.Limit <= 0 || pagination.Limit > 100 {
		pagination.Limit = 20
	}

	// Query base con preloads optimizados
	query := qs.db.Model(&models.Calificacion{}).
		Preload("Estudiante", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, nombres, apellidos, email")
		}).
		Preload("ProfesorEvaluador", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, nombres, apellidos, email")
		}).
		Preload("CoordinadorEvaluador", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, nombres, apellidos, email")
		})

	// Aplicar filtros según rol
	switch userRole {
	case "estudiante":
		query = query.Where("estudiante_id = ?", userID)
	case "profesor":
		query = query.Where("profesor_evaluador_id = ?", userID)
	case "coordinador":
		// Los coordinadores pueden ver todas las calificaciones
	default:
		return nil, fmt.Errorf("rol no autorizado")
	}

	// Aplicar búsqueda si se proporciona
	if pagination.Search != "" {
		query = qs.applyCalificacionSearch(query, pagination.Search)
	}

	// Contar total
	var totalRecords int64
	if err := query.Count(&totalRecords).Error; err != nil {
		return nil, fmt.Errorf("error contando calificaciones: %v", err)
	}

	// Paginación
	totalPages := int((totalRecords + int64(pagination.Limit) - 1) / int64(pagination.Limit))
	offset := (pagination.Page - 1) * pagination.Limit

	// Ordenar y paginar
	orderClause := "created_at DESC"
	if pagination.Sort != "" {
		orderClause = fmt.Sprintf("%s %s", pagination.Sort, pagination.Order)
	}

	var calificaciones []models.Calificacion
	if err := query.Order(orderClause).Limit(pagination.Limit).Offset(offset).Find(&calificaciones).Error; err != nil {
		return nil, fmt.Errorf("error obteniendo calificaciones: %v", err)
	}

	result := &PaginationResult{
		Data:         calificaciones,
		CurrentPage:  pagination.Page,
		PerPage:      pagination.Limit,
		TotalPages:   totalPages,
		TotalRecords: totalRecords,
		HasNext:      pagination.Page < totalPages,
		HasPrev:      pagination.Page > 1,
		From:         offset + 1,
		To:           offset + len(calificaciones),
	}

	return result, nil
}

// applyControlOperativoFilters aplica filtros a la consulta de controles operativos
func (qs *QueryService) applyControlOperativoFilters(query *gorm.DB, filters FilterParams, search string) *gorm.DB {
	fmt.Printf("🔍 QUERY SERVICE - Aplicando filtros: %+v\n", filters)
	// Filtro por estado de flujo
	if filters.EstadoFlujo != "" {
		query = query.Where("estado_flujo = ?", filters.EstadoFlujo)
	}

	// Filtro por estado de resultado
	if filters.EstadoResultado != "" {
		query = query.Where("estado_resultado = ?", filters.EstadoResultado)
	}

	// Filtro por área de consulta
	if filters.AreaConsulta != "" {
		query = query.Where("area_consulta = ?", filters.AreaConsulta)
	}

	// Filtro por creador
	if filters.CreatedByID > 0 {
		query = query.Where("created_by_id = ?", filters.CreatedByID)
	}

	// Filtro por profesor responsable
	if filters.ProfesorResponsable != "" {
		query = query.Where("LOWER(nombre_docente_responsable) LIKE ?", "%"+strings.ToLower(filters.ProfesorResponsable)+"%")
		fmt.Printf("🔍 Aplicando filtro profesor: '%s'\n", filters.ProfesorResponsable)
	}

	// Filtro por estado activo (SIEMPRE filtrar por activos)
	if filters.Activo != nil {
		query = query.Where("activo = ?", *filters.Activo)
		fmt.Printf("🔍 Aplicando filtro activo = %v\n", *filters.Activo)
	} else {
		// Por defecto, solo mostrar registros activos
		query = query.Where("activo = true")
		fmt.Printf("🔍 Aplicando filtro activo = true (por defecto)\n")
	}

	// Filtros de fecha
	if filters.DateFrom != "" {
		if dateFrom, err := time.Parse("2006-01-02", filters.DateFrom); err == nil {
			query = query.Where("created_at >= ?", dateFrom)
		}
	}
	if filters.DateTo != "" {
		if dateTo, err := time.Parse("2006-01-02", filters.DateTo); err == nil {
			query = query.Where("created_at <= ?", dateTo.Add(24*time.Hour))
		}
	}

	// Búsqueda de texto
	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		
		// Intentar convertir a número para búsqueda por ID
		var searchConditions []string
		var searchArgs []interface{}
		
		// Búsqueda por ID del control (si es número)
		if searchID, err := strconv.Atoi(search); err == nil {
			searchConditions = append(searchConditions, "id = ?")
			searchArgs = append(searchArgs, searchID)
		}
		
		// Búsquedas de texto (siempre incluidas)
		textConditions := []string{
			"LOWER(nombre_consultante) LIKE ?",
			"LOWER(numero_documento) LIKE ?", 
			"LOWER(descripcion_caso) LIKE ?",
			"LOWER(area_consulta) LIKE ?",
			"LOWER(nombre_docente_responsable) LIKE ?",
			"LOWER(nombre_estudiante) LIKE ?",
			"LOWER(correo_electronico) LIKE ?",
		}
		
		for _, condition := range textConditions {
			searchConditions = append(searchConditions, condition)
			searchArgs = append(searchArgs, searchTerm)
		}
		
		// Combinar todas las condiciones con OR
		finalCondition := strings.Join(searchConditions, " OR ")
		query = query.Where(finalCondition, searchArgs...)
	}

	return query
}

// applyCalificacionSearch aplica búsqueda a calificaciones
func (qs *QueryService) applyCalificacionSearch(query *gorm.DB, search string) *gorm.DB {
	searchTerm := "%" + strings.ToLower(search) + "%"
	
	// Buscar en observaciones y unir con tabla de estudiantes para buscar en nombres
	query = query.Joins("LEFT JOIN users as estudiantes ON calificaciones.estudiante_id = estudiantes.id").
		Where(
			"LOWER(calificaciones.observaciones) LIKE ? OR LOWER(estudiantes.nombres) LIKE ? OR LOWER(estudiantes.apellidos) LIKE ?",
			searchTerm, searchTerm, searchTerm,
		)
	
	return query
}

// GetEstadisticasGenerales obtiene estadísticas generales optimizadas
func (qs *QueryService) GetEstadisticasGenerales() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Estadísticas de controles operativos
	var totalControles, controlesCompletos, controlesPendientes int64
	
	qs.db.Model(&models.ControlOperativo{}).Where("activo = true").Count(&totalControles)
	qs.db.Model(&models.ControlOperativo{}).Where("activo = true AND estado_flujo = 'completo'").Count(&controlesCompletos)
	qs.db.Model(&models.ControlOperativo{}).Where("activo = true AND estado_flujo = 'pendiente_profesor'").Count(&controlesPendientes)

	stats["total_controles"] = totalControles
	stats["controles_completos"] = controlesCompletos
	stats["controles_pendientes"] = controlesPendientes

	// Estadísticas de calificaciones
	var totalCalificaciones int64
	var promedioGeneral float64
	
	qs.db.Model(&models.Calificacion{}).Count(&totalCalificaciones)
	qs.db.Model(&models.Calificacion{}).Select("AVG(promedio_general)").Scan(&promedioGeneral)

	stats["total_calificaciones"] = totalCalificaciones
	stats["promedio_general"] = promedioGeneral

	// Distribución por área de consulta
	var areaStats []struct {
		AreaConsulta string `json:"area_consulta"`
		Total        int64  `json:"total"`
	}
	
	qs.db.Model(&models.ControlOperativo{}).
		Select("area_consulta, COUNT(*) as total").
		Where("activo = true").
		Group("area_consulta").
		Order("total DESC").
		Limit(10).
		Scan(&areaStats)

	stats["distribucion_areas"] = areaStats

	// Estadísticas mensuales (últimos 6 meses)
	var monthlyStats []struct {
		Mes   string `json:"mes"`
		Total int64  `json:"total"`
	}

	qs.db.Model(&models.ControlOperativo{}).
		Select("to_char(created_at, 'YYYY-MM') as mes, COUNT(*) as total").
		Where("activo = true AND created_at >= ?", time.Now().AddDate(0, -6, 0)).
		Group("to_char(created_at, 'YYYY-MM')").
		Order("mes DESC").
		Scan(&monthlyStats)

	stats["estadisticas_mensuales"] = monthlyStats

	return stats, nil
}

// GetControlesPorProfesor obtiene controles asignados a un profesor específico
func (qs *QueryService) GetControlesPorProfesor(profesorEmail string, pagination PaginationParams) (*PaginationResult, error) {
	query := qs.db.Model(&models.ControlOperativo{}).
		Preload("CreatedBy", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, nombres, apellidos, email")
		}).
		Where("activo = true")

	// Buscar por email del profesor en el campo nombre_docente_responsable
	// o mejor aún, si tienes una relación directa
	if profesorEmail != "" {
		query = query.Where("nombre_docente_responsable ILIKE ?", "%"+profesorEmail+"%")
	}

	// Aplicar búsqueda
	if pagination.Search != "" {
		searchTerm := "%" + strings.ToLower(pagination.Search) + "%"
		query = query.Where("LOWER(nombre_consultante) LIKE ? OR LOWER(descripcion_caso) LIKE ?", searchTerm, searchTerm)
	}

	// Continuar con paginación normal...
	var totalRecords int64
	if err := query.Count(&totalRecords).Error; err != nil {
		return nil, err
	}

	totalPages := int((totalRecords + int64(pagination.Limit) - 1) / int64(pagination.Limit))
	offset := (pagination.Page - 1) * pagination.Limit

	var controles []models.ControlOperativo
	if err := query.Order("created_at DESC").Limit(pagination.Limit).Offset(offset).Find(&controles).Error; err != nil {
		return nil, err
	}

	return &PaginationResult{
		Data:         controles,
		CurrentPage:  pagination.Page,
		PerPage:      pagination.Limit,
		TotalPages:   totalPages,
		TotalRecords: totalRecords,
		HasNext:      pagination.Page < totalPages,
		HasPrev:      pagination.Page > 1,
		From:         offset + 1,
		To:           offset + len(controles),
	}, nil
}