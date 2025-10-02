package config

import (
	"os"
	"strconv"
)

type Config struct {
	Database DatabaseConfig
	JWT      JWTConfig
	Server   ServerConfig
	SMTP     SMTPConfig
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type JWTConfig struct {
	SecretKey      string
	ExpirationTime int
}

type ServerConfig struct {
	Port string
	Env  string
}

type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

func LoadConfig() *Config {
	port, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))
	jwtExpiration, _ := strconv.Atoi(getEnv("JWT_EXPIRATION_HOURS", "24"))
	smtpPort, _ := strconv.Atoi(getEnv("SMTP_PORT", "587"))

	return &Config{
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     port,
			User:     getEnv("DB_USER", "app_derecho_user"),
			Password: getEnv("DB_PASSWORD", "app_derecho_pass_2025"),
			DBName:   getEnv("DB_NAME", "app_derecho_db"),
			SSLMode:  getEnv("DB_SSL_MODE", "disable"),
		},
		JWT: JWTConfig{
			SecretKey:      getEnv("JWT_SECRET", "consultorio-juridico-secret-key-2025"),
			ExpirationTime: jwtExpiration,
		},
		Server: ServerConfig{
			Port: getEnv("SERVER_PORT", "8000"),
			Env:  getEnv("ENV", "development"),
		},
		SMTP: SMTPConfig{
			Host:     getEnv("SMTP_HOST", "smtp.gmail.com"),
			Port:     smtpPort,
			Username: getEnv("SMTP_USERNAME", "upkucmc@gmail.com"),
			Password: getEnv("SMTP_PASSWORD", "yjdqecthmqqtihhs"),
			From:     getEnv("SMTP_FROM", "upkucmc@gmail.com"),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}