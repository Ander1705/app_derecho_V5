package middleware

import (
	"os"
	"strings"
	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Dominios permitidos para producción
		allowedOrigins := []string{
			"https://servicioucmc.online",
			"http://servicioucmc.online", 
			"https://www.servicioucmc.online",
		}
		
		// En desarrollo, permitir localhost
		if os.Getenv("GIN_MODE") != "release" {
			allowedOrigins = append(allowedOrigins, 
				"http://localhost:5173",
				"http://localhost:3000",
				"http://127.0.0.1:5173",
			)
		}
		
		// Verificar si el origin está permitido
		allowedOrigin := "*"
		for _, allowed := range allowedOrigins {
			if strings.EqualFold(origin, allowed) {
				allowedOrigin = origin
				break
			}
		}
		
		// Si estamos en producción y no es un origin permitido, usar el dominio principal
		if os.Getenv("GIN_MODE") == "release" && allowedOrigin == "*" {
			allowedOrigin = "https://servicioucmc.online"
		}
		
		c.Header("Access-Control-Allow-Origin", allowedOrigin)
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, PATCH, OPTIONS")
		c.Header("Access-Control-Max-Age", "43200") // 12 horas

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}