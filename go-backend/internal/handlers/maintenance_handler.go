  package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"golang.org/x/crypto/bcrypt"

	"consultorio-juridico/internal/models"
	"consultorio-juridico/pkg/auth"
)

type MaintenanceHandler struct {
	db *gorm.DB
}

func NewMaintenanceHandler(db *gorm.DB) *MaintenanceHandler {
	return &MaintenanceHandler{
		db: db,
	}
}

// LimpiarBaseDatos elimina todos los usuarios excepto coordinadores
// Solo puede ser ejecutado por coordinadores
func (h *MaintenanceHandler) LimpiarBaseDatos(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	
	if user.Role != "coordinador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Solo coordinadores pueden ejecutar esta operación"})
		return
	}

	fmt.Printf("🧹 LIMPIEZA BÁSICA: Iniciando limpieza de usuarios solicitada por coordinador ID %d\n", user.ID)

	// Iniciar transacción
	tx := h.db.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error iniciando transacción"})
		return
	}

	var deletedCount struct {
		usuarios       int64
		estudiantes    int64
		profesores     int64
	}

	// 1. Eliminar estudiantes
	result := tx.Where("user_id IN (SELECT id FROM users WHERE role = 'estudiante')").Delete(&models.Estudiante{})
	deletedCount.estudiantes = result.RowsAffected
	fmt.Printf("🗑️ Eliminados %d registros de estudiantes\n", deletedCount.estudiantes)

	// 2. Eliminar profesores
	result = tx.Where("user_id IN (SELECT id FROM users WHERE role = 'profesor')").Delete(&models.Profesor{})
	deletedCount.profesores = result.RowsAffected
	fmt.Printf("🗑️ Eliminados %d registros de profesores\n", deletedCount.profesores)

	// 3. Eliminar usuarios que no son coordinadores
	result = tx.Where("role != 'coordinador'").Delete(&models.User{})
	deletedCount.usuarios = result.RowsAffected
	fmt.Printf("🗑️ Eliminados %d usuarios no coordinadores\n", deletedCount.usuarios)

	// Confirmar transacción
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error confirmando cambios"})
		return
	}

	var coordinadoresFinales int64
	h.db.Model(&models.User{}).Where("role = 'coordinador'").Count(&coordinadoresFinales)

	c.JSON(http.StatusOK, gin.H{
		"message": "Usuarios limpiados exitosamente",
		"eliminados": gin.H{
			"estudiantes": deletedCount.estudiantes,
			"profesores":  deletedCount.profesores,
			"usuarios":    deletedCount.usuarios,
		},
		"coordinadores_restantes": coordinadoresFinales,
	})
}

// LimpiarBaseDatosCompleta elimina TODOS los datos de prueba y deja solo coordinadores
// Solo puede ser ejecutado por coordinadores
func (h *MaintenanceHandler) LimpiarBaseDatosCompleta(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	
	if user.Role != "coordinador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Solo coordinadores pueden ejecutar esta operación"})
		return
	}

	fmt.Printf("🧹 LIMPIEZA DB: Iniciando limpieza solicitada por coordinador ID %d\n", user.ID)

	// Iniciar transacción
	tx := h.db.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error iniciando transacción"})
		return
	}

	// Variable para contar eliminaciones
	var deletedCount struct {
		controles         int64
		notificaciones    int64
		calificaciones    int64
		documentos        int64
		estudiantes       int64
		profesores        int64
		usuarios          int64
	}

	// 1. Eliminar TODOS los controles operativos (incluso de coordinadores para limpiar datos fake)
	result := tx.Delete(&models.ControlOperativo{}, "1=1")
	if result.Error != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error eliminando controles operativos"})
		return
	}
	deletedCount.controles = result.RowsAffected
	fmt.Printf("🗑️ Eliminados %d controles operativos\n", deletedCount.controles)

	// 2. Eliminar TODAS las notificaciones (limpiar datos fake)
	result = tx.Delete(&models.Notificacion{}, "1=1")
	if result.Error != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error eliminando notificaciones"})
		return
	}
	deletedCount.notificaciones = result.RowsAffected
	fmt.Printf("🗑️ Eliminadas %d notificaciones\n", deletedCount.notificaciones)

	// 3. Eliminar TODAS las calificaciones (limpiar datos fake)
	result = tx.Delete(&models.Calificacion{}, "1=1")
	if result.Error != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error eliminando calificaciones"})
		return
	}
	deletedCount.calificaciones = result.RowsAffected
	fmt.Printf("🗑️ Eliminadas %d calificaciones\n", deletedCount.calificaciones)

	// 4. Eliminar TODOS los documentos adjuntos (limpiar datos fake)
	result = tx.Delete(&models.DocumentoAdjunto{}, "1=1")
	if result.Error != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error eliminando documentos"})
		return
	}
	deletedCount.documentos = result.RowsAffected
	fmt.Printf("🗑️ Eliminados %d documentos adjuntos\n", deletedCount.documentos)

	// 5. Eliminar TODOS los estudiantes 
	result = tx.Delete(&models.Estudiante{}, "1=1")
	if result.Error != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error eliminando estudiantes"})
		return
	}
	deletedCount.estudiantes = result.RowsAffected
	fmt.Printf("🗑️ Eliminados %d registros de estudiantes\n", deletedCount.estudiantes)

	// 6. Eliminar TODOS los profesores
	result = tx.Delete(&models.Profesor{}, "1=1")
	if result.Error != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error eliminando profesores"})
		return
	}
	deletedCount.profesores = result.RowsAffected
	fmt.Printf("🗑️ Eliminados %d registros de profesores\n", deletedCount.profesores)

	// 7. Eliminar usuarios que no son coordinadores
	result = tx.Where("role != 'coordinador'").Delete(&models.User{})
	if result.Error != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error eliminando usuarios"})
		return
	}
	deletedCount.usuarios = result.RowsAffected
	fmt.Printf("🗑️ Eliminados %d usuarios no coordinadores\n", deletedCount.usuarios)

	// 8. Resetear secuencias para empezar limpio
	queries := []string{
		"SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true)",
		"SELECT setval('estudiantes_id_seq', 1, false)",
		"SELECT setval('profesores_id_seq', 1, false)", 
		"SELECT setval('control_operativos_id_seq', 1, false)",
		"SELECT setval('notificaciones_id_seq', 1, false)",
		"SELECT setval('calificaciones_id_seq', 1, false)",
		"SELECT setval('documento_adjuntos_id_seq', 1, false)",
	}

	for _, query := range queries {
		if err := tx.Exec(query).Error; err != nil {
			fmt.Printf("⚠️ Warning reseteando secuencia: %s\n", err)
		}
	}

	// Confirmar transacción
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error confirmando cambios"})
		return
	}

	// Verificar resultado final
	var coordinadoresFinales int64
	h.db.Model(&models.User{}).Where("role = 'coordinador'").Count(&coordinadoresFinales)

	fmt.Printf("✅ LIMPIEZA COMPLETADA: %d coordinadores restantes\n", coordinadoresFinales)

	c.JSON(http.StatusOK, gin.H{
		"message": "Base de datos limpiada COMPLETAMENTE - Todos los datos falsos eliminados",
		"eliminados": gin.H{
			"controles_operativos": deletedCount.controles,
			"notificaciones":       deletedCount.notificaciones,
			"calificaciones":       deletedCount.calificaciones,
			"documentos_adjuntos":  deletedCount.documentos,
			"estudiantes":          deletedCount.estudiantes,
			"profesores":           deletedCount.profesores,
			"usuarios":             deletedCount.usuarios,
		},
		"coordinadores_restantes": coordinadoresFinales,
		"estado": "SISTEMA COMPLETAMENTE LIMPIO - LISTO PARA PRODUCCIÓN",
	})
}

// VerificarEstadoBaseDatos muestra el estado actual de la base de datos
func (h *MaintenanceHandler) VerificarEstadoBaseDatos(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	
	if user.Role != "coordinador" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Solo coordinadores pueden ver esta información"})
		return
	}

	var stats struct {
		TotalUsuarios   int64 `json:"total_usuarios"`
		Coordinadores   int64 `json:"coordinadores"`
		Estudiantes     int64 `json:"estudiantes"`
		Profesores      int64 `json:"profesores"`
		TotalControles  int64 `json:"total_controles"`
	}

	h.db.Model(&models.User{}).Count(&stats.TotalUsuarios)
	h.db.Model(&models.User{}).Where("role = 'coordinador'").Count(&stats.Coordinadores)
	h.db.Model(&models.User{}).Where("role = 'estudiante'").Count(&stats.Estudiantes)
	h.db.Model(&models.User{}).Where("role = 'profesor'").Count(&stats.Profesores)
	h.db.Model(&models.ControlOperativo{}).Count(&stats.TotalControles)

	// También obtener la lista de usuarios
	var usuarios []struct {
		ID             uint   `json:"id"`
		NombreUsuario  string `json:"nombre_usuario"`
		Email          string `json:"email"`
		Role           string `json:"role"`
		Activo         bool   `json:"activo"`
	}

	h.db.Model(&models.User{}).Select("id, nombre_usuario, email, role, activo").Find(&usuarios)

	c.JSON(http.StatusOK, gin.H{
		"estadisticas": stats,
		"usuarios":     usuarios,
	})
}

// CrearCoordinadorUnico crea el coordinador único para producción
// Endpoint: POST /api/maintenance/crear-coordinador
func (h *MaintenanceHandler) CrearCoordinadorUnico(c *gin.Context) {
	// Verificar que no haya usuarios
	var userCount int64
	h.db.Model(&models.User{}).Count(&userCount)
	
	if userCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Ya existen usuarios en la base de datos. Use primero la limpieza completa.",
		})
		return
	}

	// Hash de la contraseña "Umayor2025**"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("Umayor2025**"), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generando hash de contraseña"})
		return
	}

	// Crear coordinador único
	coordinador := models.User{
		NombreUsuario:   "luz.rincon",
		Email:          "consultoriojuridico.kennedy@universidadmayor.edu.co",
		PasswordHash:   string(hashedPassword),
		Role:           "coordinador",
		Activo:         true,
		EmailVerified:  true,
		Nombres:        "Luz Mary",
		Apellidos:      "Rincon",
		NumeroCelular:  "3001234567",
		TipoDocumento:  "CC",
		NumeroDocumento: "12345678",
		Sede:           "Kennedy",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := h.db.Create(&coordinador).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creando coordinador"})
		return
	}

	fmt.Printf("✅ COORDINADOR CREADO: ID %d - %s\n", coordinador.ID, coordinador.Email)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Coordinador único creado exitosamente",
		"coordinador": gin.H{
			"id":    coordinador.ID,
			"email": coordinador.Email,
			"role":  coordinador.Role,
		},
	})
}