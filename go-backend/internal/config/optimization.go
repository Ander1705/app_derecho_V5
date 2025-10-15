// ==============================================================================
// CONFIGURACIONES DE OPTIMIZACIÓN PARA CONSULTORIO JURÍDICO UCMC
// Desarrollador Principal: Anderson Felipe Montaña Castelblanco
// Optimizado para manejar 5000+ registros con alto rendimiento
// ==============================================================================

package config

import (
	"time"
)

// OptimizationConfig contiene configuraciones de optimización
type OptimizationConfig struct {
	Database DatabaseOptimization `json:"database"`
	Server   ServerOptimization   `json:"server"`
	Cache    CacheOptimization    `json:"cache"`
	Files    FileOptimization     `json:"files"`
}

// DatabaseOptimization configuraciones para base de datos
type DatabaseOptimization struct {
	MaxIdleConns        int           `json:"max_idle_conns"`
	MaxOpenConns        int           `json:"max_open_conns"`
	ConnMaxLifetime     time.Duration `json:"conn_max_lifetime"`
	ConnMaxIdleTime     time.Duration `json:"conn_max_idle_time"`
	DefaultPageSize     int           `json:"default_page_size"`
	MaxPageSize         int           `json:"max_page_size"`
	QueryTimeout        time.Duration `json:"query_timeout"`
	BatchSize           int           `json:"batch_size"`
	EnablePreparedStmts bool          `json:"enable_prepared_stmts"`
}

// ServerOptimization configuraciones para servidor
type ServerOptimization struct {
	ReadTimeout       time.Duration `json:"read_timeout"`
	WriteTimeout      time.Duration `json:"write_timeout"`
	IdleTimeout       time.Duration `json:"idle_timeout"`
	MaxHeaderBytes    int           `json:"max_header_bytes"`
	RequestSizeLimit  int64         `json:"request_size_limit"`
	EnableCompression bool          `json:"enable_compression"`
	EnableCORS        bool          `json:"enable_cors"`
}

// CacheOptimization configuraciones para cache
type CacheOptimization struct {
	Enabled         bool          `json:"enabled"`
	DefaultTTL      time.Duration `json:"default_ttl"`
	CleanupInterval time.Duration `json:"cleanup_interval"`
	MaxSize         int           `json:"max_size"`
}

// FileOptimization configuraciones para manejo de archivos
type FileOptimization struct {
	MaxFileSize     int64  `json:"max_file_size"`
	AllowedTypes    []string `json:"allowed_types"`
	UploadPath      string `json:"upload_path"`
	TempPath        string `json:"temp_path"`
	EnableCleanup   bool   `json:"enable_cleanup"`
	CleanupInterval time.Duration `json:"cleanup_interval"`
}

// GetOptimizedConfig retorna configuraciones optimizadas por defecto
func GetOptimizedConfig() *OptimizationConfig {
	return &OptimizationConfig{
		Database: DatabaseOptimization{
			MaxIdleConns:        50,  // Aumentado para mejor rendimiento
			MaxOpenConns:        200, // Aumentado para manejar más concurrencia
			ConnMaxLifetime:     time.Minute * 30, // Reducido para renovar conexiones más frecuentemente
			ConnMaxIdleTime:     time.Minute * 10, // Reducido para liberar conexiones idle más rápido
			DefaultPageSize:     20,  // Paginación por defecto
			MaxPageSize:         100, // Máximo por página
			QueryTimeout:        time.Second * 10, // Reducido para detectar consultas lentas
			BatchSize:           100, // Aumentado para operaciones masivas más eficientes
			EnablePreparedStmts: true, // Habilitar prepared statements
		},
		Server: ServerOptimization{
			ReadTimeout:       time.Second * 30,
			WriteTimeout:      time.Second * 30,
			IdleTimeout:       time.Minute * 2,
			MaxHeaderBytes:    1 << 20, // 1MB
			RequestSizeLimit:  50 << 20, // 50MB para archivos
			EnableCompression: true,
			EnableCORS:        true,
		},
		Cache: CacheOptimization{
			Enabled:         true,
			DefaultTTL:      time.Minute * 15, // 15 minutos
			CleanupInterval: time.Minute * 5,  // Limpieza cada 5 minutos
			MaxSize:         1000, // Máximo 1000 elementos en cache
		},
		Files: FileOptimization{
			MaxFileSize:  50 << 20, // 50MB máximo por archivo
			AllowedTypes: []string{
				"application/pdf",
				"image/jpeg",
				"image/png",
				"image/gif",
				"application/msword",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"application/vnd.ms-excel",
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			},
			UploadPath:      "uploads",
			TempPath:        "temp",
			EnableCleanup:   true,
			CleanupInterval: time.Hour * 24, // Limpieza diaria
		},
	}
}

// Configuraciones específicas para paginación
type PaginationConfig struct {
	DefaultLimit int `json:"default_limit"`
	MaxLimit     int `json:"max_limit"`
	DefaultPage  int `json:"default_page"`
}

// GetPaginationConfig retorna configuración de paginación
func GetPaginationConfig() *PaginationConfig {
	return &PaginationConfig{
		DefaultLimit: 20,
		MaxLimit:     100,
		DefaultPage:  1,
	}
}

// Configuraciones para búsqueda y filtros
type SearchConfig struct {
	MinSearchLength int      `json:"min_search_length"`
	MaxResults      int      `json:"max_results"`
	EnableFuzzy     bool     `json:"enable_fuzzy"`
	SearchFields    []string `json:"search_fields"`
}

// GetSearchConfig retorna configuración de búsqueda
func GetSearchConfig() *SearchConfig {
	return &SearchConfig{
		MinSearchLength: 3,
		MaxResults:      1000,
		EnableFuzzy:     true,
		SearchFields: []string{
			"nombre_consultante",
			"numero_documento",
			"descripcion_caso",
			"area_consulta",
		},
	}
}