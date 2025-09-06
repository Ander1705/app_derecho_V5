package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"consultorio-juridico/internal/services"
	"consultorio-juridico/pkg/auth"
)

type NotificationHandler struct {
	notificationService *services.NotificationService
}

func NewNotificationHandler(notificationService *services.NotificationService) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
	}
}

func (h *NotificationHandler) ListarNotificaciones(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	notificaciones, err := h.notificationService.ObtenerNotificacionesUsuario(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error obteniendo notificaciones"})
		return
	}

	c.JSON(http.StatusOK, notificaciones)
}

func (h *NotificationHandler) MarcarComoLeida(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	notificacionIDStr := c.Param("id")
	notificacionID, err := strconv.ParseUint(notificacionIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de notificación inválido"})
		return
	}

	err = h.notificationService.MarcarComoLeida(uint(notificacionID), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error marcando notificación como leída"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notificación marcada como leída"})
}

func (h *NotificationHandler) MarcarTodasComoLeidas(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	err := h.notificationService.MarcarTodasComoLeidas(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error marcando notificaciones como leídas"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Todas las notificaciones marcadas como leídas"})
}

func (h *NotificationHandler) ContarNoLeidas(c *gin.Context) {
	user, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}

	count, err := h.notificationService.ContarNoLeidas(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error contando notificaciones"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}