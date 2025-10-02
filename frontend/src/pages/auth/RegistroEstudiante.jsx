import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { 
  UserIcon, 
  EyeIcon, 
  EyeSlashIcon,
  PhoneIcon,
  AcademicCapIcon,
  IdentificationIcon,
  EnvelopeIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

const RegistroEstudiante = () => {
  const navigate = useNavigate()
  const { registrarEstudianteManual, loading } = useAuth()
  const { isDark } = useTheme()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    tipo_documento: 'CC',
    numero_documento: '',
    nombres: '',
    apellidos: '',
    numero_celular: '',
    codigo_estudiantil: '',
    nombre_usuario: '',
    email: '',
    password: '',
    confirmPassword: '',
    sede: 'UPK Tintal'
  })

  const tiposDocumento = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'Cédula de Extranjería', label: 'Cédula de Extranjería' },
    { value: 'Pasaporte', label: 'Pasaporte' },
    { value: 'Permiso', label: 'Permiso' }
  ]

  const sedes = [
    'UPK Tintal',
    'Calle 34', 
    'Funza',
    'Fusagasugá',
    'Candelaria'
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError('❌ Las contraseñas no coinciden')
      setIsSubmitting(false)
      return
    }

    if (formData.password.length < 6) {
      setError('❌ La contraseña debe tener al menos 6 caracteres')
      setIsSubmitting(false)
      return
    }

    if (!formData.email.endsWith('@universidadmayor.edu.co')) {
      setError('❌ Debe usar un correo institucional (@universidadmayor.edu.co)')
      setIsSubmitting(false)
      return
    }

    // Enviar datos al backend
    const registroData = { ...formData }
    delete registroData.confirmPassword

    const result = await registrarEstudianteManual(registroData)
    
    if (result.success && result.requiresVerification) {
      navigate(`/verificar-email?email=${encodeURIComponent(result.email)}`)
    } else if (result.success) {
      // Fallback para registros que no requieren verificación
      navigate('/login', {
        state: { 
          message: '✅ Registro exitoso. Inicia sesión con tu nueva cuenta.',
          email: formData.email 
        }
      })
    } else {
      setError(result.error || '❌ Error en el registro')
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-violet-900 flex items-center justify-center px-4 py-4">
      <div className="w-full max-w-6xl">
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                <AcademicCapIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-white">
                  Registro de Estudiante
                </h1>
                <p className="text-purple-100">
                  Sistema Jurídico UCMC
                </p>
              </div>
            </div>
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3 text-sm text-purple-200">
              ℹ️ Completa todos los campos con tu información personal
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información de Documento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-purple-100 mb-2">
                  Tipo de Documento
                </label>
                <select
                  name="tipo_documento"
                  value={formData.tipo_documento}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  {tiposDocumento.map(tipo => (
                    <option key={tipo.value} value={tipo.value} className="bg-purple-900">
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-100 mb-2">
                  Número de Documento
                </label>
                <div className="relative">
                  <IdentificationIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                  <input
                    type="text"
                    name="numero_documento"
                    value={formData.numero_documento}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="1234567890"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Información Personal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-purple-100 mb-2">
                  Nombres Completos
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                  <input
                    type="text"
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="Juan Carlos"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-100 mb-2">
                  Apellidos Completos
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="Pérez Gómez"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contacto y Datos Académicos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-purple-100 mb-2">
                  Número de Celular
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                  <input
                    type="tel"
                    name="numero_celular"
                    value={formData.numero_celular}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="3001234567"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-100 mb-2">
                  Código Estudiantil
                </label>
                <div className="relative">
                  <AcademicCapIcon className="absolute left-3 top-4 w-5 h-5 text-purple-300" />
                  <input
                    type="number"
                    name="codigo_estudiantil"
                    value={formData.codigo_estudiantil}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="2025001"
                    min="1"
                    max="9999999999"
                    required
                  />
                  <p className="text-xs text-purple-200 mt-1">Solo números, hasta 10 dígitos (ej: 2025001)</p>
                </div>
              </div>
            </div>

            {/* Usuario y Email */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-purple-100 mb-2">
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                  <input
                    type="text"
                    name="nombre_usuario"
                    value={formData.nombre_usuario}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="juan.perez"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-100 mb-2">
                  Correo Institucional
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="nombre@universidadmayor.edu.co"
                    required
                  />
                </div>
                <p className="text-xs text-purple-300 mt-1">
                  Debe terminar en @universidadmayor.edu.co
                </p>
              </div>
            </div>

            {/* Sede */}
            <div>
              <label className="block text-sm font-medium text-purple-100 mb-2">
                Sede
              </label>
              <div className="relative">
                <BuildingOfficeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                <select
                  name="sede"
                  value={formData.sede}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  {sedes.map(sede => (
                    <option key={sede} value={sede} className="bg-purple-900">
                      {sede}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contraseñas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-purple-100 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="Mínimo 6 caracteres"
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
                <label className="block text-sm font-medium text-purple-100 mb-2">
                  Confirmar Contraseña
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="Repite la contraseña"
                  required
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex-1 bg-white/10 text-white py-3 px-6 rounded-xl font-medium hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200"
              >
                Volver al Login
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 text-white py-3 px-6 rounded-xl font-medium hover:from-purple-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                {isSubmitting ? 'Registrando...' : 'Crear Cuenta'}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-purple-200 text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-purple-300 hover:text-white font-medium transition-colors">
                Inicia sesión
              </Link>
            </p>
            <p className="text-purple-300 text-xs mt-2">
              ¿Eres profesor?{' '}
              <Link to="/registro/profesor" className="text-purple-300 hover:text-white font-medium transition-colors">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegistroEstudiante