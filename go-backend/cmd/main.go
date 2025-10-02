package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"

	"consultorio-juridico/internal/config"
	"consultorio-juridico/internal/database"
	"consultorio-juridico/internal/handlers"
	"consultorio-juridico/internal/middleware"
	"consultorio-juridico/internal/models"
	"consultorio-juridico/internal/services"
	"consultorio-juridico/pkg/pdf"
)

func main() {
	// Cargar configuración
	cfg := config.LoadConfig()

	// Configurar modo de gin según entorno
	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Inicializar base de datos
	db, err := database.InitializeDatabase(cfg)
	if err != nil {
		log.Fatal("Error inicializando base de datos:", err)
	}

	// Crear índices adicionales
	if err := database.CreateIndexes(db); err != nil {
		log.Println("Warning: Error creando índices:", err)
	}

	// Inicializar servicios
	emailService := services.NewEmailService(db, cfg.SMTP)
	authService := services.NewAuthService(db, cfg.JWT.SecretKey, cfg.JWT.ExpirationTime, emailService)
	notificationService := services.NewNotificationService(db)
	pdfGenerator := pdf.NewPDFGenerator()

	// Inicializar handlers
	authHandler := handlers.NewAuthHandler(authService)
	controlOperativoHandler := handlers.NewControlOperativoHandler(db, notificationService, pdfGenerator)
	profesorHandler := handlers.NewProfesorHandler(db, notificationService)
	coordinadorHandler := handlers.NewCoordinadorHandler(db, notificationService)
	notificationHandler := handlers.NewNotificationHandler(notificationService)
	calificacionHandler := handlers.NewCalificacionHandler(db, notificationService)

	// Obtener configuraciones de optimización
	optConfig := config.GetOptimizedConfig()

	// Aplicar optimizaciones a la base de datos
	if sqlDB, err := db.DB(); err == nil {
		sqlDB.SetMaxIdleConns(optConfig.Database.MaxIdleConns)
		sqlDB.SetMaxOpenConns(optConfig.Database.MaxOpenConns)
		sqlDB.SetConnMaxLifetime(optConfig.Database.ConnMaxLifetime)
		sqlDB.SetConnMaxIdleTime(optConfig.Database.ConnMaxIdleTime)
		log.Printf("✅ Optimizaciones de DB aplicadas: MaxConns=%d, MaxIdle=%d", 
			optConfig.Database.MaxOpenConns, optConfig.Database.MaxIdleConns)
	}

	// Crear router
	router := gin.New()

	// Middlewares de optimización y seguridad
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Compresión GZIP para todas las respuestas
	router.Use(gzip.Gzip(gzip.DefaultCompression))

	// CORS optimizado
	router.Use(middleware.CORSMiddleware())

	// Cache middleware para endpoints específicos (TTL de 15 minutos)
	cacheExcludePaths := []string{
		"/api/auth/login",
		"/api/auth/registro/estudiante",
		"/api/auth/registro/profesor",
		"/api/control-operativo",
		"/api/upload/temp",
	}
	router.Use(middleware.CacheMiddleware(15*time.Minute, cacheExcludePaths...))

	// Iniciar limpieza automática de cache cada 5 minutos
	middleware.StartCacheCleanup(5 * time.Minute)

	// Rutas públicas
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "API Consultorio Jurídico UCMC"})
	})

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":     "OK",
			"message":    "Server is running",
			"timestamp":  time.Now().UTC(),
			"cache":      middleware.GetCacheStats(),
		})
	})

	// Endpoint para estadísticas de rendimiento (solo en desarrollo)
	if cfg.Server.Env != "production" {
		router.GET("/debug/cache", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"cache_stats": middleware.GetCacheStats(),
				"config":      optConfig,
			})
		})

		router.POST("/debug/cache/clear", func(c *gin.Context) {
			middleware.ClearCache()
			c.JSON(200, gin.H{"message": "Cache cleared successfully"})
		})
	}

	// Rutas de autenticación (públicas)
	authRoutes := router.Group("/api/auth")
	{
		authRoutes.POST("/login", authHandler.Login)
		authRoutes.POST("/registro/estudiante", authHandler.RegistrarEstudiante)
		authRoutes.POST("/registro/profesor", authHandler.RegistrarProfesor)
		authRoutes.POST("/verificar-email", authHandler.VerificarEmail)
		authRoutes.POST("/reenviar-codigo", authHandler.ReenviarCodigoVerificacion)
		authRoutes.POST("/forgot-password", authHandler.ForgotPassword)
		authRoutes.POST("/reset-password", authHandler.ResetPassword)
	}

	// Rutas protegidas
	protected := router.Group("/api")
	protected.Use(middleware.AuthMiddleware(db, cfg.JWT.SecretKey))
	{
		// Rutas de perfil (todos los usuarios autenticados)
		protected.GET("/auth/me", authHandler.Me)
		protected.GET("/perfil", authHandler.ObtenerPerfil)

		// Rutas de control operativo
		protected.POST("/control-operativo", controlOperativoHandler.CrearControl)
		protected.GET("/control-operativo/list", controlOperativoHandler.ListarControles)
		protected.GET("/control-operativo/search", controlOperativoHandler.BuscarControles)
		protected.GET("/control-operativo/:id", controlOperativoHandler.ObtenerControl)
		protected.GET("/control-operativo/:id/pdf", controlOperativoHandler.GenerarPDF)
		protected.PUT("/control-operativo/:id/estado-resultado", controlOperativoHandler.EstablecerEstadoResultado)
		protected.POST("/upload/temp", controlOperativoHandler.UploadTempFile)

		// Rutas para profesores
		profesorRoutes := protected.Group("/profesor")
		profesorRoutes.Use(middleware.RequireRole("profesor"))
		{
			profesorRoutes.GET("/controles-asignados", profesorHandler.ObtenerControlesAsignados)
			profesorRoutes.PUT("/control-operativo/:id/concepto", profesorHandler.CompletarConcepto)
			profesorRoutes.POST("/calificaciones", calificacionHandler.CrearCalificacion)
			profesorRoutes.PUT("/calificaciones/:id", calificacionHandler.ActualizarCalificacion)
		}

		// Rutas para coordinadores
		coordinadorRoutes := protected.Group("/coordinador")
		coordinadorRoutes.Use(middleware.RequireRole("coordinador"))
		{
			coordinadorRoutes.GET("/usuarios", coordinadorHandler.ListarUsuarios)
			coordinadorRoutes.PUT("/usuario/:id/estado", coordinadorHandler.CambiarEstadoUsuario)
			coordinadorRoutes.GET("/controles-completos", coordinadorHandler.ListarControlesCompletos)
			coordinadorRoutes.PUT("/control-operativo/:id/resultado", coordinadorHandler.AsignarResultado)
			coordinadorRoutes.PUT("/control-operativo/:id/editar-estado", coordinadorHandler.EditarEstadoResultado)
			coordinadorRoutes.GET("/estadisticas", coordinadorHandler.ObtenerEstadisticas)
			coordinadorRoutes.GET("/estadisticas-completas", coordinadorHandler.ObtenerEstadisticasCompletas)
			coordinadorRoutes.POST("/calificaciones", calificacionHandler.CrearCalificacion)
			coordinadorRoutes.PUT("/calificaciones/:id", calificacionHandler.ActualizarCalificacion)
		}

		// Rutas de profesores para dropdown (accesible por estudiantes)
		protected.GET("/profesores", profesorHandler.ListarProfesores)

		// Rutas de notificaciones
		protected.GET("/notificaciones", notificationHandler.ListarNotificaciones)
		protected.PUT("/notificaciones/:id/leida", notificationHandler.MarcarComoLeida)
		protected.PUT("/notificaciones/marcar-todas-leidas", notificationHandler.MarcarTodasComoLeidas)
		protected.GET("/notificaciones/count", notificationHandler.ContarNoLeidas)

		// Rutas de calificaciones (accesibles por todos los usuarios autenticados)
		protected.GET("/calificaciones", calificacionHandler.ListarCalificaciones)
		protected.GET("/calificaciones/estudiante", calificacionHandler.ListarCalificacionesEstudiante)
		protected.GET("/calificaciones/estudiante/:estudiante_id/estadisticas", calificacionHandler.ObtenerEstadisticasEstudiante)
		protected.GET("/calificaciones/:id", calificacionHandler.ObtenerCalificacion)

		// Test endpoint for debugging (TEMPORARY)
		protected.GET("/test/controles", func(c *gin.Context) {
			var controles []models.ControlOperativo
			query := db.Preload("CreatedBy").Where("activo = true AND estado_flujo IN ('completo', 'con_resultado')")
			
			result := query.Order("created_at DESC").Limit(100).Find(&controles)
			
			if result.Error != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener controles", "details": result.Error.Error()})
				return
			}
			
			c.JSON(http.StatusOK, gin.H{
				"total": len(controles),
				"controles": controles,
			})
		})
		
		// Ruta de estadísticas para estudiantes
		protected.GET("/auth/estudiante/estadisticas", func(c *gin.Context) {
			user, exists := c.Get("user")
			if !exists {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
				return
			}

			userModel := user.(*models.User)
			if userModel.Role != "estudiante" {
				c.JSON(http.StatusForbidden, gin.H{"error": "Acceso denegado"})
				return
			}

			// Obtener estadísticas del estudiante
			var totalControles int64
			var controlesCompletos int64
			var controlesPendientes int64
			var controlesConResultado int64

			// Contar controles creados por el estudiante
			db.Model(&models.ControlOperativo{}).Where("created_by_id = ? AND activo = true", userModel.ID).Count(&totalControles)
			db.Model(&models.ControlOperativo{}).Where("created_by_id = ? AND activo = true AND estado_flujo = 'completo'", userModel.ID).Count(&controlesCompletos)
			db.Model(&models.ControlOperativo{}).Where("created_by_id = ? AND activo = true AND estado_flujo = 'pendiente_profesor'", userModel.ID).Count(&controlesPendientes)
			db.Model(&models.ControlOperativo{}).Where("created_by_id = ? AND activo = true AND estado_flujo = 'con_resultado'", userModel.ID).Count(&controlesConResultado)

			// Obtener fecha del último control creado
			var ultimoControl models.ControlOperativo
			var fechaRegistro *string
			if err := db.Where("created_by_id = ? AND activo = true", userModel.ID).
				Order("created_at DESC").First(&ultimoControl).Error; err == nil {
				fecha := ultimoControl.CreatedAt.Format("2006-01-02")
				fechaRegistro = &fecha
			}

			c.JSON(200, gin.H{
				"controles_creados":    totalControles,        // Campo que espera el frontend
				"controles_completos":  controlesCompletos,
				"controles_pendientes": controlesPendientes,
				"controles_con_resultado": controlesConResultado,
				"fecha_registro":       fechaRegistro,         // Campo que espera el frontend
				"total_controles":      totalControles,        // Mantener compatibilidad
			})
		})
	}

	// Iniciar servidor
	serverAddress := ":" + cfg.Server.Port
	log.Printf("🚀 Servidor iniciando en puerto %s", cfg.Server.Port)
	log.Printf("📍 URL: http://localhost:%s", cfg.Server.Port)
	log.Printf("💊 Health: http://localhost:%s/health", cfg.Server.Port)
	log.Printf("🔑 Login: http://localhost:%s/api/auth/login", cfg.Server.Port)
	log.Printf("📝 Registro estudiante: http://localhost:%s/api/auth/registro/estudiante", cfg.Server.Port)
	log.Printf("📝 Registro profesor: http://localhost:%s/api/auth/registro/profesor", cfg.Server.Port)

	if err := router.Run(serverAddress); err != nil {
		log.Fatal("Error iniciando servidor:", err)
	}
}