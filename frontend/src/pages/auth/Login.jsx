import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { EyeIcon, EyeSlashIcon, ShieldCheckIcon, KeyIcon } from '@heroicons/react/24/outline'

const Login = () => {
  const { login, isAuthenticated, loading, error, clearError } = useAuth()
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  
  // No limpiar errores automáticamente para debugging
  
  // Validación en tiempo real
  const validateField = (name, value) => {
    const errors = {}
    
    if (name === 'email') {
      if (!value) {
        errors.email = 'El correo electrónico es obligatorio'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.email = 'Por favor ingrese un correo electrónico válido'
      }
    }
    
    if (name === 'password') {
      if (!value) {
        errors.password = 'La contraseña es obligatoria'
      } else if (value.length < 6) {
        errors.password = 'La contraseña debe tener al menos 6 caracteres'
      }
    }
    
    return errors
  }


  // Redirigir si ya está autenticado (después de todos los hooks)
  if (isAuthenticated && !loading) {
    return <Navigate to="/dashboard" replace />
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    const newFormData = {
      ...formData,
      [name]: value
    }
    
    setFormData(newFormData)
    
    // Limpiar errores de validación cuando el usuario empieza a escribir
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    
    // Limpiar error del contexto
    if (error) {
      clearError()
    }
    
    // Validar en tiempo real solo después de que el campo pierde el foco
    const fieldErrors = validateField(name, value)
    if (value && fieldErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        ...fieldErrors
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validar campos
    const fieldsToValidate = ['email', 'password']
    
    let allErrors = {}
    fieldsToValidate.forEach(field => {
      const fieldErrors = validateField(field, formData[field])
      allErrors = { ...allErrors, ...fieldErrors }
    })
    
    if (Object.keys(allErrors).length > 0) {
      setValidationErrors(allErrors)
      return
    }
    
    setIsSubmitting(true)
    setValidationErrors({})
    
    try {
      const result = await login(formData.email, formData.password)
    } catch (error) {
      console.error('Error inesperado:', error)
    } finally {
      setIsSubmitting(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-university-gold border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-purple-500 border-t-transparent animate-spin opacity-30" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background con gradiente dinámico */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900">
        {/* Efectos de luz dinámica ultra sutiles */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 lg:w-64 lg:h-64 bg-university-gold rounded-full filter blur-3xl animate-pulse-ultra-slow"></div>
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 lg:w-40 lg:h-40 bg-purple-400 rounded-full filter blur-2xl animate-float-ultra-slow"></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl w-full">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Lado izquierdo - Información institucional */}
            <div className="order-1 lg:translate-x-0">
              <div className="text-center space-y-10">
                  {/* Logo/Escudo con efectos modernos */}
                  <div className="flex justify-center">
                    <div className="relative group cursor-pointer">
                      {/* Anillos de luz alrededor del escudo */}
                      <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 opacity-15 blur-lg group-hover:opacity-25 transition-opacity duration-500"></div>
                      
                      {/* Contenedor del escudo */}
                      <div className="relative w-56 h-56 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 group-hover:scale-105 transition-transform duration-500"></div>
                        <img 
                          src="/escudo.svg" 
                          alt="Escudo Universidad Colegio Mayor de Cundinamarca" 
                          className="relative z-10 w-44 h-44 object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Títulos con animaciones */}
                  <div className="space-y-6">
                    <div className="overflow-hidden">
                      <h1 className="text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-university-gold leading-tight">
                        SISTEMA
                      </h1>
                      <h1 className="text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-university-gold via-yellow-300 to-white leading-tight">
                        JURÍDICO
                      </h1>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-2xl lg:text-3xl font-semibold text-blue-100">
                        {/* Nombre responsivo */}
                        <span className="hidden sm:block">
                          Universidad Colegio Mayor de Cundinamarca
                        </span>
                        <span className="sm:hidden">
                          UCMC
                        </span>
                      </h3>
                    </div>
                    
                    {/* Badge de facultad */}
                    <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3">
                      <ShieldCheckIcon className="w-8 h-8 text-university-gold" />
                      <span className="text-lg font-semibold text-white">Facultad de Derecho</span>
                    </div>
                    
                    <div className="flex justify-center">
                      <p className="text-lg text-blue-200/80 max-w-lg leading-relaxed text-center">
                        Plataforma integral para la gestión profesional de casos legales, administración de clientes y generación de documentos jurídicos especializados.
                      </p>
                    </div>
                    
                  </div>
                </div>
            </div>

            {/* Lado derecho - Formulario de login */}
            <div className="order-2 lg:translate-x-0">
              <div className="flex justify-center lg:justify-end">
                  <div className="w-full max-w-lg">
                    {/* Container principal con efectos glassmorphism */}
                    <div className="relative group">
                      {/* Efectos de fondo */}
                      <div className="absolute -inset-1 rounded-3xl blur-lg transition-all duration-700 bg-gradient-to-r from-university-gold via-purple-500 to-purple-600 opacity-25 group-hover:opacity-40"></div>
                      
                      {/* Formulario principal */}
                      <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                        {/* Header del formulario */}
                        <div className="text-center mb-8">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 mb-6 shadow-lg">
                            <KeyIcon className="w-8 h-8 text-white" />
                          </div>
                          
                          <h2 className="text-3xl font-bold text-white mb-2">
                            Acceso Seguro
                          </h2>
                          <p className="text-blue-200">
                            Ingresa tus credenciales institucionales
                          </p>
                        </div>


                        {/* Mensaje de error mejorado */}
                        {error && (
                          <div className="mb-6 relative" key="login-error">
                            <div className="absolute inset-0 bg-red-500/20 rounded-2xl blur-sm"></div>
                            <div className="relative bg-red-500/10 border border-red-500/30 rounded-2xl p-4 backdrop-blur-sm">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <p className="text-red-200 text-sm font-medium">{error}</p>
                                  <button 
                                    onClick={clearError}
                                    className="mt-2 text-xs text-red-300 hover:text-red-100 transition-colors"
                                  >
                                    Cerrar mensaje
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                          {/* Campo Email */}
                          <div className="relative group">
                            <label className="block text-sm font-medium text-blue-200 mb-2 group-focus-within:text-white transition-colors">
                              Correo Electrónico
                            </label>
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                                <input
                                  id="email"
                                  name="email"
                                  type="email"
                                  autoComplete="email"
                                  required
                                  value={formData.email}
                                  onChange={handleChange}
                                  className={`relative w-full px-4 py-4 bg-white/5 border-2 rounded-xl text-white placeholder-blue-300 backdrop-blur-sm focus:outline-none transition-all duration-300 ${
                                    validationErrors.email
                                      ? 'border-red-400 focus:border-red-300'
                                      : 'border-white/20 focus:border-university-gold hover:border-white/40'
                                  }`}
                                  placeholder="correo@unicolmayor.edu.co"
                                  disabled={isSubmitting}
                                />
                                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-university-gold to-purple-500 rounded-l-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                              </div>
                              {validationErrors.email && (
                                <p className="mt-2 text-sm text-red-300 flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  {validationErrors.email}
                                </p>
                              )}
                            </div>

                          {/* Campo Password */}
                            <div className="relative group">
                              <label className="block text-sm font-medium text-blue-200 mb-2 group-focus-within:text-white transition-colors">
                                Contraseña
                              </label>
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                                <input
                                  id="password"
                                  name="password"
                                  type={showPassword ? 'text' : 'password'}
                                  autoComplete="current-password"
                                  required
                                  value={formData.password}
                                  onChange={handleChange}
                                  className={`relative w-full px-4 py-4 pr-12 bg-white/5 border-2 rounded-xl text-white placeholder-blue-300 backdrop-blur-sm focus:outline-none transition-all duration-300 ${
                                    validationErrors.password
                                      ? 'border-red-400 focus:border-red-300'
                                      : 'border-white/20 focus:border-university-gold hover:border-white/40'
                                  }`}
                                  placeholder="••••••••••••"
                                  disabled={isSubmitting}
                                />
                                <button
                                  type="button"
                                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                                  onClick={() => setShowPassword(!showPassword)}
                                  disabled={isSubmitting}
                                >
                                  {showPassword ? (
                                    <EyeSlashIcon className="w-5 h-5 text-blue-300 hover:text-white transition-colors" />
                                  ) : (
                                    <EyeIcon className="w-5 h-5 text-blue-300 hover:text-white transition-colors" />
                                  )}
                                </button>
                                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-university-gold to-purple-500 rounded-l-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                              </div>
                              {validationErrors.password && (
                                <p className="mt-2 text-sm text-red-300 flex items-center">
                                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  {validationErrors.password}
                                </p>
                              )}
                            </div>

                          {/* Opciones adicionales */}
                            <div className="flex items-center justify-between">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-university-gold focus:ring-university-gold focus:ring-offset-0"
                                />
                                <span className="ml-2 text-sm text-blue-200">Recordar sesión</span>
                              </label>
                              
                              <Link 
                                to="/recuperar-contraseña" 
                                className="text-sm text-university-gold hover:text-yellow-300 transition-colors"
                              >
                                ¿Olvidaste tu contraseña?
                              </Link>
                            </div>

                          {/* Botón de envío futurista */}
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="relative w-full group overflow-hidden"
                          >
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-university-gold to-yellow-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            <div className="relative py-4 px-6 flex items-center justify-center space-x-3 text-white font-semibold">
                              {isSubmitting ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Iniciando sesión...</span>
                                </>
                              ) : (
                                <>
                                  <span>Iniciar Sesión</span>
                                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                  </svg>
                                </>
                              )}
                            </div>
                          </button>

                          {/* Enlaces de navegación */}
                          <div className="text-center pt-4 space-y-3">
                            <p className="text-sm text-blue-300">
                              ¿No tienes una cuenta?{' '}
                              <Link 
                                to="/registro" 
                                className="text-university-gold hover:text-yellow-300 font-medium transition-colors underline"
                              >
                                Regístrate aquí
                              </Link>
                            </p>
                            <p className="text-sm text-blue-300">
                              ¿Necesitas ayuda?{' '}
                              <a 
                                href="mailto:consultoriojuridico.kennedy@universidadmayor.edu.co" 
                                className="text-university-gold hover:text-yellow-300 font-medium transition-colors"
                              >
                                Contactar coordinador
                              </a>
                            </p>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer minimalista */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-20">
        <p className="text-blue-300/60 text-sm">
          © 2025 Universidad Colegio Mayor de Cundinamarca
        </p>
      </div>
    </div>
  )
}

export default Login