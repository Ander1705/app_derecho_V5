package database

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"consultorio-juridico/internal/config"
	"consultorio-juridico/internal/models"
)

func InitializeDatabase(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName,
		cfg.Database.SSLMode,
	)

	var logLevel logger.LogLevel
	if cfg.Server.Env == "development" {
		logLevel = logger.Info
	} else {
		logLevel = logger.Error
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})

	if err != nil {
		return nil, fmt.Errorf("error conectando a la base de datos: %w", err)
	}

	log.Println("✅ Conectado a PostgreSQL")

	// Auto-migrate
	err = AutoMigrate(db)
	if err != nil {
		return nil, fmt.Errorf("error en las migraciones: %w", err)
	}

	log.Println("✅ Migraciones completadas")
	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.User{},
		&models.Estudiante{},
		&models.Profesor{},
		&models.ControlOperativo{},
		&models.DocumentoAdjunto{},
		&models.Notificacion{},
		&models.Calificacion{},
	)
}

func CreateIndexes(db *gorm.DB) error {
	// Crear índices para optimizar consultas
	queries := []string{
		"CREATE INDEX IF NOT EXISTS idx_control_operativos_docente ON control_operativos(nombre_docente_responsable)",
		"CREATE INDEX IF NOT EXISTS idx_control_operativos_estado_flujo ON control_operativos(estado_flujo)",
		"CREATE INDEX IF NOT EXISTS idx_control_operativos_created_by ON control_operativos(created_by_id)",
		"CREATE INDEX IF NOT EXISTS idx_notificaciones_user_id ON notificaciones(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida)",
		"CREATE INDEX IF NOT EXISTS idx_documentos_adjuntos_control ON documento_adjuntos(control_operativo_id)",
		"CREATE INDEX IF NOT EXISTS idx_calificaciones_control_operativo ON calificaciones(control_operativo_id)",
		"CREATE INDEX IF NOT EXISTS idx_calificaciones_estudiante ON calificaciones(estudiante_id)",
		"CREATE INDEX IF NOT EXISTS idx_calificaciones_profesor_evaluador ON calificaciones(profesor_evaluador_id)",
		"CREATE INDEX IF NOT EXISTS idx_calificaciones_coordinador_evaluador ON calificaciones(coordinador_evaluador_id)",
	}

	for _, query := range queries {
		if err := db.Exec(query).Error; err != nil {
			log.Printf("Warning: Error creando índice: %s", err)
		}
	}

	return nil
}