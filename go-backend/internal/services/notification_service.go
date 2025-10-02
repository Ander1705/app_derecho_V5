package services

import (
	"log"

	"gorm.io/gorm"

	"consultorio-juridico/internal/models"
)

type NotificationService struct {
	db *gorm.DB
}

func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{db: db}
}

// Crear notificación cuando un estudiante crea un control operativo
func (s *NotificationService) NotificarNuevoControlAProfesor(controlOperativoID uint, profesorNombre string) error {
	// Buscar el profesor por nombre completo
	var profesor models.Profesor
	var user models.User
	
	// Primero buscar el profesor
	if err := s.db.Where("nombres || ' ' || apellidos = ?", profesorNombre).First(&profesor).Error; err != nil {
		log.Printf("Error encontrando profesor %s: %v", profesorNombre, err)
		return err
	}

	// Buscar el usuario del profesor
	if err := s.db.Where("id = ?", profesor.UserID).First(&user).Error; err != nil {
		log.Printf("Error encontrando usuario del profesor: %v", err)
		return err
	}

	// Crear notificación
	notificacion := models.Notificacion{
		ControlOperativoID: controlOperativoID,
		UserID:             user.ID,
		TipoNotificacion:   "nuevo_control_asignado",
		Mensaje:            "Se te ha asignado un nuevo control operativo para completar la sección V",
		Leida:              false,
	}

	if err := s.db.Create(&notificacion).Error; err != nil {
		log.Printf("Error creando notificación: %v", err)
		return err
	}

	log.Printf("✉️ Notificación enviada al profesor %s", profesorNombre)
	return nil
}

// Crear notificación cuando un profesor completa la sección V
func (s *NotificationService) NotificarControlCompletadoAEstudiante(controlOperativoID uint, estudianteID uint) error {
	notificacion := models.Notificacion{
		ControlOperativoID: controlOperativoID,
		UserID:             estudianteID,
		TipoNotificacion:   "control_completado",
		Mensaje:            "Tu control operativo ha sido completado por el profesor. Ya puedes descargar el PDF final",
		Leida:              false,
	}

	if err := s.db.Create(&notificacion).Error; err != nil {
		log.Printf("Error creando notificación: %v", err)
		return err
	}

	log.Printf("✉️ Notificación enviada al estudiante ID %d", estudianteID)
	return nil
}

// Crear notificación cuando el coordinador asigna un resultado
func (s *NotificationService) NotificarResultadoAsignadoAEstudiante(controlOperativoID uint, estudianteID uint, resultado string) error {
	mensajeResultado := map[string]string{
		"asesoria_consulta":      "Asesoría/Consulta",
		"auto_reparto":           "Auto Reparto",
		"reparto":                "Reparto",
		"solicitud_conciliacion": "Solicitud de Conciliación",
	}

	mensaje := "Se ha asignado el resultado final a tu control operativo: " + mensajeResultado[resultado]

	notificacion := models.Notificacion{
		ControlOperativoID: controlOperativoID,
		UserID:             estudianteID,
		TipoNotificacion:   "resultado_asignado",
		Mensaje:            mensaje,
		Leida:              false,
	}

	if err := s.db.Create(&notificacion).Error; err != nil {
		log.Printf("Error creando notificación: %v", err)
		return err
	}

	log.Printf("✉️ Notificación enviada al estudiante ID %d sobre resultado", estudianteID)
	return nil
}

// Obtener notificaciones de un usuario
func (s *NotificationService) ObtenerNotificacionesUsuario(userID uint) ([]models.Notificacion, error) {
	var notificaciones []models.Notificacion
	
	err := s.db.Where("user_id = ?", userID).
		Preload("ControlOperativo").
		Order("created_at DESC").
		Limit(20).
		Find(&notificaciones).Error

	return notificaciones, err
}

// Marcar notificación como leída
func (s *NotificationService) MarcarComoLeida(notificacionID uint, userID uint) error {
	return s.db.Model(&models.Notificacion{}).
		Where("id = ? AND user_id = ?", notificacionID, userID).
		Update("leida", true).Error
}

// Marcar todas las notificaciones de un usuario como leídas
func (s *NotificationService) MarcarTodasComoLeidas(userID uint) error {
	return s.db.Model(&models.Notificacion{}).
		Where("user_id = ? AND leida = false", userID).
		Update("leida", true).Error
}

// Contar notificaciones no leídas
func (s *NotificationService) ContarNoLeidas(userID uint) (int64, error) {
	var count int64
	err := s.db.Model(&models.Notificacion{}).
		Where("user_id = ? AND leida = false", userID).
		Count(&count).Error
	return count, err
}

// CrearNotificacion - método general para crear notificaciones
func (s *NotificationService) CrearNotificacion(userID uint, controlOperativoID uint, tipo string, mensaje string, rolDestino string) error {
	// Si userID es 0, enviar a todos los usuarios del rol especificado
	if userID == 0 && rolDestino != "" {
		var usuarios []models.User
		if err := s.db.Where("role = ? AND activo = true", rolDestino).Find(&usuarios).Error; err != nil {
			log.Printf("Error encontrando usuarios del rol %s: %v", rolDestino, err)
			return err
		}

		// Crear notificación para cada usuario del rol
		for _, usuario := range usuarios {
			notificacion := models.Notificacion{
				ControlOperativoID: controlOperativoID,
				UserID:             usuario.ID,
				TipoNotificacion:   tipo,
				Mensaje:            mensaje,
				Leida:              false,
			}

			if err := s.db.Create(&notificacion).Error; err != nil {
				log.Printf("Error creando notificación para usuario %d: %v", usuario.ID, err)
			}
		}
		return nil
	}

	// Crear notificación para usuario específico
	notificacion := models.Notificacion{
		ControlOperativoID: controlOperativoID,
		UserID:             userID,
		TipoNotificacion:   tipo,
		Mensaje:            mensaje,
		Leida:              false,
	}

	if err := s.db.Create(&notificacion).Error; err != nil {
		log.Printf("Error creando notificación: %v", err)
		return err
	}

	log.Printf("✉️ Notificación creada para usuario %d", userID)
	return nil
}