import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { 
  ClipboardDocumentListIcon,
  PlusIcon,
  UserIcon,
  BookOpenIcon,
  CalendarIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

const DashboardEstudiante = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [progreso, setProgreso] = useState({
    misReportes: 0,
    ultimoReporte: null,
    estado: 'Activo'
  })
  const [recordatorios, setRecordatorios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      // Cargar estadísticas del estudiante
      const [estadisticasRes] = await Promise.all([
        axios.get('/api/auth/estudiante/estadisticas')
      ])
      
      setProgreso({
        misReportes: estadisticasRes.data.controles_creados || 0,
        ultimoReporte: estadisticasRes.data.fecha_registro ? 
          new Date(estadisticasRes.data.fecha_registro).toLocaleDateString('es-ES') : 'Sin reportes',
        estado: 'Activo'
      })
      
      // Recordatorios basados en datos reales
      const recordatoriosArray = []
      if (!user?.telefono) {
        recordatoriosArray.push({ id: 1, mensaje: 'Completa tu información de perfil - agrega un teléfono', tipo: 'info' })
      }
      if (estadisticasRes.data.controles_creados === 0) {
        recordatoriosArray.push({ id: 2, mensaje: 'Crea tu primer control operativo', tipo: 'tip' })
      }
      if (recordatoriosArray.length === 0) {
        recordatoriosArray.push({ id: 3, mensaje: 'Todo está al día. ¡Excelente trabajo!', tipo: 'tip' })
      }
      
      setRecordatorios(recordatoriosArray)
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error)
      // Datos por defecto en caso de error
      setProgreso({
        misReportes: 0,
        ultimoReporte: 'Sin reportes',
        estado: 'Activo'
      })
      setRecordatorios([
        { id: 1, mensaje: 'Error cargando datos. Intenta refrescar la página.', tipo: 'info' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getReminderIcon = (tipo) => {
    switch (tipo) {
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />
      case 'tip':
        return <SparklesIcon className="h-5 w-5 text-purple-500" />
      default:
        return <InformationCircleIcon className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
    }
  }

  if (loading) {
    return (
      <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-university-purple mx-auto"></div>
          <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Bienvenida */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 mb-6`}>
          <h1 className={`text-2xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
            Hola, {user?.nombre}
          </h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Tu espacio de consultoría jurídica
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Principal */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Mi Actividad */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-6`}>
                Mi Actividad
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Métrica: Mis Reportes */}
                <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                    <ClipboardDocumentListIcon className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {progreso.misReportes}
                  </div>
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Mis Reportes
                  </div>
                </div>
                
                {/* Métrica: Último Reporte */}
                <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-purple-50'}`}>
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                    <CalendarIcon className={`h-6 w-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div className={`text-sm font-semibold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {progreso.ultimoReporte}
                  </div>
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Último Reporte
                  </div>
                </div>
                
                {/* Métrica: Estado */}
                <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-green-50'}`}>
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
                    <CheckCircleIcon className={`h-6 w-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <div className={`text-sm font-semibold mb-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    {progreso.estado}
                  </div>
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Estado
                  </div>
                </div>
                
                {/* Métrica: Código */}
                <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-indigo-50'}`}>
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
                    <UserIcon className={`h-6 w-6 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  </div>
                  <div className={`text-sm font-semibold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {user?.codigo_estudiante || '#EST2025'}
                  </div>
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Código
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-6`}>
                Acciones Rápidas
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Acción: Nuevo Reporte */}
                <Link
                  to="/estudiante/control-operativo"
                  className={`group rounded-xl p-5 border-2 transition-all duration-200 ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-gray-600' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'} hover:shadow-md`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-blue-900/30 group-hover:bg-blue-900/40' : 'bg-blue-100 group-hover:bg-blue-200'}`}>
                      <PlusIcon className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} group-hover:text-blue-600`}>Nuevo Reporte</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Crear control operativo</p>
                    </div>
                  </div>
                </Link>

                {/* Acción: Ver Mis Reportes */}
                <Link
                  to="/estudiante/mis-reportes"
                  className={`group rounded-xl p-5 border-2 transition-all duration-200 ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-gray-600' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'} hover:shadow-md`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-green-900/30 group-hover:bg-green-900/40' : 'bg-green-100 group-hover:bg-green-200'}`}>
                      <ClipboardDocumentListIcon className={`h-6 w-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} group-hover:text-green-600`}>Ver Mis Reportes</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Historial de controles</p>
                    </div>
                  </div>
                </Link>

                {/* Acción: Mi Perfil */}
                <Link
                  to="/perfil"
                  className={`group rounded-xl p-5 border-2 transition-all duration-200 ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-gray-600' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'} hover:shadow-md`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-purple-900/30 group-hover:bg-purple-900/40' : 'bg-purple-100 group-hover:bg-purple-200'}`}>
                      <UserIcon className={`h-6 w-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} group-hover:text-purple-600`}>Mi Perfil</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Configurar cuenta</p>
                    </div>
                  </div>
                </Link>

                {/* Acción: Ayuda */}
                <Link
                  to="/guias"
                  className={`group rounded-xl p-5 border-2 transition-all duration-200 ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-gray-600' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'} hover:shadow-md`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-orange-900/30 group-hover:bg-orange-900/40' : 'bg-orange-100 group-hover:bg-orange-200'}`}>
                      <BookOpenIcon className={`h-6 w-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} group-hover:text-orange-600`}>Ayuda</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Soporte y guías</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar Derecho */}
          <div className="space-y-6">
            
            {/* Recordatorios */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className="text-xl font-semibold text-theme-primary mb-4 flex items-center">
                <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-500" />
                Recordatorios
              </h2>
              
              <div className="space-y-4">
                {recordatorios.map((recordatorio) => (
                  <div key={recordatorio.id} className={`flex items-start space-x-3 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    {getReminderIcon(recordatorio.tipo)}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{recordatorio.mensaje}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Información Personal */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-4`}>
                Mi Información
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Programa</span>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Derecho</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Semestre</span>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{user?.semestre || '6°'}</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Estado</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}>
                    ✅ Activo
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Universidad</span>
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>UCMC</span>
                </div>
              </div>
              
              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <Link
                  to="/perfil"
                  className="text-sm text-university-purple hover:text-purple-700 font-medium"
                >
                  Actualizar información →
                </Link>
              </div>
            </div>

            {/* Acceso Rápido */}
            <div className="bg-gradient-to-r from-university-purple to-purple-700 rounded-xl p-6 text-white">
              <h3 className="font-semibold text-lg mb-2">¿Necesitas ayuda?</h3>
              <p className="text-purple-100 text-sm mb-4">
                Consulta nuestras guías o contacta con el coordinador
              </p>
              <Link
                to="/soporte"
                className="inline-flex items-center px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 "
              >
                📞 Obtener Ayuda
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardEstudiante