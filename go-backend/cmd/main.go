package main

import (
	"log"
	"net/http"

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
	authService := services.NewAuthService(db, cfg.JWT.SecretKey, cfg.JWT.ExpirationTime)
	notificationService := services.NewNotificationService(db)
	pdfGenerator := pdf.NewPDFGenerator()

	// Inicializar handlers
	authHandler := handlers.NewAuthHandler(authService)
	controlOperativoHandler := handlers.NewControlOperativoHandler(db, notificationService, pdfGenerator)
	profesorHandler := handlers.NewProfesorHandler(db, notificationService)
	coordinadorHandler := handlers.NewCoordinadorHandler(db, notificationService)
	notificationHandler := handlers.NewNotificationHandler(notificationService)

	// Crear router
	router := gin.New()

	// Middlewares globales
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(middleware.CORSMiddleware())

	// Rutas públicas
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "API Consultorio Jurídico UCMC"})
	})

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "OK", "message": "Server is running"})
	})

	// Rutas de autenticación (públicas)
	authRoutes := router.Group("/api/auth")
	{
		authRoutes.POST("/login", authHandler.Login)
		authRoutes.POST("/registro/estudiante", authHandler.RegistrarEstudiante)
		authRoutes.POST("/registro/profesor", authHandler.RegistrarProfesor)
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
		protected.GET("/control-operativo/:id", controlOperativoHandler.ObtenerControl)
		protected.GET("/control-operativo/:id/pdf", controlOperativoHandler.GenerarPDF)

		// Rutas para profesores
		profesorRoutes := protected.Group("/profesor")
		profesorRoutes.Use(middleware.RequireRole("profesor"))
		{
			profesorRoutes.GET("/controles-asignados", profesorHandler.ObtenerControlesAsignados)
			profesorRoutes.PUT("/control-operativo/:id/concepto", profesorHandler.CompletarConcepto)
		}

		// Rutas para coordinadores
		coordinadorRoutes := protected.Group("/coordinador")
		coordinadorRoutes.Use(middleware.RequireRole("coordinador"))
		{
			coordinadorRoutes.GET("/usuarios", coordinadorHandler.ListarUsuarios)
			coordinadorRoutes.PUT("/usuario/:id/estado", coordinadorHandler.CambiarEstadoUsuario)
			coordinadorRoutes.GET("/controles-completos", coordinadorHandler.ListarControlesCompletos)
			coordinadorRoutes.PUT("/control-operativo/:id/resultado", coordinadorHandler.AsignarResultado)
			coordinadorRoutes.GET("/estadisticas", coordinadorHandler.ObtenerEstadisticas)
		}

		// Rutas de profesores para dropdown (accesible por estudiantes)
		protected.GET("/profesores", profesorHandler.ListarProfesores)

		// Rutas de notificaciones
		protected.GET("/notificaciones", notificationHandler.ListarNotificaciones)
		protected.PUT("/notificaciones/:id/leida", notificationHandler.MarcarComoLeida)
		protected.PUT("/notificaciones/marcar-todas-leidas", notificationHandler.MarcarTodasComoLeidas)
		protected.GET("/notificaciones/count", notificationHandler.ContarNoLeidas)

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