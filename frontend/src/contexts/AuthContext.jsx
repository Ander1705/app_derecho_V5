import { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react'
import axios from 'axios'

// Configuración de axios - usar proxy de Vite
const API_BASE_URL = ''

axios.defaults.baseURL = API_BASE_URL
axios.defaults.headers.common['Content-Type'] = 'application/json'

// Estados del contexto de autenticación
const AuthContext = createContext()

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null
      }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.access_token,
        refreshToken: action.payload.refresh_token,
        error: null,
        lastActivity: Date.now()
      }
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        error: action.payload
      }
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        loading: false,
        error: null,
        lastActivity: null
      }
    case 'UPDATE_ACTIVITY':
      return {
        ...state,
        lastActivity: Date.now()
      }
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        loading: false
      }
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      }
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      }
    default:
      return state
  }
}

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: true,
  error: null,
  lastActivity: null,
  sessionTimeout: 8 * 60 * 1000 // 8 minutos en milisegundos
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Función utilitaria para limpiar completamente localStorage
  const clearAllStorageData = useCallback(() => {
    console.log('🧹 LIMPIEZA COMPLETA de localStorage iniciada')
    
    // Limpiar todos los campos conocidos
    localStorage.removeItem('token')
    localStorage.removeItem('auth_token') 
    localStorage.removeItem('auth_user')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('lastActivity')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')
    
    // FUERZA BRUTA: Limpiar TODOS los campos que empiecen con 'auth', 'user', 'token'
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('auth') || key.includes('user') || key.includes('token') || key.includes('refresh'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => {
      console.log('🗑️ Eliminando:', key)
      localStorage.removeItem(key)
    })
    
    delete axios.defaults.headers.common['Authorization']
    console.log('✅ LIMPIEZA COMPLETA terminada')
  }, [])

  // Listener para cambios en otras pestañas
  useEffect(() => {
    const handleStorageChange = (e) => {
        if (e.key === 'auth_token' || e.key === 'auth_user' || e.key === 'auth_role') {
            window.location.reload()
        }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Función para actualizar actividad del usuario
  const updateActivity = useCallback(() => {
    if (state.isAuthenticated) {
      dispatch({ type: 'UPDATE_ACTIVITY' })
      localStorage.setItem('lastActivity', Date.now().toString())
    }
  }, [state.isAuthenticated])

  // Configurar listeners para detectar actividad del usuario
  useEffect(() => {
    if (!state.isAuthenticated) return

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    const throttleTime = 30000 // Actualizar máximo cada 30 segundos

    let lastUpdate = 0
    const handleActivity = () => {
      const now = Date.now()
      if (now - lastUpdate > throttleTime) {
        lastUpdate = now
        updateActivity()
      }
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [state.isAuthenticated, updateActivity])

  // Timer para verificar timeout de sesión
  useEffect(() => {
    if (!state.isAuthenticated || !state.lastActivity) return

    const checkSessionTimeout = () => {
      const now = Date.now()
      const timeSinceLastActivity = now - state.lastActivity
      const sessionTimeout = 8 * 60 * 1000 // 8 minutos en milisegundos
      
      if (timeSinceLastActivity >= sessionTimeout) {
        console.log('⏰ Sesión expirada por inactividad')
        clearAllStorageData()
        dispatch({ type: 'LOGOUT' })
      }
    }

    const intervalId = setInterval(checkSessionTimeout, 60000) // Verificar cada minuto
    return () => clearInterval(intervalId)
  }, [state.isAuthenticated, state.lastActivity, state.sessionTimeout, clearAllStorageData])

  // Configurar interceptor de axios para incluir token automáticamente
  useEffect(() => {
    if (state.token && state.isAuthenticated) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
      localStorage.setItem('token', state.token)
      if (state.refreshToken) {
        localStorage.setItem('refreshToken', state.refreshToken)
      }
    } else if (state.isAuthenticated === false && !state.loading) {
      // Solo limpiar localStorage cuando explícitamente no está autenticado Y no esté cargando
      delete axios.defaults.headers.common['Authorization']
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('lastActivity')
    }
  }, [state.token, state.refreshToken, state.isAuthenticated, state.loading])

  // Verificar token existente al cargar la aplicación
  useEffect(() => {
    const verificarSesion = async () => {
        const token = localStorage.getItem('auth_token')
        const savedUser = localStorage.getItem('auth_user')
        const savedRole = localStorage.getItem('auth_role')
        const timestamp = localStorage.getItem('auth_timestamp')
        
        if (!token || !savedUser || !savedRole) {
            localStorage.clear()
            dispatch({ type: 'SET_LOADING', payload: false })
            return
        }
        
        // Verificar edad de sesión (24 horas)
        const now = Date.now()
        const sessionAge = now - parseInt(timestamp || '0')
        if (sessionAge > 24 * 60 * 60 * 1000) {
            logout()
            return
        }
        
        try {
            const response = await axios.get('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            })
            
            const currentUser = response.data
            const savedUserObj = JSON.parse(savedUser)
            
            // Verificar consistencia
            if (currentUser.id !== savedUserObj.id || currentUser.role !== savedRole) {
                console.error('Inconsistencia de sesión detectada')
                logout()
                return
            }
            
            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                    user: currentUser,
                    access_token: token,
                    refresh_token: localStorage.getItem('refreshToken')
                }
            })
            
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        } catch (error) {
            console.error('Token inválido:', error)
            logout()
        }
    }
    
    verificarSesion()
  }, [])

  // Interceptor para manejar tokens expirados
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          const refreshToken = localStorage.getItem('refreshToken')
          
          if (refreshToken) {
            try {
              const response = await axios.post('/api/auth/refresh', {
                refresh_token: refreshToken
              })
              
              const newToken = response.data.access_token
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                  user: state.user,
                  access_token: newToken,
                  refresh_token: response.data.refresh_token || refreshToken
                }
              })
              
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`
              return axios(originalRequest)
            } catch (refreshError) {
              console.error('Error al refrescar token:', refreshError)
              clearAllStorageData()
              dispatch({ type: 'LOGOUT' })
            }
          } else {
            clearAllStorageData()
            dispatch({ type: 'LOGOUT' })
          }
        }
        return Promise.reject(error)
      }
    )

    return () => {
      axios.interceptors.response.eject(responseInterceptor)
    }
  }, [state.user, clearAllStorageData])

  const login = useCallback(async (email, password) => {
    try {
        // 1. PRIMERO limpiar TODO
        localStorage.clear()
        sessionStorage.clear()
        delete axios.defaults.headers.common['Authorization']
        
        // 2. Hacer login
        const response = await axios.post('/api/auth/login', { email, password })
        const { user, access_token, refresh_token } = response.data
        
        // 3. Validar respuesta
        if (!access_token || !user || !user.role) {
            throw new Error('Respuesta de login inválida')
        }
        
        // 4. Guardar con claves únicas
        localStorage.setItem('auth_token', access_token)
        localStorage.setItem('auth_user', JSON.stringify(user))
        localStorage.setItem('auth_role', user.role)
        localStorage.setItem('auth_user_id', user.id.toString())
        localStorage.setItem('auth_timestamp', Date.now().toString())
        localStorage.setItem('lastActivity', Date.now().toString())
        if (refresh_token) {
            localStorage.setItem('refreshToken', refresh_token)
        }
        
        // 5. Configurar axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
        
        // 6. Actualizar estado
        dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, access_token, refresh_token }
        })
        
        // 7. Redirigir según rol
        const roleRoutes = {
            estudiante: '/estudiante/dashboard',
            profesor: '/profesor/dashboard',
            coordinador: '/coordinador/dashboard'
        }
        
        window.location.replace(roleRoutes[user.role] || '/login')
        return { success: true }
    } catch (error) {
        localStorage.clear()
        sessionStorage.clear()
        
        let errorMessage = 'Error de autenticación'
        
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    if (error.response.data?.detail === 'Invalid credentials') {
                        errorMessage = '❌ Credenciales incorrectas. Verifica tu correo electrónico y contraseña.'
                    } else {
                        errorMessage = '❌ No tienes autorización para acceder. Verifica tus credenciales.'
                    }
                    break
                case 404:
                    errorMessage = '❌ Usuario no encontrado. Verifica tu correo electrónico o regístrate.'
                    break
                case 422:
                    errorMessage = '❌ Datos inválidos. Verifica el formato del correo y la contraseña.'
                    break
                case 500:
                    errorMessage = '❌ Error interno del servidor. Inténtalo nuevamente más tarde.'
                    break
                default:
                    errorMessage = error.response.data?.detail || '❌ Error de autenticación'
            }
        } else if (error.request) {
            errorMessage = '❌ Error de conexión. Verifica que el servidor esté funcionando o inténtalo más tarde.'
        } else {
            errorMessage = '❌ Error inesperado. Inténtalo nuevamente.'
        }
        
        dispatch({
            type: 'LOGIN_FAILURE',
            payload: errorMessage
        })
        
        throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try {
        // 1. Limpiar COMPLETAMENTE localStorage
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key) keysToRemove.push(key)
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        
        // 2. Limpiar sessionStorage
        sessionStorage.clear()
        
        // 3. Limpiar estado de React
        dispatch({ type: 'LOGOUT' })
        
        // 4. Eliminar cookies si existen
        document.cookie.split(";").forEach(c => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })
        
        // 5. Limpiar axios headers
        delete axios.defaults.headers.common['Authorization']
        
        // 6. Esperar antes de redirigir
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // 7. Redirigir con replace
        window.location.replace('/login')
    } catch (error) {
        console.error('Error en logout:', error)
        window.location.replace('/login')
    }
  }, [])

  const register = useCallback(async (userData) => {
    dispatch({ type: 'LOGIN_START' })
    try {
      const response = await axios.post('/api/auth/register', userData)
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response.data
      })

      return { success: true }
    } catch (error) {
      let errorMessage = 'Error en el registro'
      
      if (error.response) {
        // Errores del servidor
        switch (error.response.status) {
          case 400:
            if (error.response.data?.detail === 'Email already registered') {
              errorMessage = '⚠️ Este correo electrónico ya está registrado. Utiliza otro correo o inicia sesión.'
            } else if (error.response.data?.detail === 'License number already registered') {
              errorMessage = '⚠️ Este número de licencia ya está registrado.'
            } else if (error.response.data?.detail?.message?.includes('Password does not meet security requirements')) {
              errorMessage = '⚠️ La contraseña no cumple con los requisitos de seguridad.'
            } else {
              errorMessage = error.response.data?.detail || '⚠️ Datos inválidos. Verifica la información ingresada.'
            }
            break
          case 422:
            errorMessage = '⚠️ Datos inválidos. Verifica el formato del correo y otros campos.'
            break
          case 500:
            errorMessage = '⚠️ Error interno del servidor. Inténtalo nuevamente más tarde.'
            break
          default:
            errorMessage = error.response.data?.detail || '⚠️ Error en el registro'
        }
      } else if (error.request) {
        // No hay conexión al servidor - simular para demostración
        if (userData.email === 'test@existe.com') {
          errorMessage = '⚠️ Este correo electrónico ya está registrado. Utiliza otro correo o inicia sesión.'
        } else {
          errorMessage = '⚠️ No se pudo conectar al servidor. Verifica tu conexión a internet.'
        }
      } else {
        errorMessage = '⚠️ Error inesperado. Inténtalo nuevamente.'
      }
      
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      })
      return { success: false, error: errorMessage }
    }
  }, [])

  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData)
      dispatch({ type: 'SET_USER', payload: response.data })
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error actualizando perfil'
      return { success: false, error: errorMessage }
    }
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const forgotPassword = useCallback(async (email) => {
    dispatch({ type: 'LOGIN_START' })
    
    try {
      const response = await axios.post('/api/auth/request-password-reset', {
        email
      })
      
      dispatch({ type: 'SET_LOADING', payload: false })
      
      return { 
        success: true, 
        message: response.data.message
      }
    } catch (error) {
      
      let errorMessage = '❌ Error al enviar el correo de recuperación'
      
      if (error.response) {
        switch (error.response.status) {
          case 404:
            errorMessage = '❌ No se encontró una cuenta con este correo electrónico.'
            break
          case 429:
            errorMessage = '❌ Demasiados intentos. Espera unos minutos antes de intentar nuevamente.'
            break
          case 500:
            errorMessage = '❌ Error interno del servidor. Inténtalo nuevamente más tarde.'
            break
          default:
            errorMessage = error.response.data?.message || error.response.data?.detail || '❌ Error al enviar el correo de recuperación'
        }
      } else if (error.request) {
        errorMessage = '❌ No se pudo conectar al servidor. Verifica tu conexión a internet.'
      } else {
        errorMessage = '❌ Error inesperado. Inténtalo nuevamente.'
      }
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      })
      return { success: false, error: errorMessage }
    }
  }, [])

  const resetPassword = useCallback(async ({ email, token, newPassword }) => {
    dispatch({ type: 'LOGIN_START' })
    
    try {
      // Primero verificar el código
      const verifyResponse = await axios.post('/api/auth/verify-recovery-code', {
        email,
        code: token
      })
      
      if (!verifyResponse.data.valid) {
        throw new Error(verifyResponse.data.message || 'Código inválido')
      }
      
      // Si el código es válido, cambiar la contraseña
      const response = await axios.post('/api/auth/reset-password', {
        email,
        code: token,
        new_password: newPassword
      })
      
      dispatch({ type: 'SET_LOADING', payload: false })
      return { success: true, message: response.data.message }
      
    } catch (error) {
      let errorMessage = '❌ Error al cambiar la contraseña'
      
      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = '❌ El código de verificación es inválido o ha expirado.'
            break
          case 404:
            errorMessage = '❌ No se encontró el usuario o la solicitud de recuperación.'
            break
          case 422:
            errorMessage = '❌ La nueva contraseña no cumple con los requisitos de seguridad.'
            break
          case 500:
            errorMessage = '❌ Error interno del servidor. Inténtalo nuevamente más tarde.'
            break
          default:
            errorMessage = error.response.data?.message || error.response.data?.detail || '❌ Error al cambiar la contraseña'
        }
      } else if (error.request) {
        errorMessage = '❌ No se pudo conectar al servidor. Verifica tu conexión a internet.'
      } else {
        errorMessage = error.message || '❌ Error inesperado. Inténtalo nuevamente.'
      }
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      })
      return { success: false, error: errorMessage }
    }
  }, [])

  const validarCodigo = useCallback(async (datos) => {
    try {
      const response = await axios.post('/api/auth/validar-codigo', datos)
      return { 
        success: true, 
        data: { 
          valido: true, 
          estudiante: response.data 
        } 
      }
    } catch (error) {
      return { 
        success: false, 
        data: { 
          valido: false, 
          mensaje: error.response?.data?.detail || '❌ Error validando código de estudiante' 
        },
        error: error.response?.data?.detail || '❌ Error validando código de estudiante' 
      }
    }
  }, [])

  const validarDatosPersonales = useCallback(async (datos) => {
    try {
      const response = await axios.post('/api/auth/validar-datos-personales', datos)
      return { 
        success: true, 
        data: response.data  // La respuesta ya tiene la estructura correcta: { valido, estudiante, mensaje }
      }
    } catch (error) {
      return { 
        success: false, 
        data: { 
          valido: false, 
          mensaje: error.response?.data?.detail || '❌ No se encontró un estudiante pre-registrado con estos datos' 
        },
        error: error.response?.data?.detail || '❌ No se encontró un estudiante pre-registrado con estos datos' 
      }
    }
  }, [])

  const registroEstudiante = useCallback(async (datos) => {
    console.log('🚀 Iniciando registro de estudiante:', datos)
    dispatch({ type: 'LOGIN_START' })
    try {
      const response = await axios.post('/api/auth/registro-estudiante', datos)
      console.log('✅ Respuesta del servidor:', response.data)
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response.data
      })
      
      console.log('✅ Usuario autenticado automáticamente después del registro')
      return { success: true }
    } catch (error) {
      console.error('❌ Error en registro de estudiante:', error)
    
      let errorMessage = 'Error completando el registro'
      
      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = error.response.data?.detail || '❌ Código no válido o ya utilizado'
            break
          case 422:
            errorMessage = error.response.data?.detail?.message || error.response.data?.detail || 'Error de validación'
            break
          case 500:
            errorMessage = '❌ Error interno del servidor. Inténtalo nuevamente más tarde.'
            break
          default:
            errorMessage = error.response.data?.detail || '❌ Error completando el registro'
        }
      } else if (error.request) {
        errorMessage = '❌ No se pudo conectar al servidor. Verifica tu conexión a internet.'
      }
      
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      })
      return { success: false, error: errorMessage }
    }
  }, [])

  // Funciones para gestión de estudiantes por coordinador
  const listarEstudiantes = useCallback(async () => {
    try {
      const response = await axios.get('/api/auth/coordinador/estudiantes')
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || '❌ Error obteniendo lista de estudiantes' 
      }
    }
  }, [])

  const registrarEstudiante = useCallback(async (datosEstudiante) => {
    try {
      const response = await axios.post('/api/auth/coordinador/registrar-estudiante', datosEstudiante)
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || '❌ Error registrando estudiante' 
      }
    }
  }, [])

  const actualizarEstudiante = useCallback(async (estudianteId, datosEstudiante) => {
    try {
      const response = await axios.put(`/api/auth/coordinador/estudiante/${estudianteId}`, datosEstudiante)
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || '❌ Error actualizando estudiante' 
      }
    }
  }, [])

  const eliminarEstudiante = useCallback(async (estudianteId) => {
    try {
      const response = await axios.delete(`/api/auth/coordinador/estudiante/${estudianteId}`)
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || '❌ Error eliminando estudiante' 
      }
    }
  }, [])

  // Funciones de registro manual
  const registrarEstudianteManual = useCallback(async (datos) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    
    try {
      const response = await axios.post('/api/auth/registro/estudiante', datos)
      
      dispatch({ type: 'SET_LOADING', payload: false })
      
      // El registro exitoso requiere verificación de email
      return { 
        success: true, 
        data: response.data,
        requiresVerification: true,
        email: datos.email 
      }
    } catch (error) {
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: error.response?.data?.error || '❌ Error en el registro de estudiante' 
      })
      return { 
        success: false, 
        error: error.response?.data?.error || '❌ Error en el registro de estudiante' 
      }
    }
  }, [dispatch])

  const registrarProfesorManual = useCallback(async (datos) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    
    try {
      const response = await axios.post('/api/auth/registro/profesor', datos)
      
      dispatch({ type: 'SET_LOADING', payload: false })
      
      // El registro exitoso requiere verificación de email
      return { 
        success: true, 
        data: response.data,
        requiresVerification: true,
        email: datos.email 
      }
    } catch (error) {
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: error.response?.data?.error || '❌ Error en el registro de profesor' 
      })
      return { 
        success: false, 
        error: error.response?.data?.error || '❌ Error en el registro de profesor' 
      }
    }
  }, [dispatch])

  const value = useMemo(() => ({
    ...state,
    login,
    logout,
    register,
    updateProfile,
    clearError,
    forgotPassword,
    resetPassword,
    validarCodigo,
    validarDatosPersonales,
    registroEstudiante,
    // Funciones de coordinador
    listarEstudiantes,
    registrarEstudiante,
    actualizarEstudiante,
    eliminarEstudiante,
    // Funciones de registro manual
    registrarEstudianteManual,
    registrarProfesorManual
  }), [state, login, logout, register, updateProfile, clearError, forgotPassword, resetPassword, validarCodigo, validarDatosPersonales, registroEstudiante, listarEstudiantes, registrarEstudiante, actualizarEstudiante, eliminarEstudiante, registrarEstudianteManual, registrarProfesorManual])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}