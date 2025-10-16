import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { 
  ClipboardDocumentListIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SparklesIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

const DashboardProfesor = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [metricas, setMetricas] = useState({
    controlesAsignados: 0,
    controlesCompletados: 0,
    controlesPendientes: 0,
    estudiantesUnicos: 0
  })
  const [actividadReciente, setActividadReciente] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  const getTimeAgo = (dateString) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
  }

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 PROFESOR DASHBOARD: Iniciando carga de datos reales')
      
      // Obtener token de autenticación
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      
      if (!token) {
        console.error('❌ Sin token de autenticación')
        setError('No autenticado')
        window.location.href = '/login'
        return
      }

      console.log('🌐 PROFESOR: Llamando /api/profesor/controles-asignados')
      
      // Llamar al endpoint de controles asignados
      const response = await axios.get('/api/profesor/controles-asignados', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const controles = response.data || []
      console.log('✅ PROFESOR: Controles recibidos:', controles.length)
      
      if (!Array.isArray(controles)) {
        throw new Error('Respuesta inválida del servidor')
      }

      // Calcular métricas reales
      const controlesAsignados = controles.length
      const controlesCompletados = controles.filter(c => 
        c.estado_flujo === 'completo' || c.estado_flujo === 'con_resultado'
      ).length
      const controlesPendientes = controles.filter(c => 
        c.estado_flujo === 'pendiente_profesor' || !c.concepto_asesor
      ).length
      const estudiantesUnicos = [...new Set(
        controles.map(c => c.created_by_id || c.nombre_estudiante).filter(Boolean)
      )].length

      // Establecer métricas
      setMetricas({
        controlesAsignados,
        controlesCompletados,
        controlesPendientes,
        estudiantesUnicos
      })

      // Generar actividad reciente real
      const actividadReal = controles
        .sort((a, b) => new Date(b.created_at || b.updated_at) - new Date(a.created_at || a.updated_at))
        .slice(0, 5)
        .map(control => {
          const esPendiente = control.estado_flujo === 'pendiente_profesor'
          const esCompleto = control.estado_flujo === 'completo'
          
          return {
            id: `control_${control.id}`,
            tipo: esPendiente ? 'asignado' : (esCompleto ? 'completado' : 'asignado'),
            mensaje: `${esPendiente ? 'Pendiente' : 'Completado'}: ${control.nombre_consultante || 'Sin nombre'} - ${control.area_consulta || 'Sin área'}`,
            tiempo: getTimeAgo(control.created_at || control.updated_at),
            prioridad: esPendiente ? 'alta' : 'normal'
          }
        })

      // Agregar recordatorio si hay pendientes
      if (controlesPendientes > 0) {
        actividadReal.unshift({
          id: 'recordatorio',
          tipo: 'recordatorio',
          mensaje: `⚠️ Tienes ${controlesPendientes} controles pendientes de completar`,
          tiempo: 'Ahora',
          prioridad: 'alta'
        })
      }

      setActividadReciente(actividadReal)
      
      console.log('✅ PROFESOR DASHBOARD: Datos cargados exitosamente', {
        controlesAsignados,
        controlesCompletados,
        controlesPendientes,
        estudiantesUnicos
      })

    } catch (error) {
      console.error('❌ ERROR PROFESOR DASHBOARD:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      })
      
      setError(`Error: ${error.message}`)
      
      // Mostrar datos mínimos en caso de error
      setMetricas({
        controlesAsignados: 0,
        controlesCompletados: 0,
        controlesPendientes: 0,
        estudiantesUnicos: 0
      })
      
      setActividadReciente([{
        id: 'error',
        tipo: 'error',
        mensaje: `Error de conexión: ${error.message}`,
        tiempo: 'Ahora',
        prioridad: 'alta'
      }])
      
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (tipo) => {
    switch (tipo) {
      case 'asignado':
        return <ClipboardDocumentListIcon className="h-5 w-5 text-blue-500" />
      case 'completado':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'recordatorio':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Bienvenida */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 mb-6`}>
          <h1 className={`text-2xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
            Bienvenido, Prof. {user?.nombres || user?.nombre_usuario || 'Profesor'}
          </h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Panel de control académico
          </p>
          {error && (
            <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Principal */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Métricas */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-6 flex items-center`}>
                <ChartBarIcon className={`h-5 w-5 mr-2`} />
                Mis Métricas
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                    <ClipboardDocumentListIcon className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {metricas.controlesAsignados}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Controles Asignados
                  </div>
                </div>
                
                <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-green-50'}`}>
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
                    <CheckCircleIcon className={`h-6 w-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {metricas.controlesCompletados}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Completados
                  </div>
                </div>
                
                <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-orange-50'}`}>
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                    <ClockIcon className={`h-6 w-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {metricas.controlesPendientes}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Pendientes
                  </div>
                </div>
                
                <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-purple-50'}`}>
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                    <UserGroupIcon className={`h-6 w-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {metricas.estudiantesUnicos}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Estudiantes
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
                <Link
                  to="/controles-asignados"
                  className={`group rounded-xl p-5 border-2 transition-all duration-200 ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-gray-600' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'} hover:shadow-md`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-blue-900/30 group-hover:bg-blue-900/40' : 'bg-blue-100 group-hover:bg-blue-200'}`}>
                      <ClipboardDocumentListIcon className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} group-hover:text-blue-600`}>Ver Controles</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Controles asignados</p>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/calificaciones"
                  className={`group rounded-xl p-5 border-2 transition-all duration-200 ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-gray-600' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'} hover:shadow-md`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-green-900/30 group-hover:bg-green-900/40' : 'bg-green-100 group-hover:bg-green-200'}`}>
                      <AcademicCapIcon className={`h-6 w-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} group-hover:text-green-600`}>Calificaciones</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Gestionar calificaciones</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar Derecho */}
          <div className="space-y-6">
            
            {/* Actividad Reciente */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-4 flex items-center`}>
                <InformationCircleIcon className={`h-5 w-5 mr-2`} />
                Actividad Reciente
              </h2>
              
              <div className="space-y-4">
                {actividadReciente.length > 0 ? (
                  actividadReciente.map((actividad) => (
                    <div key={actividad.id} className={`flex items-start space-x-3 p-3 rounded-lg ${
                      actividad.prioridad === 'alta' ? 
                        (isDark ? 'bg-red-900/20' : 'bg-red-50') : 
                        (isDark ? 'bg-gray-700' : 'bg-gray-50')
                    }`}>
                      {getActivityIcon(actividad.tipo)}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                          {actividad.mensaje}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                          {actividad.tiempo}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <p className="text-sm">No hay actividad reciente</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Profesor */}
            <div className="bg-gradient-to-r from-university-purple to-purple-700 rounded-xl p-6 text-white">
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2" />
                Dashboard Profesor
              </h3>
              <p className="text-purple-100 text-sm mb-4">
                Gestiona tus controles operativos y calificaciones
              </p>
              <div className="text-sm">
                <p className="mb-1">📊 Métricas en tiempo real</p>
                <p className="mb-1">🎯 Datos desde base de datos</p>
                <p>✅ Sistema optimizado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardProfesor