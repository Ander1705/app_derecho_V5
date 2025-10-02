// ==============================================================================
// MIDDLEWARE DE CACHE OPTIMIZADO PARA CONSULTORIO JURÍDICO UCMC
// Desarrollador Principal: Anderson Felipe Montaña Castelblanco
// Optimizado para manejar alto volumen de consultas
// ==============================================================================

package middleware

import (
	"bytes"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// CacheItem representa un elemento en cache
type CacheItem struct {
	Data      []byte    `json:"data"`
	Headers   map[string]string `json:"headers"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// CacheStore almacén de cache en memoria
type CacheStore struct {
	items sync.Map
	stats CacheStats
	mutex sync.RWMutex
}

// CacheStats estadísticas del cache
type CacheStats struct {
	Hits     int64 `json:"hits"`
	Misses   int64 `json:"misses"`
	Stores   int64 `json:"stores"`
	Evicted  int64 `json:"evicted"`
	Size     int   `json:"size"`
}

// ResponseWriter wrapper para capturar la respuesta
type ResponseWriter struct {
	gin.ResponseWriter
	body   *bytes.Buffer
	status int
}

func (w *ResponseWriter) Write(data []byte) (int, error) {
	w.body.Write(data)
	return w.ResponseWriter.Write(data)
}

func (w *ResponseWriter) WriteHeader(statusCode int) {
	w.status = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

// Cache global
var globalCache = &CacheStore{
	items: sync.Map{},
	stats: CacheStats{},
}

// CacheMiddleware middleware de cache con configuración avanzada
func CacheMiddleware(ttl time.Duration, excludePaths ...string) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Verificar si la ruta debe ser excluida del cache
		for _, path := range excludePaths {
			if c.Request.URL.Path == path {
				c.Next()
				return
			}
		}

		// Solo cachear métodos GET
		if c.Request.Method != "GET" {
			c.Next()
			return
		}

		// Generar clave de cache
		key := generateCacheKey(c)

		// Intentar obtener del cache
		if item, found := getFromCache(key); found {
			globalCache.mutex.Lock()
			globalCache.stats.Hits++
			globalCache.mutex.Unlock()

			// Establecer headers
			for k, v := range item.Headers {
				c.Header(k, v)
			}
			c.Header("X-Cache", "HIT")
			c.Header("X-Cache-Created", item.CreatedAt.Format(time.RFC3339))
			c.Header("X-Cache-Expires", item.ExpiresAt.Format(time.RFC3339))

			c.Data(http.StatusOK, "application/json", item.Data)
			c.Abort()
			return
		}

		// Cache miss - continuar con la petición
		globalCache.mutex.Lock()
		globalCache.stats.Misses++
		globalCache.mutex.Unlock()

		// Crear wrapper del ResponseWriter
		writer := &ResponseWriter{
			ResponseWriter: c.Writer,
			body:          &bytes.Buffer{},
			status:        200,
		}
		c.Writer = writer

		// Procesar petición
		c.Next()

		// Solo cachear respuestas exitosas
		if writer.status == http.StatusOK && writer.body.Len() > 0 {
			// Capturar headers relevantes
			headers := make(map[string]string)
			for k, v := range c.Writer.Header() {
				if len(v) > 0 && shouldCacheHeader(k) {
					headers[k] = v[0]
				}
			}

			// Crear item de cache
			item := CacheItem{
				Data:      writer.body.Bytes(),
				Headers:   headers,
				ExpiresAt: time.Now().Add(ttl),
				CreatedAt: time.Now(),
			}

			// Almacenar en cache
			storeInCache(key, item)
		}

		// Agregar headers de cache
		c.Header("X-Cache", "MISS")
		c.Header("X-Cache-TTL", ttl.String())
	})
}

// generateCacheKey genera una clave única para la petición
func generateCacheKey(c *gin.Context) string {
	// Incluir método, path, query params y headers relevantes
	keyData := struct {
		Method    string            `json:"method"`
		Path      string            `json:"path"`
		Query     map[string]string `json:"query"`
		UserAgent string            `json:"user_agent"`
		UserID    interface{}       `json:"user_id,omitempty"`
	}{
		Method: c.Request.Method,
		Path:   c.Request.URL.Path,
		Query:  make(map[string]string),
	}

	// Agregar query parameters
	for k, v := range c.Request.URL.Query() {
		if len(v) > 0 {
			keyData.Query[k] = v[0]
		}
	}

	// Agregar user-agent para cache por cliente
	keyData.UserAgent = c.GetHeader("User-Agent")

	// Agregar ID de usuario si está disponible
	if user, exists := c.Get("user"); exists {
		if userMap, ok := user.(map[string]interface{}); ok {
			keyData.UserID = userMap["id"]
		}
	}

	// Serializar a JSON y hacer hash
	jsonData, _ := json.Marshal(keyData)
	hash := md5.Sum(jsonData)
	return fmt.Sprintf("cache_%x", hash)
}

// getFromCache obtiene un elemento del cache
func getFromCache(key string) (*CacheItem, bool) {
	value, found := globalCache.items.Load(key)
	if !found {
		return nil, false
	}

	item, ok := value.(CacheItem)
	if !ok {
		globalCache.items.Delete(key)
		return nil, false
	}

	// Verificar expiración
	if time.Now().After(item.ExpiresAt) {
		globalCache.items.Delete(key)
		globalCache.mutex.Lock()
		globalCache.stats.Evicted++
		globalCache.mutex.Unlock()
		return nil, false
	}

	return &item, true
}

// storeInCache almacena un elemento en el cache
func storeInCache(key string, item CacheItem) {
	globalCache.items.Store(key, item)
	globalCache.mutex.Lock()
	globalCache.stats.Stores++
	globalCache.mutex.Unlock()
}

// shouldCacheHeader determina si un header debe ser cacheado
func shouldCacheHeader(header string) bool {
	cacheableHeaders := map[string]bool{
		"Content-Type":     true,
		"Content-Encoding": true,
		"Content-Language": true,
		"Vary":            true,
	}
	return cacheableHeaders[header]
}

// CleanupExpiredCache limpia elementos expirados del cache
func CleanupExpiredCache() {
	now := time.Now()
	count := 0

	globalCache.items.Range(func(key, value interface{}) bool {
		if item, ok := value.(CacheItem); ok {
			if now.After(item.ExpiresAt) {
				globalCache.items.Delete(key)
				count++
			}
		}
		return true
	})

	if count > 0 {
		globalCache.mutex.Lock()
		globalCache.stats.Evicted += int64(count)
		globalCache.mutex.Unlock()
	}
}

// GetCacheStats obtiene estadísticas del cache
func GetCacheStats() CacheStats {
	globalCache.mutex.RLock()
	defer globalCache.mutex.RUnlock()

	// Contar elementos actuales
	size := 0
	globalCache.items.Range(func(key, value interface{}) bool {
		size++
		return true
	})

	stats := globalCache.stats
	stats.Size = size
	return stats
}

// ClearCache limpia todo el cache
func ClearCache() {
	globalCache.items.Range(func(key, value interface{}) bool {
		globalCache.items.Delete(key)
		return true
	})

	globalCache.mutex.Lock()
	globalCache.stats = CacheStats{}
	globalCache.mutex.Unlock()
}

// InvalidateCache invalida cache por patrón
func InvalidateCache(pattern string) int {
	count := 0
	globalCache.items.Range(func(key, value interface{}) bool {
		if keyStr, ok := key.(string); ok {
			// Implementar lógica de patrón simple
			if pattern == "*" || keyStr == pattern {
				globalCache.items.Delete(key)
				count++
			}
		}
		return true
	})

	globalCache.mutex.Lock()
	globalCache.stats.Evicted += int64(count)
	globalCache.mutex.Unlock()

	return count
}

// StartCacheCleanup inicia limpieza automática del cache
func StartCacheCleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			CleanupExpiredCache()
		}
	}()
}