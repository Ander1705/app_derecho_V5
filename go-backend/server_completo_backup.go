package main

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"github.com/jung-kurt/gofpdf"
)

type User struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	NombreUsuario   string    `gorm:"uniqueIndex" json:"nombre_usuario"`
	Email           string    `gorm:"uniqueIndex" json:"email"`
	PasswordHash    string    `json:"-"`
	Role            string    `gorm:"default:'estudiante'" json:"role"`
	Activo          bool      `gorm:"default:true" json:"activo"`
	TipoDocumento   string    `gorm:"type:varchar(50)" json:"tipo_documento"`
	NumeroDocumento string    `gorm:"type:varchar(50)" json:"numero_documento"`
	Nombres         string    `gorm:"type:varchar(100)" json:"nombres"`
	Apellidos       string    `gorm:"type:varchar(100)" json:"apellidos"`
	NumeroCelular   string    `gorm:"type:varchar(20)" json:"numero_celular"`
	Sede            string    `gorm:"type:varchar(100)" json:"sede"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Estudiante struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	UserID            uint      `gorm:"unique" json:"user_id"`
	TipoDocumento     string    `json:"tipo_documento"`
	NumeroDocumento   string    `gorm:"unique" json:"numero_documento"`
	Nombres           string    `json:"nombres"`
	Apellidos         string    `json:"apellidos"`
	NumeroCelular     string    `json:"numero_celular"`
	CodigoEstudiantil int       `gorm:"unique" json:"codigo_estudiantil"`
	Sede              string    `json:"sede"`
	Activo            bool      `gorm:"default:true" json:"activo"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
	User              User      `gorm:"foreignKey:UserID" json:"user"`
}

type Profesor struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	UserID          uint      `gorm:"unique" json:"user_id"`
	TipoDocumento   string    `json:"tipo_documento"`
	NumeroDocumento string    `gorm:"unique" json:"numero_documento"`
	Nombres         string    `json:"nombres"`
	Apellidos       string    `json:"apellidos"`
	NumeroCelular   string    `json:"numero_celular"`
	Sede            string    `json:"sede"`
	Activo          bool      `gorm:"default:true" json:"activo"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	User            User      `gorm:"foreignKey:UserID" json:"user"`
}

type RegistroEstudianteRequest struct {
	TipoDocumento     string `json:"tipo_documento" binding:"required"`
	NumeroDocumento   string `json:"numero_documento" binding:"required"`
	Nombres           string `json:"nombres" binding:"required"`
	Apellidos         string `json:"apellidos" binding:"required"`
	NumeroCelular     string `json:"numero_celular" binding:"required"`
	CodigoEstudiantil string `json:"codigo_estudiantil" binding:"required"`
	NombreUsuario     string `json:"nombre_usuario" binding:"required,min=3,max=50"`
	Email             string `json:"email" binding:"required,email"`
	Password          string `json:"password" binding:"required,min=6"`
	Sede              string `json:"sede" binding:"required"`
}

type RegistroProfesorRequest struct {
	TipoDocumento   string `json:"tipo_documento" binding:"required"`
	NumeroDocumento string `json:"numero_documento" binding:"required"`
	Nombres         string `json:"nombres" binding:"required"`
	Apellidos       string `json:"apellidos" binding:"required"`
	NumeroCelular   string `json:"numero_celular" binding:"required"`
	NombreUsuario   string `json:"nombre_usuario" binding:"required,min=3,max=50"`
	Email           string `json:"email" binding:"required,email"`
	Password        string `json:"password" binding:"required,min=6"`
	Sede            string `json:"sede" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UserResponse struct {
	ID                uint    `json:"id"`
	TipoDocumento     string  `json:"tipo_documento"`
	NumeroDocumento   string  `json:"numero_documento"`
	Nombres           string  `json:"nombres"`
	Apellidos         string  `json:"apellidos"`
	NumeroCelular     string  `json:"numero_celular"`
	NombreUsuario     string  `json:"nombre_usuario"`
	Email             string  `json:"email"`
	Role              string  `json:"role"`
	Sede              string  `json:"sede"`
	CodigoEstudiantil *string `json:"codigo_estudiantil,omitempty"`
	Activo            bool    `json:"activo"`
	CreatedAt         time.Time `json:"created_at"`
}

type ControlOperativo struct {
	ID                       uint      `gorm:"primaryKey" json:"id"`
	Ciudad                   string    `gorm:"type:varchar(100)" json:"ciudad"`
	FechaDia                 int       `gorm:"not null" json:"fecha_dia"`
	FechaMes                 int       `gorm:"not null" json:"fecha_mes"`
	FechaAno                 int       `gorm:"not null" json:"fecha_ano"`
	NombreDocenteResponsable string    `gorm:"type:varchar(255)" json:"nombre_docente_responsable"`
	NombreEstudiante         string    `gorm:"type:varchar(255)" json:"nombre_estudiante"`
	AreaConsulta             string    `gorm:"type:varchar(100)" json:"area_consulta"`
	RemitidoPor              string    `gorm:"type:varchar(255)" json:"remitido_por"`
	CorreoElectronico        string    `gorm:"type:varchar(255)" json:"correo_electronico"`
	NombreConsultante        string    `gorm:"type:varchar(255)" json:"nombre_consultante"`
	Edad                     int       `json:"edad"`
	FechaNacimientoDia       int       `json:"fecha_nacimiento_dia"`
	FechaNacimientoMes       int       `json:"fecha_nacimiento_mes"`
	FechaNacimientoAno       int       `json:"fecha_nacimiento_ano"`
	LugarNacimiento          string    `gorm:"type:varchar(255)" json:"lugar_nacimiento"`
	Sexo                     string    `gorm:"type:varchar(20)" json:"sexo"`
	TipoDocumento            string    `gorm:"type:varchar(10)" json:"tipo_documento"`
	NumeroDocumento          string    `gorm:"type:varchar(20)" json:"numero_documento"`
	LugarExpedicion          string    `gorm:"type:varchar(255)" json:"lugar_expedicion"`
	Direccion                string    `gorm:"type:varchar(255)" json:"direccion"`
	Barrio                   string    `gorm:"type:varchar(100)" json:"barrio"`
	Estrato                  int       `json:"estrato"`
	NumeroTelefonico         string    `gorm:"type:varchar(20)" json:"numero_telefonico"`
	NumeroCelular            string    `gorm:"type:varchar(20)" json:"numero_celular"`
	EstadoCivil              string    `gorm:"type:varchar(50)" json:"estado_civil"`
	Escolaridad              string    `gorm:"type:varchar(100)" json:"escolaridad"`
	ProfesionOficio          string    `gorm:"type:varchar(100)" json:"profesion_oficio"`
	DescripcionCaso          string    `gorm:"type:text" json:"descripcion_caso"`
	ConceptoEstudiante       string    `gorm:"type:text" json:"concepto_estudiante"`
	ConceptoAsesor           string    `gorm:"type:text" json:"concepto_asesor"`
	EstadoFlujo              string    `gorm:"type:varchar(50);default:'pendiente_profesor'" json:"estado_flujo"`
	EstadoResultado          *string   `gorm:"type:varchar(50)" json:"estado_resultado"`
	Activo                   bool      `gorm:"default:true" json:"activo"`
	CreatedAt                time.Time `json:"created_at"`
	UpdatedAt                time.Time `json:"updated_at"`
	CreatedByID              uint      `gorm:"not null" json:"created_by"`
	CreatedBy                User      `gorm:"foreignKey:CreatedByID" json:"created_by_user,omitempty"`
}

type DocumentoAdjunto struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	ControlOperativoID uint      `gorm:"not null" json:"control_operativo_id"`
	NombreOriginal     string    `gorm:"type:varchar(255)" json:"nombre_original"`
	NombreArchivo      string    `gorm:"type:varchar(255)" json:"nombre_archivo"`
	TipoArchivo        string    `gorm:"type:varchar(50)" json:"tipo_archivo"`
	TamanoBytes        int64     `json:"tamano_bytes"`
	RutaArchivo        string    `gorm:"type:varchar(500)" json:"ruta_archivo"`
	ConvertidoPDF      bool      `gorm:"default:false" json:"convertido_pdf"`
	RutaPDF            string    `gorm:"type:varchar(500)" json:"ruta_pdf"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

var DB *gorm.DB
var jwtSecret = []byte("consultorio-juridico-secret-key-2025")

func generateToken(user *User) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})
	return token.SignedString(jwtSecret)
}

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

func checkPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// AuthMiddleware middleware de autenticación
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token de autorización requerido"})
			c.Abort()
			return
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			userID := uint(claims["user_id"].(float64))
			
			var user User
			if err := DB.First(&user, userID).Error; err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
				c.Abort()
				return
			}

			c.Set("user", &user)
		}

		c.Next()
	}
}

func main() {
	// Cargar .env
	godotenv.Load()
	
	// Conectar a PostgreSQL
	databaseURL := "postgresql://app_derecho_user:app_derecho_pass_2025@localhost/app_derecho_db?sslmode=disable"
	
	var err error
	DB, err = gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		log.Fatal("❌ Error conectando a PostgreSQL:", err)
	}
	log.Println("✅ Conectado a PostgreSQL")
	
	// Migrar tablas
	err = DB.AutoMigrate(&User{}, &Estudiante{}, &Profesor{}, &ControlOperativo{}, &DocumentoAdjunto{})
	if err != nil {
		log.Fatal("❌ Error en migraciones:", err)
	}
	log.Println("✅ Migraciones completadas")
	
	r := gin.Default()
	
	// CORS
	r.Use(func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "http://localhost:3000" {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})
	
	// Rutas básicas
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "App Derecho API Go funcionando"})
	})
	
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "database": "postgresql"})
	})
	
	// Login
	r.POST("/api/auth/login", func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Datos inválidos"})
			return
		}
		
		var user User
		var estudiante Estudiante
		var profesor Profesor
		
		if err := DB.Where("email = ? AND activo = true", req.Email).First(&user).Error; err != nil {
			c.JSON(401, gin.H{"error": "Credenciales inválidas"})
			return
		}
		
		if !checkPassword(req.Password, user.PasswordHash) {
			c.JSON(401, gin.H{"error": "Credenciales inválidas"})
			return
		}
		
		token, err := generateToken(&user)
		if err != nil {
			c.JSON(500, gin.H{"error": "Error generando token"})
			return
		}
		
		userResponse := UserResponse{
			ID:            user.ID,
			NombreUsuario: user.NombreUsuario,
			Email:         user.Email,
			Role:          user.Role,
			Activo:        user.Activo,
			CreatedAt:     user.CreatedAt,
		}
		
		// Obtener datos específicos según rol
		if user.Role == "estudiante" {
			DB.Where("user_id = ?", user.ID).First(&estudiante)
			// Validar si el estudiante está activo
			if !estudiante.Activo {
				c.JSON(401, gin.H{"error": "Cuenta suspendida. Contacte al coordinador."})
				return
			}
			userResponse.TipoDocumento = estudiante.TipoDocumento
			userResponse.NumeroDocumento = estudiante.NumeroDocumento
			userResponse.Nombres = estudiante.Nombres
			userResponse.Apellidos = estudiante.Apellidos
			userResponse.NumeroCelular = estudiante.NumeroCelular
			userResponse.Sede = estudiante.Sede
			codigo := strconv.Itoa(estudiante.CodigoEstudiantil)
			userResponse.CodigoEstudiantil = &codigo
		} else if user.Role == "profesor" {
			DB.Where("user_id = ?", user.ID).First(&profesor)
			userResponse.TipoDocumento = profesor.TipoDocumento
			userResponse.NumeroDocumento = profesor.NumeroDocumento
			userResponse.Nombres = profesor.Nombres
			userResponse.Apellidos = profesor.Apellidos
			userResponse.NumeroCelular = profesor.NumeroCelular
			userResponse.Sede = profesor.Sede
		}
		
		c.JSON(200, gin.H{
			"access_token": token,
			"token_type":   "Bearer",
			"user":         userResponse,
		})
	})
	
	// Registro de Estudiante - CON AUTO-LOGIN
	r.POST("/api/auth/registro/estudiante", func(c *gin.Context) {
		log.Printf("📥 Recibida petición de registro de estudiante")
		
		var req RegistroEstudianteRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("❌ Error parseando JSON: %v", err)
			log.Printf("📊 Datos recibidos: %+v", req)
			// Validaciones específicas con mensajes detallados
			errores := make(map[string]string)
			
			if req.TipoDocumento == "" {
				errores["tipo_documento"] = "Tipo de documento es obligatorio (CC, TI, Cédula de Extranjería, Pasaporte, Permiso)"
			}
			if req.NumeroDocumento == "" {
				errores["numero_documento"] = "Número de documento es obligatorio"
			}
			if req.Nombres == "" {
				errores["nombres"] = "Nombres son obligatorios"
			}
			if req.Apellidos == "" {
				errores["apellidos"] = "Apellidos son obligatorios"
			}
			if req.NumeroCelular == "" {
				errores["numero_celular"] = "Número de celular es obligatorio (10 dígitos)"
			}
			if req.CodigoEstudiantil == "" {
				errores["codigo_estudiantil"] = "Código estudiantil es obligatorio"
			} else {
				// Validar que sea solo números
				codigo, err := strconv.Atoi(req.CodigoEstudiantil)
				if err != nil {
					errores["codigo_estudiantil"] = "Código estudiantil debe contener solo números (ej: 2025001)"
				} else if codigo <= 0 || codigo > 9999999999 {
					errores["codigo_estudiantil"] = "Código estudiantil debe ser un número entre 1 y 9999999999 (hasta 10 dígitos)"
				}
			}
			if len(req.NombreUsuario) < 3 || len(req.NombreUsuario) > 50 {
				errores["nombre_usuario"] = "Nombre de usuario debe tener entre 3 y 50 caracteres"
			}
			if req.Email == "" || !strings.Contains(req.Email, "@") {
				errores["email"] = "Email es obligatorio y debe ser válido"
			}
			if len(req.Password) < 6 {
				errores["password"] = "Contraseña debe tener al menos 6 caracteres"
			}
			if req.Sede == "" {
				errores["sede"] = "Sede es obligatoria (UPK Tintal, Calle 34, Funza, Fusagasugá, Candelaria)"
			}
			
			c.JSON(400, gin.H{
				"error": "Datos inválidos - revise los campos marcados",
				"errores": errores,
			})
			return
		}
		
		// Validar correo institucional
		if !strings.HasSuffix(req.Email, "@universidadmayor.edu.co") {
			c.JSON(400, gin.H{"error": "Debe usar un correo institucional (@universidadmayor.edu.co)"})
			return
		}
		
		// Convertir y validar código estudiantil
		codigoInt, err := strconv.Atoi(req.CodigoEstudiantil)
		if err != nil {
			c.JSON(400, gin.H{
				"error": "Código estudiantil inválido",
				"mensaje": "El código estudiantil debe contener solo números (ej: 2025001)",
			})
			return
		}
		
		if codigoInt <= 0 || codigoInt > 9999999999 {
			c.JSON(400, gin.H{
				"error": "Código estudiantil fuera de rango",
				"mensaje": "El código debe ser un número entre 1 y 9999999999 (hasta 10 dígitos)",
			})
			return
		}
		
		// Verificar si ya existe
		var existingUser User
		var existingEstudiante Estudiante
		
		if err := DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
			c.JSON(400, gin.H{"error": "El correo ya está registrado"})
			return
		}
		
		if err := DB.Where("numero_documento = ?", req.NumeroDocumento).First(&existingEstudiante).Error; err == nil {
			c.JSON(400, gin.H{"error": "El documento ya está registrado"})
			return
		}
		
		if err := DB.Where("codigo_estudiantil = ?", codigoInt).First(&existingEstudiante).Error; err == nil {
			c.JSON(400, gin.H{"error": "El código estudiantil ya está registrado"})
			return
		}
		
		// Hash password
		hashedPassword, err := hashPassword(req.Password)
		if err != nil {
			c.JSON(500, gin.H{"error": "Error procesando contraseña"})
			return
		}
		
		// Transacción
		tx := DB.Begin()
		
		// Crear usuario
		newUser := User{
			NombreUsuario:   req.NombreUsuario,
			Email:           req.Email,
			PasswordHash:    hashedPassword,
			Role:            "estudiante",
			TipoDocumento:   req.TipoDocumento,
			NumeroDocumento: req.NumeroDocumento,
			Nombres:         req.Nombres,
			Apellidos:       req.Apellidos,
			NumeroCelular:   req.NumeroCelular,
			Sede:            req.Sede,
			Activo:          true,
		}
		
		log.Printf("📝 Creando usuario: %s (%s)", req.Email, req.NombreUsuario)
		
		if err := tx.Create(&newUser).Error; err != nil {
			tx.Rollback()
			log.Printf("❌ Error creando usuario en BD: %v", err)
			log.Printf("📊 Usuario que se intentó crear: %+v", newUser)
			c.JSON(500, gin.H{
				"error": "Error creando usuario",
				"detalle": err.Error(),
			})
			return
		}
		
		log.Printf("✅ Usuario base creado - ID: %d", newUser.ID)
		
		// Crear estudiante
		newEstudiante := Estudiante{
			UserID:            newUser.ID,
			TipoDocumento:     req.TipoDocumento,
			NumeroDocumento:   req.NumeroDocumento,
			Nombres:           req.Nombres,
			Apellidos:         req.Apellidos,
			NumeroCelular:     req.NumeroCelular,
			CodigoEstudiantil: codigoInt,
			Sede:              req.Sede,
			Activo:            true,
		}
		
		log.Printf("📝 Creando datos de estudiante para user_id: %d", newUser.ID)
		
		if err := tx.Create(&newEstudiante).Error; err != nil {
			tx.Rollback()
			log.Printf("❌ Error creando estudiante en BD: %v", err)
			log.Printf("📊 Estudiante que se intentó crear: %+v", newEstudiante)
			c.JSON(500, gin.H{
				"error": "Error creando datos de estudiante",
				"detalle": err.Error(),
			})
			return
		}
		
		log.Printf("✅ Estudiante creado - ID: %d, Código: %d", newEstudiante.ID, newEstudiante.CodigoEstudiantil)
		
		tx.Commit()
		
		log.Printf("✅ Estudiante creado exitosamente - ID: %d, Email: %s", newUser.ID, newUser.Email)
		
		// GENERAR TOKEN AUTOMÁTICAMENTE (AUTO-LOGIN)
		token, err := generateToken(&newUser)
		if err != nil {
			log.Printf("❌ Error generando token: %v", err)
			c.JSON(500, gin.H{"error": "Error generando token de acceso"})
			return
		}
		
		log.Printf("🔑 Token generado para auto-login")
		
		// Respuesta con auto-login
		codigo := strconv.Itoa(newEstudiante.CodigoEstudiantil)
		userResponse := UserResponse{
			ID:                newUser.ID,
			TipoDocumento:     newEstudiante.TipoDocumento,
			NumeroDocumento:   newEstudiante.NumeroDocumento,
			Nombres:           newEstudiante.Nombres,
			Apellidos:         newEstudiante.Apellidos,
			NumeroCelular:     newEstudiante.NumeroCelular,
			NombreUsuario:     newUser.NombreUsuario,
			Email:             newUser.Email,
			Role:              newUser.Role,
			Sede:              newEstudiante.Sede,
			CodigoEstudiantil: &codigo,
			Activo:            newUser.Activo,
			CreatedAt:         newUser.CreatedAt,
		}
		
		c.JSON(201, gin.H{
			"message":      "Estudiante registrado exitosamente",
			"access_token": token,
			"token_type":   "Bearer",
			"user":         userResponse,
		})
	})
	
	// Registro de Profesor - CON AUTO-LOGIN
	r.POST("/api/auth/registro/profesor", func(c *gin.Context) {
		log.Printf("📥 Recibida petición de registro de profesor")
		
		var req RegistroProfesorRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("❌ Error parseando JSON: %v", err)
			log.Printf("📊 Datos recibidos: %+v", req)
			// Validaciones específicas con mensajes detallados
			errores := make(map[string]string)
			
			if req.TipoDocumento == "" {
				errores["tipo_documento"] = "Tipo de documento es obligatorio (CC, TI, Cédula de Extranjería, Pasaporte, Permiso)"
			}
			if req.NumeroDocumento == "" {
				errores["numero_documento"] = "Número de documento es obligatorio"
			}
			if req.Nombres == "" {
				errores["nombres"] = "Nombres son obligatorios"
			}
			if req.Apellidos == "" {
				errores["apellidos"] = "Apellidos son obligatorios"
			}
			if req.NumeroCelular == "" {
				errores["numero_celular"] = "Número de celular es obligatorio (10 dígitos)"
			}
			if len(req.NombreUsuario) < 3 || len(req.NombreUsuario) > 50 {
				errores["nombre_usuario"] = "Nombre de usuario debe tener entre 3 y 50 caracteres"
			}
			if req.Email == "" || !strings.Contains(req.Email, "@") {
				errores["email"] = "Email es obligatorio y debe ser válido"
			}
			if len(req.Password) < 6 {
				errores["password"] = "Contraseña debe tener al menos 6 caracteres"
			}
			if req.Sede == "" {
				errores["sede"] = "Sede es obligatoria (UPK Tintal, Calle 34, Funza, Fusagasugá, Candelaria)"
			}
			
			c.JSON(400, gin.H{
				"error": "Datos inválidos - revise los campos marcados",
				"errores": errores,
			})
			return
		}
		
		// Validar correo institucional
		if !strings.HasSuffix(req.Email, "@universidadmayor.edu.co") {
			c.JSON(400, gin.H{"error": "Debe usar un correo institucional (@universidadmayor.edu.co)"})
			return
		}
		
		// Verificar si ya existe
		var existingUser User
		var existingProfesor Profesor
		
		if err := DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
			c.JSON(400, gin.H{"error": "El correo ya está registrado"})
			return
		}
		
		if err := DB.Where("numero_documento = ?", req.NumeroDocumento).First(&existingProfesor).Error; err == nil {
			c.JSON(400, gin.H{"error": "El documento ya está registrado"})
			return
		}
		
		// Hash password
		hashedPassword, err := hashPassword(req.Password)
		if err != nil {
			c.JSON(500, gin.H{"error": "Error procesando contraseña"})
			return
		}
		
		// Transacción
		tx := DB.Begin()
		
		// Crear usuario
		newUser := User{
			NombreUsuario:   req.NombreUsuario,
			Email:           req.Email,
			PasswordHash:    hashedPassword,
			Role:            "profesor",
			TipoDocumento:   req.TipoDocumento,
			NumeroDocumento: req.NumeroDocumento,
			Nombres:         req.Nombres,
			Apellidos:       req.Apellidos,
			NumeroCelular:   req.NumeroCelular,
			Sede:            req.Sede,
			Activo:          true,
		}
		
		if err := tx.Create(&newUser).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Error creando usuario"})
			return
		}
		
		// Crear profesor
		newProfesor := Profesor{
			UserID:          newUser.ID,
			TipoDocumento:   req.TipoDocumento,
			NumeroDocumento: req.NumeroDocumento,
			Nombres:         req.Nombres,
			Apellidos:       req.Apellidos,
			NumeroCelular:   req.NumeroCelular,
			Sede:            req.Sede,
			Activo:          true,
		}
		
		if err := tx.Create(&newProfesor).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Error creando datos de profesor"})
			return
		}
		
		tx.Commit()
		
		// GENERAR TOKEN AUTOMÁTICAMENTE (AUTO-LOGIN)
		token, err := generateToken(&newUser)
		if err != nil {
			c.JSON(500, gin.H{"error": "Error generando token de acceso"})
			return
		}
		
		// Respuesta con auto-login
		userResponse := UserResponse{
			ID:              newUser.ID,
			TipoDocumento:   newProfesor.TipoDocumento,
			NumeroDocumento: newProfesor.NumeroDocumento,
			Nombres:         newProfesor.Nombres,
			Apellidos:       newProfesor.Apellidos,
			NumeroCelular:   newProfesor.NumeroCelular,
			NombreUsuario:   newUser.NombreUsuario,
			Email:           newUser.Email,
			Role:            newUser.Role,
			Sede:            newProfesor.Sede,
			Activo:          newUser.Activo,
			CreatedAt:       newUser.CreatedAt,
		}
		
		c.JSON(201, gin.H{
			"message":      "Profesor registrado exitosamente",
			"access_token": token,
			"token_type":   "Bearer",
			"user":         userResponse,
		})
	})
	
	// Rutas protegidas
	protected := r.Group("/api")
	protected.Use(AuthMiddleware())
	
	// Endpoint para verificar token y obtener usuario actual
	protected.GET("/auth/me", func(c *gin.Context) {
		user, _ := c.Get("user")
		userModel := user.(*User)
		
		var estudiante Estudiante
		var profesor Profesor
		
		userResponse := UserResponse{
			ID:            userModel.ID,
			NombreUsuario: userModel.NombreUsuario,
			Email:         userModel.Email,
			Role:          userModel.Role,
			Activo:        userModel.Activo,
			CreatedAt:     userModel.CreatedAt,
		}
		
		if userModel.Role == "estudiante" {
			DB.Where("user_id = ?", userModel.ID).First(&estudiante)
			userResponse.TipoDocumento = estudiante.TipoDocumento
			userResponse.NumeroDocumento = estudiante.NumeroDocumento
			userResponse.Nombres = estudiante.Nombres
			userResponse.Apellidos = estudiante.Apellidos
			userResponse.NumeroCelular = estudiante.NumeroCelular
			userResponse.Sede = estudiante.Sede
			codigo := strconv.Itoa(estudiante.CodigoEstudiantil)
			userResponse.CodigoEstudiantil = &codigo
		} else if userModel.Role == "profesor" {
			DB.Where("user_id = ?", userModel.ID).First(&profesor)
			userResponse.TipoDocumento = profesor.TipoDocumento
			userResponse.NumeroDocumento = profesor.NumeroDocumento
			userResponse.Nombres = profesor.Nombres
			userResponse.Apellidos = profesor.Apellidos
			userResponse.NumeroCelular = profesor.NumeroCelular
			userResponse.Sede = profesor.Sede
		}
		
		c.JSON(200, userResponse)
	})
	
	// Endpoint para estadísticas de estudiante
	protected.GET("/auth/estudiante/estadisticas", func(c *gin.Context) {
		user, _ := c.Get("user")
		userModel := user.(*User)
		
		if userModel.Role != "estudiante" {
			c.JSON(403, gin.H{"error": "Acceso denegado"})
			return
		}
		
		c.JSON(200, gin.H{
			"controles_completados": 0,
			"controles_pendientes": 0,
			"ultima_actividad": "Recién registrado",
			"mes_actual": time.Now().Format("January 2006"),
		})
	})
	
	// Endpoint para lista de controles operativos
	protected.GET("/control-operativo/list", func(c *gin.Context) {
		log.Printf("📥 Recibida petición GET /api/control-operativo/list")
		
		var controles []ControlOperativo
		if err := DB.Preload("CreatedBy").Find(&controles).Error; err != nil {
			log.Printf("❌ Error obteniendo controles: %v", err)
			c.JSON(500, gin.H{"error": "Error obteniendo controles"})
			return
		}
		
		log.Printf("📋 Se encontraron %d controles operativos", len(controles))
		
		c.JSON(200, gin.H{
			"controles": controles,
			"total": len(controles),
			"mensaje": fmt.Sprintf("Se encontraron %d controles operativos", len(controles)),
		})
	})
	
	// Endpoint básico para controles operativos
	protected.GET("/control-operativo", func(c *gin.Context) {
		var controles []ControlOperativo
		if err := DB.Preload("CreatedBy").Find(&controles).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error obteniendo controles"})
			return
		}
		
		c.JSON(200, gin.H{
			"controles": controles,
			"total": len(controles),
		})
	})
	
	// Crear nuevo control operativo
	protected.POST("/control-operativo", func(c *gin.Context) {
		log.Printf("📥 Recibida petición POST /api/control-operativo")
		
		user, exists := c.Get("user")
		if !exists {
			log.Printf("❌ Usuario no encontrado en contexto")
			c.JSON(401, gin.H{"error": "Usuario no autenticado"})
			return
		}
		userModel := user.(*User)
		log.Printf("👤 Usuario autenticado: %s (ID: %d)", userModel.Email, userModel.ID)
		
		var controlData ControlOperativo
		if err := c.ShouldBindJSON(&controlData); err != nil {
			log.Printf("❌ Error parseando JSON: %v", err)
			c.JSON(400, gin.H{"error": "Datos inválidos", "detalle": err.Error()})
			return
		}
		log.Printf("📋 Datos recibidos para control operativo: %+v", controlData)
		
		// Asignar el usuario que crea el control
		controlData.CreatedByID = userModel.ID
		
		// Si es estudiante, usar sus nombres y apellidos automáticamente
		if userModel.Role == "estudiante" {
			var estudiante Estudiante
			if err := DB.Where("user_id = ?", userModel.ID).First(&estudiante).Error; err == nil {
				controlData.NombreEstudiante = estudiante.Nombres + " " + estudiante.Apellidos
				log.Printf("✅ Nombre estudiante asignado: %s", controlData.NombreEstudiante)
			} else {
				log.Printf("⚠️ No se encontraron datos de estudiante para user_id: %d", userModel.ID)
			}
		}
		
		// Intentar crear el control operativo en la base de datos
		log.Printf("💾 Intentando guardar control operativo en base de datos...")
		if err := DB.Create(&controlData).Error; err != nil {
			log.Printf("❌ Error creando control operativo en BD: %v", err)
			log.Printf("📊 Datos que se intentaron guardar: %+v", controlData)
			c.JSON(500, gin.H{
				"error": "Error creando control operativo", 
				"detalle": err.Error(),
			})
			return
		}
		
		log.Printf("✅ Control operativo creado exitosamente - ID: %d", controlData.ID)
		
		c.JSON(201, gin.H{
			"message": "Control operativo creado exitosamente",
			"control": controlData,
		})
	})
	
	// Subir archivo adjunto a un control operativo
	protected.POST("/control-operativo/:id/archivo", func(c *gin.Context) {
		controlID := c.Param("id")
		controlIDUint, err := strconv.ParseUint(controlID, 10, 32)
		if err != nil {
			c.JSON(400, gin.H{"error": "ID de control inválido"})
			return
		}
		
		// Verificar que el control existe
		var control ControlOperativo
		if err := DB.First(&control, controlIDUint).Error; err != nil {
			c.JSON(404, gin.H{"error": "Control operativo no encontrado"})
			return
		}
		
		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(400, gin.H{"error": "Error obteniendo archivo"})
			return
		}
		defer file.Close()
		
		// Crear directorio si no existe
		uploadDir := "uploads/control-operativo"
		os.MkdirAll(uploadDir, 0755)
		
		// Generar nombre único para el archivo
		filename := fmt.Sprintf("%d_%d_%s", controlIDUint, time.Now().Unix(), header.Filename)
		filepath := filepath.Join(uploadDir, filename)
		
		// Guardar archivo
		out, err := os.Create(filepath)
		if err != nil {
			c.JSON(500, gin.H{"error": "Error guardando archivo"})
			return
		}
		defer out.Close()
		
		_, err = io.Copy(out, file)
		if err != nil {
			c.JSON(500, gin.H{"error": "Error copiando archivo"})
			return
		}
		
		// Guardar información del archivo en la base de datos
		documento := DocumentoAdjunto{
			ControlOperativoID: uint(controlIDUint),
			NombreOriginal:     header.Filename,
			NombreArchivo:      filename,
			TipoArchivo:        header.Header.Get("Content-Type"),
			TamanoBytes:        header.Size,
			RutaArchivo:        filepath,
		}
		
		if err := DB.Create(&documento).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error guardando información del archivo"})
			return
		}
		
		c.JSON(201, gin.H{
			"message": "Archivo subido exitosamente",
			"documento": documento,
		})
	})
	
	// Generar PDF del control operativo con archivos adjuntos
	protected.GET("/control-operativo/:id/pdf", func(c *gin.Context) {
		log.Printf("📥 Solicitud de generación de PDF para control operativo")
		
		controlID := c.Param("id")
		controlIDUint, err := strconv.ParseUint(controlID, 10, 32)
		if err != nil {
			log.Printf("❌ ID de control inválido: %s", controlID)
			c.JSON(400, gin.H{"error": "ID de control inválido"})
			return
		}
		
		// Obtener el control con documentos adjuntos
		var control ControlOperativo
		if err := DB.Preload("CreatedBy").First(&control, controlIDUint).Error; err != nil {
			log.Printf("❌ Control operativo no encontrado: %d", controlIDUint)
			c.JSON(404, gin.H{"error": "Control operativo no encontrado"})
			return
		}
		
		var documentos []DocumentoAdjunto
		DB.Where("control_operativo_id = ?", controlIDUint).Find(&documentos)
		log.Printf("📎 Encontrados %d archivos adjuntos", len(documentos))
		
		log.Printf("🔍 Datos del control operativo: ID=%d, NombreEstudiante='%s', NombreConsultante='%s'", 
			control.ID, control.NombreEstudiante, control.NombreConsultante)
		
		// Generar PDF usando gofpdf - versión simplificada para debug
		pdf := gofpdf.New("P", "mm", "A4", "")
		log.Printf("📄 PDF inicializado")
		pdf.AddPage()
		log.Printf("📄 Página agregada")
		
		// Verificar que podemos escribir algo básico
		pdf.SetFont("Arial", "B", 16)
		pdf.Cell(0, 10, "CONTROL OPERATIVO DE CONSULTA JURIDICA")
		pdf.Ln(10)
		
		pdf.SetFont("Arial", "", 12)
		pdf.Ln(10)
		pdf.Cell(0, 8, fmt.Sprintf("ID del Control: %d", control.ID))
		pdf.Ln(8)
		pdf.Cell(0, 8, fmt.Sprintf("Estudiante: %s", control.NombreEstudiante))
		pdf.Ln(8)
		pdf.Cell(0, 8, fmt.Sprintf("Consultante: %s", control.NombreConsultante))
		pdf.Ln(8)
		pdf.Cell(0, 8, fmt.Sprintf("Fecha: %d/%d/%d", control.FechaDia, control.FechaMes, control.FechaAno))
		pdf.Ln(8)
		
		if control.DescripcionCaso != "" {
			pdf.Ln(5)
			pdf.Cell(0, 8, "DESCRIPCION DEL CASO:")
			pdf.Ln(8)
			pdf.MultiCell(0, 6, control.DescripcionCaso, "", "", false)
		}
		
		if len(documentos) > 0 {
			pdf.Ln(10)
			pdf.Cell(0, 8, "ARCHIVOS ADJUNTOS:")
			pdf.Ln(8)
			for i, doc := range documentos {
				pdf.Cell(0, 6, fmt.Sprintf("%d. %s", i+1, doc.NombreOriginal))
				pdf.Ln(6)
			}
		}
		
		log.Printf("📄 Contenido básico agregado al PDF")
		
		// Verificar si hay errores antes de generar output
		if pdf.Err() {
			log.Printf("❌ Error en PDF antes de output: %v", pdf.Error())
			c.JSON(500, gin.H{"error": "Error en la generación del PDF", "detalle": pdf.Error().Error()})
			return
		}
		
		log.Printf("📄 PDF construido sin errores, generando output...")
		
		// Generar el PDF final
		var buf bytes.Buffer
		err = pdf.Output(&buf)
		
		if err != nil {
			log.Printf("❌ Error generando output PDF: %v", err)
			c.JSON(500, gin.H{"error": "Error generando PDF", "detalle": err.Error()})
			return
		}
		
		if pdf.Err() {
			log.Printf("❌ Error en PDF: %v", pdf.Error())
			c.JSON(500, gin.H{"error": "Error en PDF", "detalle": pdf.Error().Error()})
			return
		}
		
		pdfBytes := buf.Bytes()
		log.Printf("✅ PDF generado exitosamente - %d bytes", len(pdfBytes))
		
		if len(pdfBytes) == 0 {
			log.Printf("⚠️ ADVERTENCIA: PDF generado está vacío!")
			c.JSON(500, gin.H{"error": "PDF generado está vacío"})
			return
		}
		
		// Enviar PDF como descarga
		c.Header("Content-Type", "application/pdf")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=control_operativo_%d.pdf", control.ID))
		c.Data(200, "application/pdf", pdfBytes)
	})
	
	// Endpoint para perfil de usuario
	protected.GET("/perfil", func(c *gin.Context) {
		user, _ := c.Get("user")
		userModel := user.(*User)
		
		var estudiante Estudiante
		var profesor Profesor
		
		userResponse := UserResponse{
			ID:            userModel.ID,
			NombreUsuario: userModel.NombreUsuario,
			Email:         userModel.Email,
			Role:          userModel.Role,
			Activo:        userModel.Activo,
			CreatedAt:     userModel.CreatedAt,
		}
		
		if userModel.Role == "estudiante" {
			DB.Where("user_id = ?", userModel.ID).First(&estudiante)
			userResponse.TipoDocumento = estudiante.TipoDocumento
			userResponse.NumeroDocumento = estudiante.NumeroDocumento
			userResponse.Nombres = estudiante.Nombres
			userResponse.Apellidos = estudiante.Apellidos
			userResponse.NumeroCelular = estudiante.NumeroCelular
			userResponse.Sede = estudiante.Sede
			codigo := strconv.Itoa(estudiante.CodigoEstudiantil)
			userResponse.CodigoEstudiantil = &codigo
		} else if userModel.Role == "profesor" {
			DB.Where("user_id = ?", userModel.ID).First(&profesor)
			userResponse.TipoDocumento = profesor.TipoDocumento
			userResponse.NumeroDocumento = profesor.NumeroDocumento
			userResponse.Nombres = profesor.Nombres
			userResponse.Apellidos = profesor.Apellidos
			userResponse.NumeroCelular = profesor.NumeroCelular
			userResponse.Sede = profesor.Sede
		}
		
		c.JSON(200, userResponse)
	})

	// Endpoint para obtener lista de profesores (para dropdown)
	protected.GET("/profesores", func(c *gin.Context) {
		var profesores []Profesor
		result := DB.Preload("User").Where("activo = true").Find(&profesores)
		if result.Error != nil {
			c.JSON(500, gin.H{"error": "Error al obtener profesores"})
			return
		}

		type ProfesorDropdown struct {
			ID     uint   `json:"id"`
			Nombre string `json:"nombre"`
		}

		var profesoresDropdown []ProfesorDropdown
		for _, prof := range profesores {
			profesoresDropdown = append(profesoresDropdown, ProfesorDropdown{
				ID:     prof.ID,
				Nombre: fmt.Sprintf("%s %s", prof.Nombres, prof.Apellidos),
			})
		}

		c.JSON(200, profesoresDropdown)
	})

	// Endpoint para profesores - ver controles asignados
	protected.GET("/profesor/controles-asignados", func(c *gin.Context) {
		user, _ := c.Get("user")
		userModel := user.(*User)
		
		if userModel.Role != "profesor" {
			c.JSON(403, gin.H{"error": "Acceso denegado"})
			return
		}

		var profesor Profesor
		DB.Where("user_id = ?", userModel.ID).First(&profesor)
		nombreCompleto := fmt.Sprintf("%s %s", profesor.Nombres, profesor.Apellidos)

		var controles []ControlOperativo
		result := DB.Preload("CreatedBy").Where("nombre_docente_responsable = ? AND activo = true", nombreCompleto).Find(&controles)
		if result.Error != nil {
			c.JSON(500, gin.H{"error": "Error al obtener controles"})
			return
		}

		c.JSON(200, controles)
	})

	// Endpoint para profesor - completar sección V (concepto asesor)
	protected.PUT("/profesor/control-operativo/:id/concepto", func(c *gin.Context) {
		user, _ := c.Get("user")
		userModel := user.(*User)
		
		if userModel.Role != "profesor" {
			c.JSON(403, gin.H{"error": "Acceso denegado"})
			return
		}

		controlID := c.Param("id")
		var request struct {
			ConceptoAsesor string `json:"concepto_asesor" binding:"required"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var control ControlOperativo
		if err := DB.First(&control, controlID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Control operativo no encontrado"})
			return
		}

		// Verificar que este profesor esté asignado a este control
		var profesor Profesor
		DB.Where("user_id = ?", userModel.ID).First(&profesor)
		nombreCompleto := fmt.Sprintf("%s %s", profesor.Nombres, profesor.Apellidos)
		
		if control.NombreDocenteResponsable != nombreCompleto {
			c.JSON(403, gin.H{"error": "No está autorizado para editar este control"})
			return
		}

		// Actualizar concepto y cambiar estado a completo
		control.ConceptoAsesor = request.ConceptoAsesor
		control.EstadoFlujo = "completo"
		control.UpdatedAt = time.Now()

		if err := DB.Save(&control).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error al actualizar control operativo"})
			return
		}

		// TODO: Aquí agregar notificación al estudiante

		c.JSON(200, gin.H{
			"message": "Concepto del asesor guardado exitosamente",
			"control": control,
		})
	})

	// Endpoint para coordinador - gestión de usuarios
	protected.GET("/coordinador/usuarios", func(c *gin.Context) {
		user, _ := c.Get("user")
		userModel := user.(*User)
		
		if userModel.Role != "coordinador" {
			c.JSON(403, gin.H{"error": "Acceso denegado"})
			return
		}

		var usuarios []User
		result := DB.Where("role IN ('estudiante', 'profesor')").Find(&usuarios)
		if result.Error != nil {
			c.JSON(500, gin.H{"error": "Error al obtener usuarios"})
			return
		}

		c.JSON(200, usuarios)
	})

	// Endpoint para coordinador - cambiar estado activo de usuario
	protected.PUT("/coordinador/usuario/:id/estado", func(c *gin.Context) {
		user, _ := c.Get("user")
		userModel := user.(*User)
		
		if userModel.Role != "coordinador" {
			c.JSON(403, gin.H{"error": "Acceso denegado"})
			return
		}

		userID := c.Param("id")
		var request struct {
			Activo bool `json:"activo"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var targetUser User
		if err := DB.First(&targetUser, userID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Usuario no encontrado"})
			return
		}

		targetUser.Activo = request.Activo
		targetUser.UpdatedAt = time.Now()

		if err := DB.Save(&targetUser).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error al actualizar usuario"})
			return
		}

		// También actualizar en tabla específica (estudiante/profesor)
		if targetUser.Role == "estudiante" {
			DB.Model(&Estudiante{}).Where("user_id = ?", targetUser.ID).Update("activo", request.Activo)
		} else if targetUser.Role == "profesor" {
			DB.Model(&Profesor{}).Where("user_id = ?", targetUser.ID).Update("activo", request.Activo)
		}

		c.JSON(200, gin.H{
			"message": "Estado del usuario actualizado",
			"usuario": targetUser,
		})
	})

	// Endpoint para coordinador - ver controles completos
	protected.GET("/coordinador/controles-completos", func(c *gin.Context) {
		user, _ := c.Get("user")
		userModel := user.(*User)
		
		if userModel.Role != "coordinador" {
			c.JSON(403, gin.H{"error": "Acceso denegado"})
			return
		}

		var controles []ControlOperativo
		result := DB.Preload("CreatedBy").Where("estado_flujo = 'completo' AND activo = true").Find(&controles)
		if result.Error != nil {
			c.JSON(500, gin.H{"error": "Error al obtener controles"})
			return
		}

		c.JSON(200, controles)
	})

	// Endpoint para coordinador - asignar resultado a control
	protected.PUT("/coordinador/control-operativo/:id/resultado", func(c *gin.Context) {
		user, _ := c.Get("user")
		userModel := user.(*User)
		
		if userModel.Role != "coordinador" {
			c.JSON(403, gin.H{"error": "Acceso denegado"})
			return
		}

		controlID := c.Param("id")
		var request struct {
			EstadoResultado string `json:"estado_resultado" binding:"required"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// Validar que el estado resultado sea válido
		estadosValidos := map[string]bool{
			"asesoria_consulta":         true,
			"auto_reparto":              true,
			"reparto":                   true,
			"solicitud_conciliacion":    true,
		}

		if !estadosValidos[request.EstadoResultado] {
			c.JSON(400, gin.H{"error": "Estado resultado no válido"})
			return
		}

		var control ControlOperativo
		if err := DB.First(&control, controlID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Control operativo no encontrado"})
			return
		}

		if control.EstadoFlujo != "completo" {
			c.JSON(400, gin.H{"error": "El control debe estar completo antes de asignar resultado"})
			return
		}

		control.EstadoResultado = &request.EstadoResultado
		control.EstadoFlujo = "con_resultado"
		control.UpdatedAt = time.Now()

		if err := DB.Save(&control).Error; err != nil {
			c.JSON(500, gin.H{"error": "Error al asignar resultado"})
			return
		}

		c.JSON(200, gin.H{
			"message": "Resultado asignado exitosamente",
			"control": control,
		})
	})
	
	log.Println("🚀 Servidor Go completo iniciando en puerto 8000")
	log.Println("📍 URL: http://localhost:8000")
	log.Println("💊 Health: http://localhost:8000/health")
	log.Println("📝 Registro estudiante: http://localhost:8000/api/auth/registro/estudiante")
	log.Println("📝 Registro profesor: http://localhost:8000/api/auth/registro/profesor")
	log.Println("🔑 Login: http://localhost:8000/api/auth/login")
	log.Println("📊 Dashboard estudiante: http://localhost:8000/api/auth/estudiante/estadisticas")
	log.Println("📋 Control operativo: http://localhost:8000/api/control-operativo/list")
	
	r.Run(":8000")
}