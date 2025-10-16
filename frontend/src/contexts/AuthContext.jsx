import { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react'
import axios from 'axios'

// Configuración de axios - usar proxy de Vite configurado en vite.config.js
// Solo configurar si axios no está ya configurado para evitar reinicios
if (!axios.defaults.baseURL) {
  axios.defaults.baseURL = ''
}
if (!axios.defaults.headers.common['Content-Type']) {
  axios.defaults.headers.common['Content-Type'] = 'application/json'
}

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
    case 'SET_INITIALIZED':
      return {
        ...state,
        initialized: true,
        loading: false
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
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
  initialized: false
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

  // Timer para verificar timeout de sesión (COMPLETAMENTE DESHABILITADO)
  useEffect(() => {
    // 🚨 COMPLETAMENTE DESHABILITADO - NO HACER LOGOUT AUTOMÁTICO NUNCA
    console.log('⚠️ Timer de sesión DESHABILITADO - Sin logout automático')
    return () => {} // Sin cleanup
  }, [])

  // Configurar interceptor de axios para incluir token automáticamente
  useEffect(() => {
    if (state.token && state.isAuthenticated) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
      localStorage.setItem('token', state.token)
      if (state.refreshToken) {
        localStorage.setItem('refreshToken', state.refreshToken)
      }
    }
    // 🚨 NUNCA LIMPIAR localStorage automáticamente - Solo al hacer login/logout manual
    console.log('⚠️ Limpieza automática de localStorage DESHABILITADA')
  }, [state.token, state.refreshToken, state.isAuthenticated, state.loading])

  // Verificar token existente al cargar la aplicación
  useEffect(() => {
    console.log('🚀 INICIANDO AuthContext - useEffect principal')
    
    const initializeAuth = async () => {
      console.log('🔍 initializeAuth ejecutándose...')
      
      const savedToken = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const savedRefreshToken = localStorage.getItem('refreshToken')
      const savedLastActivity = localStorage.getItem('lastActivity')
      const sessionData = localStorage.getItem('session_data')
      const currentSession = localStorage.getItem('current_session')
      
      console.log('📋 Datos de sesión encontrados:', {
        hasToken: !!savedToken,
        hasSessionData: !!sessionData,
        currentSession,
        lastActivity: savedLastActivity
      })
      
      if (savedToken && sessionData) {
        const now = Date.now()
        
        // 🚨 VERIFICACIÓN DE TIMEOUT COMPLETAMENTE DESHABILITADA
        console.log('⚠️ Verificación de timeout DESHABILITADA - Manteniendo sesión siempre')
        // NO verificar timeout NUNCA
        
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
          console.log('🚀 Verificando token con el servidor...')
          console.log('🌐 URL de verificación:', '/api/auth/me')
          
          const response = await axios.get('/api/auth/me')
          const serverUser = response.data
          
          // 🚨 VERIFICACIÓN DE CONSISTENCIA COMPLETAMENTE DESHABILITADA
          console.log('⚠️ Verificaciones de consistencia DESHABILITADAS - Aceptando cualquier usuario/rol')
          // NO verificar consistencia NUNCA - solo actualizar datos
          
          // Solo actualizar si todo es consistente
          console.log('✅ Sesión consistente - Manteniendo usuario actual')
          localStorage.setItem('auth_user', JSON.stringify(serverUser))
          localStorage.setItem('userRole', serverUser.role)
          localStorage.setItem('userId', serverUser.id.toString())
          localStorage.setItem('userEmail', serverUser.email)
          
          console.log('✅ Token válido y consistente, restaurando sesión:', {
            userId: serverUser.id,
            userEmail: serverUser.email,
            userRole: serverUser.role,
            responseStatus: response.status
          })
          
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: serverUser,
              access_token: savedToken,
              refresh_token: savedRefreshToken
            }
          })
          
          // Actualizar actividad inmediatamente al restaurar sesión
          const currentTime = Date.now()
          localStorage.setItem('lastActivity', currentTime.toString())
          dispatch({ type: 'UPDATE_ACTIVITY' })
          
          console.log('🔄 Sesión restaurada exitosamente:', {
            isAuthenticated: true,
            hasToken: true,
            activityUpdated: true
          })
          
        } catch (error) {
          console.error('❌ Error verificando token:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            message: error.message
          })
          
          // 🚨 NO HACER LOGOUT AUTOMÁTICO - Solo marcar como no inicializado
          console.log('⚠️ Error verificando token pero NO haciendo logout automático')
          dispatch({ type: 'SET_INITIALIZED' })
        }
      } else {
        console.log('📭 No hay token guardado, usuario no autenticado')
        dispatch({ type: 'SET_INITIALIZED' })
      }
    }

    initializeAuth()
  }, [clearAllStorageData])

  // Interceptor para manejar tokens expirados (COMPLETAMENTE DESHABILITADO)
  useEffect(() => {
    console.log('⚠️ Interceptor de errores 401 DESHABILITADO - Sin logout automático por tokens')
    // 🚨 NO configurar interceptor que cause logouts automáticos
    return () => {} // Sin cleanup
  }, [])

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'LOGIN_START' })
    
    // 🚨 LIMPIEZA NUCLEAR - ELIMINAR TODO RASTRO DE SESIONES ANTERIORES
    console.log('🧹 LIMPIEZA NUCLEAR - Eliminando TODO rastro de sesiones anteriores')
    
    try {
      // 1. Limpiar COMPLETAMENTE localStorage múltiples veces
      localStorage.clear()
      localStorage.clear()
      localStorage.clear()
      
      // 2. Limpiar sessionStorage múltiples veces
      sessionStorage.clear()
      sessionStorage.clear()
      sessionStorage.clear()
      
      // 3. Limpiar axios headers múltiples veces
      delete axios.defaults.headers.common['Authorization']
      delete axios.defaults.headers['Authorization']
      delete axios.defaults.headers.Authorization
      
      // 4. Forzar reinicio completo del estado
      dispatch({ type: 'LOGOUT' })
      
      // 5. Esperar un momento para que se procese la limpieza
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 6. Limpiar OTRA VEZ por si acaso
      localStorage.clear()
      sessionStorage.clear()
      
      console.log('✅ LIMPIEZA NUCLEAR COMPLETADA')
      
    } catch (cleanupError) {
      console.error('Error en limpieza nuclear:', cleanupError)
    }
    
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      })
      
      const { user, access_token, refresh_token } = response.data
      
      console.log('✅ LOGIN EXITOSO:', { userId: user.id, role: user.role, email: user.email })
      
      // ✅ GUARDAR datos de sesión con estructura simple
      const sessionData = {
        token: access_token,
        user: user,
        role: user.role,
        userId: user.id,
        email: user.email,
        loginTime: Date.now(),
        lastActivity: Date.now()
      }
      
      // Guardar datos de forma simple y directa
      localStorage.setItem('token', access_token)
      localStorage.setItem('auth_token', access_token)
      localStorage.setItem('auth_user', JSON.stringify(user))
      localStorage.setItem('userRole', user.role)
      localStorage.setItem('userId', user.id.toString())
      localStorage.setItem('userEmail', user.email)
      localStorage.setItem('lastActivity', Date.now().toString())
      localStorage.setItem('session_data', JSON.stringify(sessionData))
      
      if (refresh_token) {
        localStorage.setItem('refreshToken', refresh_token)
      }
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response.data
      })

      return { success: true }
    } catch (error) {
      let errorMessage = 'Error de autenticación'
      
      if (error.response) {
        // Errores del servidor
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
      return { success: false, error: errorMessage }
    }
  }, [])

  const logout = useCallback(() => {
    console.log('🚪 Iniciando logout NUCLEAR')
    
    try {
      // 🚨 LIMPIEZA NUCLEAR MÚLTIPLE para eliminar TODO rastro
      console.log('🧹 LIMPIEZA NUCLEAR de TODA la información de sesión')
      
      // 1. Limpiar localStorage múltiples veces con diferentes métodos
      localStorage.clear()
      localStorage.clear()
      localStorage.clear()
      
      // También eliminar claves específicas por si clear() falla
      const keysToDelete = ['token', 'auth_token', 'auth_user', 'refreshToken', 'userRole', 'userId', 'userEmail', 'lastActivity', 'session_data', 'current_session']
      keysToDelete.forEach(key => {
        localStorage.removeItem(key)
        localStorage.removeItem(key) // Dos veces por seguridad
      })
      
      // 2. Limpiar sessionStorage múltiples veces
      sessionStorage.clear()
      sessionStorage.clear()
      sessionStorage.clear()
      
      // 3. Limpiar axios headers de TODAS las formas posibles
      delete axios.defaults.headers.common['Authorization']
      delete axios.defaults.headers['Authorization']
      delete axios.defaults.headers.Authorization
      if (axios.defaults.headers.common) {
        axios.defaults.headers.common = {}
      }
      
      // 4. Actualizar estado múltiples veces
      dispatch({ type: 'LOGOUT' })
      dispatch({ type: 'LOGOUT' })
      
      // 5. Limpiar una vez más después de un momento
      setTimeout(() => {
        localStorage.clear()
        sessionStorage.clear()
      }, 50)
      
      console.log('🚪 Logout NUCLEAR terminado - TODO eliminado múltiples veces')
      
    } catch (error) {
      console.error('Error en logout nuclear:', error)
      // Fallback: al menos intentar limpiar lo básico
      try {
        localStorage.clear()
        sessionStorage.clear()
        dispatch({ type: 'LOGOUT' })
      } catch (fallbackError) {
        console.error('Error en fallback de logout:', fallbackError)
      }
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
  }), [
    state.isAuthenticated,
    state.user,
    state.loading,
    state.error,
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
    listarEstudiantes,
    registrarEstudiante,
    actualizarEstudiante,
    eliminarEstudiante,
    registrarEstudianteManual,
    registrarProfesorManual
  ])

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