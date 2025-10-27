import axios from 'axios'

// Configuración base de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://servicioucmc.online/api'

// Configurar axios con interceptores para producción
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 segundos timeout
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor de request para añadir token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('❌ API Request Error:', error)
    return Promise.reject(error)
  }
)

// Interceptor de response para manejo global de errores
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error(`❌ API Response Error: ${error.response?.status} ${error.config?.url}`, {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    })
    
    // Si es error 401 y no estamos en login, redirigir
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      console.warn('🚨 Token expirado o inválido, redirigiendo a login')
      localStorage.clear()
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

export { api }
export default API_BASE_URL