package main

import (
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
)

// Configuración CORS para producción
func setupCORS() gin.HandlerFunc {
	config := cors.Config{
		AllowOrigins: []string{
			"https://servicioucmc.online",
			"http://servicioucmc.online",
			"https://www.servicioucmc.online",
			"http://localhost:5173", // Para desarrollo local
		},
		AllowMethods: []string{
			"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS",
		},
		AllowHeaders: []string{
			"Origin", "Content-Type", "Authorization", 
			"Accept", "X-Requested-With", "Content-Length",
		},
		ExposeHeaders: []string{
			"Content-Length", "Authorization",
		},
		AllowCredentials: true,
		MaxAge: 12 * 3600, // 12 horas
	}
	
	return cors.New(config)
}

// Middleware adicional para manejar preflight requests
func corsPreflightHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "OPTIONS" {
			c.Header("Access-Control-Allow-Origin", "https://servicioucmc.online")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, Accept, X-Requested-With, Content-Length")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Max-Age", "43200")
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

// Health check endpoint para verificar que el backend funciona
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"message": "Backend funcionando correctamente",
		"timestamp": time.Now().UTC(),
		"environment": "production",
	})
}

func setupRoutes(r *gin.Engine) {
	// Aplicar CORS middleware
	r.Use(setupCORS())
	r.Use(corsPreflightHandler())
	
	// Health check
	r.GET("/api/health", healthCheck)
	
	// Grupo de rutas API
	api := r.Group("/api")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", loginHandler)
			auth.GET("/me", authMiddleware(), getMeHandler)
			// ... otros endpoints de auth
		}
		
		// Profesor routes
		profesor := api.Group("/profesor")
		profesor.Use(authMiddleware())
		{
			profesor.GET("/controles-asignados", getControlesAsignadosHandler)
			// ... otros endpoints de profesor
		}
		
		// ... otros grupos de rutas
	}
}

// INSTRUCCIONES PARA APLICAR EN EL SERVIDOR:
/*
1. Actualizar el archivo main.go o el archivo principal del backend con:
   - setupCORS() 
   - corsPreflightHandler()
   - healthCheck()

2. Agregar las dependencias necesarias:
   go mod tidy
   go get github.com/gin-contrib/cors

3. Verificar que el servidor esté ejecutándose en el puerto correcto
   (probablemente puerto 8080 o 8000)

4. Reiniciar el servicio del backend:
   sudo systemctl restart your-app-service
   # O el comando que uses para reiniciar el backend

5. Verificar logs:
   sudo journalctl -f -u your-app-service
   # O donde tengas configurados los logs

6. Probar endpoints:
   curl -X OPTIONS -H "Origin: https://servicioucmc.online" https://servicioucmc.online/api/health
   curl https://servicioucmc.online/api/health
*/