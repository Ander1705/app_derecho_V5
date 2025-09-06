import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserIcon, AcademicCapIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

const RegisterSelector = () => {
  const [hoveredOption, setHoveredOption] = useState(null)

  const registerOptions = [
    {
      id: 'estudiante',
      title: 'Estudiante',
      description: 'Registro para estudiantes de la universidad',
      icon: AcademicCapIcon,
      route: '/registro-estudiante',
      gradient: 'from-green-500 to-emerald-600',
      hoverGradient: 'from-green-400 to-emerald-500'
    },
    {
      id: 'profesor',
      title: 'Profesor',
      description: 'Registro para profesores y docentes',
      icon: UserIcon,
      route: '/registro-profesor',
      gradient: 'from-blue-500 to-indigo-600',
      hoverGradient: 'from-blue-400 to-indigo-500'
    }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background con gradiente dinámico */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900">
        {/* Efectos de luz dinámica */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-university-gold rounded-full filter blur-3xl animate-pulse-ultra-slow"></div>
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-400 rounded-full filter blur-2xl animate-float-ultra-slow"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full">
          
          {/* Header */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-8">
              <div className="relative group">
                <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 opacity-20 blur-lg"></div>
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20"></div>
                  <img 
                    src="/escudo.svg" 
                    alt="Escudo UCMC" 
                    className="relative z-10 w-24 h-24 object-contain drop-shadow-2xl"
                  />
                </div>
              </div>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-university-gold leading-tight mb-4">
              REGISTRO
            </h1>
            <h2 className="text-2xl lg:text-3xl font-semibold text-blue-100 mb-6">
              Consultorio Jurídico UCMC
            </h2>
            <p className="text-lg text-blue-200/80 max-w-2xl mx-auto">
              Selecciona tu tipo de cuenta para comenzar el proceso de registro
            </p>
          </div>

          {/* Opciones de registro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {registerOptions.map((option) => {
              const IconComponent = option.icon
              const isHovered = hoveredOption === option.id

              return (
                <Link
                  key={option.id}
                  to={option.route}
                  onMouseEnter={() => setHoveredOption(option.id)}
                  onMouseLeave={() => setHoveredOption(null)}
                  className="group relative block"
                >
                  {/* Efectos de fondo */}
                  <div className={`absolute -inset-1 rounded-2xl blur-lg transition-all duration-500 ${
                    isHovered ? 'opacity-50' : 'opacity-20'
                  } bg-gradient-to-r ${isHovered ? option.hoverGradient : option.gradient}`}></div>
                  
                  {/* Card principal */}
                  <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-3xl">
                    {/* Icono */}
                    <div className="flex justify-center mb-6">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${option.gradient} flex items-center justify-center shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                        <IconComponent className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    
                    {/* Contenido */}
                    <div className="text-center space-y-4">
                      <h3 className="text-2xl font-bold text-white group-hover:text-university-gold transition-colors duration-300">
                        {option.title}
                      </h3>
                      <p className="text-blue-200 group-hover:text-blue-100 transition-colors duration-300">
                        {option.description}
                      </p>
                      
                      {/* Botón de acción */}
                      <div className="pt-4">
                        <div className={`inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r ${option.gradient} text-white font-semibold shadow-lg transform transition-all duration-300 group-hover:shadow-xl group-hover:scale-105`}>
                          <span>Registrarse como {option.title}</span>
                          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Enlaces adicionales */}
          <div className="text-center mt-12 space-y-4">
            <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3">
              <ShieldCheckIcon className="w-6 h-6 text-university-gold" />
              <span className="text-sm font-medium text-white">Registro seguro institucional</span>
            </div>
            
            <p className="text-sm text-blue-300">
              ¿Ya tienes una cuenta?{' '}
              <Link 
                to="/" 
                className="text-university-gold hover:text-yellow-300 font-medium transition-colors underline"
              >
                Iniciar sesión
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
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-20">
        <p className="text-blue-300/60 text-sm">
          © 2025 Universidad Colegio Mayor de Cundinamarca
        </p>
      </div>
    </div>
  )
}

export default RegisterSelector