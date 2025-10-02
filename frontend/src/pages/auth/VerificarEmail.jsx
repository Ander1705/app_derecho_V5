import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { 
  EnvelopeIcon, 
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useTheme } from '../../contexts/ThemeContext'

const VerificarEmail = () => {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', ''])

  // Si no hay email en la URL, redirigir al login
  useEffect(() => {
    if (!email) {
      navigate('/login')
    }
  }, [email, navigate])

  const handleCodeChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...verificationCode]
      newCode[index] = value
      setVerificationCode(newCode)

      // Auto-focus al siguiente input
      if (value && index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`)
        if (nextInput) nextInput.focus()
      }
    }
  }

  const handleKeyDown = (index, e) => {
    // Permitir backspace para ir al input anterior
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text')
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('')
    
    const newCode = [...verificationCode]
    digits.forEach((digit, index) => {
      if (index < 6) newCode[index] = digit
    })
    setVerificationCode(newCode)

    // Focus en el último input lleno o el primero vacío
    const lastFilledIndex = Math.min(digits.length - 1, 5)
    const targetInput = document.getElementById(`code-${lastFilledIndex}`)
    if (targetInput) targetInput.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const code = verificationCode.join('')
    if (code.length !== 6) {
      setError('Por favor ingresa el código completo de 6 dígitos')
      return
    }

    setIsSubmitting(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/verificar-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setMessage('¡Email verificado exitosamente! Redirigiendo al login...')
        setTimeout(() => {
          navigate('/login', { state: { message: 'Email verificado. Ya puedes iniciar sesión.' } })
        }, 3000)
      } else {
        setError(data.error || 'Error al verificar el código')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error de conexión. Por favor intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    setIsResending(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/reenviar-codigo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Código reenviado exitosamente. Revisa tu correo.')
        setVerificationCode(['', '', '', '', '', ''])
      } else {
        setError(data.error || 'Error al reenviar el código')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error de conexión. Por favor intenta nuevamente.')
    } finally {
      setIsResending(false)
    }
  }

  if (!email) {
    return null
  }

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${isDark ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      <div className="max-w-md w-full space-y-8">
        <div className={`rounded-xl shadow-lg p-8 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
          <div className="text-center">
            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${isDark ? 'bg-blue-900/20' : 'bg-blue-100'}`}>
              {success ? (
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              ) : (
                <EnvelopeIcon className={`h-8 w-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              )}
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              Verificar Correo Electrónico
            </h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Hemos enviado un código de verificación de 6 dígitos a:
              <br />
              <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{email}</span>
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <CheckCircleIcon className="h-12 w-12 text-green-500" />
              </div>
              <p className="text-green-600 font-medium mb-4">{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Código de Verificación
                </label>
                <div className="flex justify-center space-x-2">
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      className={`w-12 h-12 text-center text-lg font-bold border-2 rounded-lg focus:outline-none transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-400' : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}`}
                      autoComplete="off"
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className={`flex items-center space-x-2 text-red-600 text-sm p-3 rounded-lg ${isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50'}`}>
                  <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {message && !success && (
                <div className={`flex items-center space-x-2 text-green-600 text-sm p-3 rounded-lg ${isDark ? 'bg-green-900/20 border border-green-800' : 'bg-green-50'}`}>
                  <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isSubmitting || verificationCode.join('').length !== 6}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    isSubmitting || verificationCode.join('').length !== 6
                      ? 'bg-gray-400 cursor-not-allowed'
                      : isDark 
                        ? 'bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400' 
                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  } transition-colors`}
                >
                  {isSubmitting ? (
                    <>
                      <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar Código'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className={`w-full flex justify-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium transition-colors ${
                    isResending
                      ? 'bg-gray-100 cursor-not-allowed text-gray-400'
                      : isDark
                        ? 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {isResending ? (
                    <>
                      <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Reenviando...
                    </>
                  ) : (
                    'Reenviar Código'
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              ¿Problemas con la verificación?{' '}
              <Link 
                to="/login" 
                className={`font-medium transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
              >
                Volver al login
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              El código expira en 15 minutos
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Universidad Colegio Mayor de Cundinamarca
            <br />
            Consultorio Jurídico
          </p>
        </div>
      </div>
    </div>
  )
}

export default VerificarEmail