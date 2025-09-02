import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  KeyIcon, 
  EyeIcon, 
  EyeSlashIcon,
  PhoneIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
const ValidacionEstudiante = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, loading, validarDatosPersonales, registroEstudiante } = useAuth()
  
  const [step, setStep] = useState('validacion') // 'validacion', 'registro', 'completado'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [estudiante, setEstudiante] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  
  // Datos personales del estudiante
  const [datosPersonales, setDatosPersonales] = useState({
    nombre: '',
    apellidos: '',
    documento_numero: ''
  })
  
  // Datos de registro
  const [registroData, setRegistroData] = useState({
    password: '',
    confirmPassword: '',
    telefono: ''
  })

  // Efectos para pre-llenar con URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const nombre = searchParams.get('nombre')
    const apellidos = searchParams.get('apellidos')
    const documento_numero = searchParams.get('documento_numero')

    if (nombre && apellidos && documento_numero) {
      setDatosPersonales({
        nombre: nombre,
        apellidos: apellidos,
        documento_numero: documento_numero
      })
      
      // Auto-validar si tenemos todos los datos
      validarDatosAutomaticamente(nombre, apellidos, documento_numero)
    }
  }, [location.search])

  const validarDatosAutomaticamente = async (nombre, apellidos, documento_numero) => {
    setIsSubmitting(true)
    setError('')

    const result = await validarDatosPersonales({ 
      nombre: nombre, 
      apellidos: apellidos, 
      documento_numero: documento_numero 
    })
    
    if (result.success && result.data.valido) {
      setEstudiante(result.data.estudiante)
      setStep('registro')
    } else {
      setError(result.data?.mensaje || result.error || '❌ Error validando datos del estudiante')
    }
    
    setIsSubmitting(false)
  }

  // Redirigir si ya está autenticado
  if (isAuthenticated && !loading) {
    navigate('/dashboard')
    return null
  }

  const handleRegistroChange = (e) => {
    const { name, value } = e.target
    setRegistroData(prev => ({
      ...prev,
      [name]: value
    }))
  }


  const handleRegistroSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    // Validar contraseñas
    if (registroData.password !== registroData.confirmPassword) {
      setError('❌ Las contraseñas no coinciden')
      setIsSubmitting(false)
      return
    }

    if (registroData.password.length < 3) {
      setError('❌ La contraseña debe tener al menos 3 caracteres')
      setIsSubmitting(false)
      return
    }

    const result = await registroEstudiante({
      codigo_estudiante: estudiante.codigo_estudiante,
      nombre: estudiante.nombre,
      apellidos: estudiante.apellidos,
      password: registroData.password,
      telefono: registroData.telefono
    })
    
    if (result.success) {
      console.log('✅ Registro exitoso, usuario autenticado:', result)
      setStep('completado')
      // Redirigir al dashboard ya que el usuario se autentica automáticamente
      setTimeout(() => {
        console.log('🔄 Redirigiendo al dashboard...')
        navigate('/dashboard')
      }, 3000)
    } else {
      console.error('❌ Error en registro:', result)
      setError(result.error || '❌ Error completando registro')
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-violet-900 flex items-center justify-center px-4 py-4">
      <div className="w-full max-w-4xl">
        {/* Glassmorphism Container */}
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                <ShieldCheckIcon className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-white">
                  Registro de Estudiante
                </h1>
                <p className="text-purple-100 text-sm">
                  Sistema Jurídico UCMC
                </p>
              </div>
            </div>
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-2 text-xs text-purple-200">
              ℹ️ {step === 'validacion' ? 'Validando tus datos personales...' : 'Completa el registro de tu cuenta'}
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'validacion' ? 'bg-purple-500 text-white' : 'bg-green-500 text-white'
              }`}>
                1
              </div>
              <div className={`w-6 h-1 ${
                step === 'registro' || step === 'completado' ? 'bg-green-500' : 'bg-white/20'
              }`}></div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'registro' ? 'bg-purple-500 text-white' : 
                step === 'completado' ? 'bg-green-500 text-white' : 'bg-white/20 text-white/60'
              }`}>
                2
              </div>
              <div className={`w-6 h-1 ${
                step === 'completado' ? 'bg-green-500' : 'bg-white/20'
              }`}></div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'completado' ? 'bg-green-500 text-white' : 'bg-white/20 text-white/60'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Validación automática */}
          {step === 'validacion' && (
            <div className="text-center py-8">
              <div className="mb-4">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Verificando tus datos...
              </h3>
              <p className="text-purple-200 text-sm mb-4">
                Estamos validando que te encuentres pre-registrado en el sistema
              </p>
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-200">
                📋 Validando: {datosPersonales.nombre} {datosPersonales.apellidos} - {datosPersonales.documento_numero}
              </div>
            </div>
          )}

          {/* Step 2: Registro */}
          {step === 'registro' && estudiante && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna izquierda: Información del estudiante */}
              <div className="space-y-4">
                <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
                  <div className="flex items-center mb-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                    <span className="text-green-200 font-semibold">Estudiante Validado</span>
                  </div>
                  <div className="space-y-3 text-white text-sm">
                    <div>
                      <p className="text-green-200 font-medium text-xs">Nombre Completo</p>
                      <p className="font-semibold">{estudiante.nombre} {estudiante.apellidos}</p>
                    </div>
                    <div>
                      <p className="text-green-200 font-medium text-xs">Código Estudiantil</p>
                      <p className="font-mono bg-green-500/20 px-2 py-1 rounded text-sm">{estudiante.codigo_estudiante}</p>
                    </div>
                    <div>
                      <p className="text-green-200 font-medium text-xs">Email Institucional</p>
                      <p className="text-xs">{estudiante.email_institucional}</p>
                    </div>
                    <div>
                      <p className="text-green-200 font-medium text-xs">Programa y Semestre</p>
                      <p className="text-sm">{estudiante.programa_academico} - Semestre {estudiante.semestre}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna derecha: Formulario de registro */}
              <div>
                <form onSubmit={handleRegistroSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-100 mb-1">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={registroData.password}
                        onChange={handleRegistroChange}
                        className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                        placeholder="Mínimo 3 caracteres"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-purple-100 mb-1">
                      Confirmar Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={registroData.confirmPassword}
                        onChange={handleRegistroChange}
                        className="w-full pl-4 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                        placeholder="Repite la contraseña"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-purple-100 mb-1">
                      Teléfono (Opcional)
                    </label>
                    <div className="relative">
                      <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                      <input
                        type="tel"
                        name="telefono"
                        value={registroData.telefono}
                        onChange={handleRegistroChange}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                        placeholder="3001234567"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="flex-1 bg-white/10 text-white py-2.5 px-4 rounded-xl font-medium hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200 text-sm"
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 text-white py-2.5 px-4 rounded-xl font-medium hover:from-purple-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg text-sm"
                    >
                      {isSubmitting ? 'Creando...' : 'Crear Cuenta'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Step 3: Completado */}
          {step === 'completado' && (
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <CheckCircleIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                ¡Registro Exitoso!
              </h2>
              <p className="text-purple-100 mb-4 text-base">
                Tu cuenta de estudiante ha sido creada correctamente.
              </p>
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-4">
                <p className="text-green-200 text-sm mb-2">
                  ✅ Ya puedes acceder a tu portal estudiantil
                </p>
                <p className="text-green-200 text-sm">
                  🎓 Tienes acceso completo a todas las funcionalidades
                </p>
              </div>
              <p className="text-purple-200 text-sm mb-4">
                Serás redirigido automáticamente en unos segundos...
              </p>
              <div className="flex justify-center space-x-3">
                <Link
                  to="/dashboard"
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white py-2.5 px-6 rounded-xl font-medium hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 shadow-lg text-sm"
                >
                  Ir a mi Portal ahora
                </Link>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 text-center">
            <p className="text-purple-200 text-xs">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-purple-300 hover:text-white font-medium transition-colors">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ValidacionEstudiante