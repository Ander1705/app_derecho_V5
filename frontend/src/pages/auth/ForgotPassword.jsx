import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeftIcon, EnvelopeIcon, ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

const ForgotPassword = () => {
  const { forgotPassword, resetPassword, error, clearError } = useAuth()
  const [step, setStep] = useState('email') // 'email', 'token', 'success'
  const [formData, setFormData] = useState({
    email: '',
    token: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Limpiar errores al cambiar de step
  useEffect(() => {
    if (error) {
      clearError()
    }
  }, [step, clearError])

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
    
    if (name === 'token') {
      if (!value) {
        errors.token = 'El código de verificación es obligatorio'
      } else if (value.length < 6) {
        errors.token = 'El código debe tener al menos 6 caracteres'
      }
    }
    
    if (name === 'newPassword') {
      if (!value) {
        errors.newPassword = 'La nueva contraseña es obligatoria'
      } else if (value.length < 6) {
        errors.newPassword = 'La contraseña debe tener al menos 6 caracteres'
      }
    }
    
    if (name === 'confirmPassword') {
      if (!value) {
        errors.confirmPassword = 'Confirme su nueva contraseña'
      } else if (value !== formData.newPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden'
      }
    }
    
    return errors
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Limpiar errores de validación cuando el usuario empieza a escribir
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }))
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

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    
    // Validar email
    const emailErrors = validateField('email', formData.email)
    if (Object.keys(emailErrors).length > 0) {
      setValidationErrors(emailErrors)
      return
    }
    
    setIsSubmitting(true)
    setValidationErrors({})
    clearError() // Limpiar errores previos
    
    try {
      const result = await forgotPassword(formData.email)
      
      if (result && result.success) {
        setStep('token')
      }
    } catch (error) {
      // Los errores se manejan en el AuthContext
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    
    // Validar todos los campos
    const fieldsToValidate = ['token', 'newPassword', 'confirmPassword']
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
    clearError() // Limpiar errores previos
    
    try {
      const result = await resetPassword({
        email: formData.email,
        token: formData.token,
        newPassword: formData.newPassword
      })
      
      if (result.success) {
        setStep('success')
      }
    } catch (error) {
      // Los errores se manejan en el AuthContext
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderEmailStep = () => (
    <div className="relative group">
      {/* Efectos de fondo */}
      <div className="absolute -inset-1 bg-gradient-to-r from-university-gold via-purple-500 to-purple-600 rounded-3xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-500"></div>
      
      {/* Formulario principal */}
      <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
        {/* Header del formulario */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 mb-6 shadow-lg">
            <EnvelopeIcon className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            Recuperar Contraseña
          </h2>
          <p className="text-blue-200">
            Ingresa tu correo para recibir instrucciones
          </p>
        </div>

        {/* Mensaje de error mejorado */}
        {error && (
          <div className="mb-6 relative" key="forgot-error">
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

        <form onSubmit={handleEmailSubmit} className="space-y-6">
          {/* Campo Email */}
          <div className="relative group">
            <label className="block text-sm font-medium text-blue-200 mb-2 group-focus-within:text-white transition-colors">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
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

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="relative w-full group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-university-gold to-yellow-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative py-4 px-6 flex items-center justify-center space-x-3 text-white font-semibold">
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <EnvelopeIcon className="w-5 h-5" />
                  <span>Enviar Instrucciones</span>
                </>
              )}
            </div>
          </button>

          {/* Enlaces de navegación */}
          <div className="text-center pt-4">
            <Link 
              to="/auth"
              className="inline-flex items-center space-x-2 text-sm text-university-gold hover:text-yellow-300 font-medium transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Volver al inicio de sesión</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )

  const renderTokenStep = () => (
    <div className="relative group">
      {/* Efectos de fondo */}
      <div className="absolute -inset-1 bg-gradient-to-r from-university-gold via-purple-500 to-purple-600 rounded-3xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-500"></div>
      
      {/* Formulario principal */}
      <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
        {/* Header del formulario */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 mb-6 shadow-lg">
            <ShieldCheckIcon className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            Restablecer Contraseña
          </h2>
          <p className="text-blue-200">
            Ingresa el código enviado a {formData.email}
          </p>
        </div>

        {/* Mensaje de error mejorado */}
        {error && (
          <div className="mb-6 relative" key="reset-error">
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

        <form onSubmit={handleResetSubmit} className="space-y-6">
          {/* Campo Token */}
          <div className="relative group">
            <label className="block text-sm font-medium text-blue-200 mb-2 group-focus-within:text-white transition-colors">
              Código de Verificación
            </label>
            <div className="relative">
              <input
                name="token"
                type="text"
                required
                value={formData.token}
                onChange={handleChange}
                className={`relative w-full px-4 py-4 bg-white/5 border-2 rounded-xl text-white placeholder-blue-300 backdrop-blur-sm focus:outline-none transition-all duration-300 text-center tracking-widest ${
                  validationErrors.token
                    ? 'border-red-400 focus:border-red-300'
                    : 'border-white/20 focus:border-university-gold hover:border-white/40'
                }`}
                placeholder="123456"
                disabled={isSubmitting}
              />
            </div>
            {validationErrors.token && (
              <p className="mt-2 text-sm text-red-300">{validationErrors.token}</p>
            )}
          </div>

          {/* Campo Nueva Contraseña */}
          <div className="relative group">
            <label className="block text-sm font-medium text-blue-200 mb-2 group-focus-within:text-white transition-colors">
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.newPassword}
                onChange={handleChange}
                className={`relative w-full px-4 py-4 pr-12 bg-white/5 border-2 rounded-xl text-white placeholder-blue-300 backdrop-blur-sm focus:outline-none transition-all duration-300 ${
                  validationErrors.newPassword
                    ? 'border-red-400 focus:border-red-300'
                    : 'border-white/20 focus:border-university-gold hover:border-white/40'
                }`}
                placeholder="••••••••"
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
            </div>
            {validationErrors.newPassword && (
              <p className="mt-2 text-sm text-red-300">{validationErrors.newPassword}</p>
            )}
          </div>

          {/* Campo Confirmar Contraseña */}
          <div className="relative group">
            <label className="block text-sm font-medium text-blue-200 mb-2 group-focus-within:text-white transition-colors">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`relative w-full px-4 py-4 pr-12 bg-white/5 border-2 rounded-xl text-white placeholder-blue-300 backdrop-blur-sm focus:outline-none transition-all duration-300 ${
                  validationErrors.confirmPassword
                    ? 'border-red-400 focus:border-red-300'
                    : 'border-white/20 focus:border-university-gold hover:border-white/40'
                }`}
                placeholder="••••••••"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="w-5 h-5 text-blue-300 hover:text-white transition-colors" />
                ) : (
                  <EyeIcon className="w-5 h-5 text-blue-300 hover:text-white transition-colors" />
                )}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <p className="mt-2 text-sm text-red-300">{validationErrors.confirmPassword}</p>
            )}
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="relative w-full group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-university-gold to-yellow-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative py-4 px-6 flex items-center justify-center space-x-3 text-white font-semibold">
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Cambiando contraseña...</span>
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="w-5 h-5" />
                  <span>Cambiar Contraseña</span>
                </>
              )}
            </div>
          </button>

          {/* Enlaces de navegación */}
          <div className="text-center pt-4">
            <button 
              type="button"
              onClick={() => setStep('email')}
              className="inline-flex items-center space-x-2 text-sm text-university-gold hover:text-yellow-300 font-medium transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Cambiar correo electrónico</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  const renderSuccessStep = () => (
    <div className="relative group">
      {/* Efectos de fondo */}
      <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-purple-500 to-university-gold rounded-3xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-500"></div>
      
      {/* Formulario principal */}
      <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
        {/* Header del formulario */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            ¡Contraseña Cambiada!
          </h2>
          <p className="text-blue-200">
            Tu contraseña ha sido actualizada exitosamente
          </p>
        </div>

        {/* Mensaje de éxito */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-green-500/20 rounded-2xl blur-sm"></div>
          <div className="relative bg-green-500/10 border border-green-500/30 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-green-200 font-medium mb-2">Contraseña actualizada correctamente</p>
                <p className="text-green-300 text-sm">Ya puedes iniciar sesión con tu nueva contraseña</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botón para volver al login */}
        <Link
          to="/auth"
          className="relative w-full group overflow-hidden inline-block"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-university-blue to-blue-600 rounded-xl"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-university-gold to-yellow-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute inset-0 bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative py-4 px-6 flex items-center justify-center space-x-3 text-white font-semibold">
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Iniciar Sesión</span>
          </div>
        </Link>
      </div>
    </div>
  )

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

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        {/* Logo/Escudo de la universidad */}
        <div className="mb-8 z-20 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
              <img 
                src="/escudo.svg" 
                alt="Escudo Universidad" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">SISTEMA JURÍDICO</h1>
              <p className="text-sm text-blue-200">
                {/* Nombre responsivo */}
                <span className="hidden sm:inline">
                  Universidad Colegio Mayor de Cundinamarca
                </span>
                <span className="sm:hidden">
                  UCMC
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="max-w-md w-full">
          {step === 'email' && renderEmailStep()}
          {step === 'token' && renderTokenStep()}
          {step === 'success' && renderSuccessStep()}
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

export default ForgotPassword