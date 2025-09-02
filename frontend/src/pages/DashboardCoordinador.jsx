import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { 
  UserGroupIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

const DashboardCoordinador = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [metricas, setMetricas] = useState({
    estudiantesRegistrados: 0,
    reportesEsteMes: 0,
    estudiantesPendientes: 0,
    totalReportes: 0
  })
  const [actividadReciente, setActividadReciente] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      console.log('🔄 Cargando datos del dashboard coordinador...')
      
      // Cargar métricas del coordinador
      const [metricasRes, actividadRes] = await Promise.all([
        axios.get('/api/auth/coordinador/metricas'),
        axios.get('/api/auth/coordinador/actividad-reciente')
      ])
      
      console.log('✅ Métricas cargadas:', metricasRes.data)
      console.log('✅ Actividad cargada:', actividadRes.data)
      
      setMetricas(metricasRes.data)
      setActividadReciente(actividadRes.data)
    } catch (error) {
      console.error('❌ Error cargando datos del dashboard:', error)
      console.error('❌ Error detalle:', error.response?.data)
      
      // Intentar cargar datos básicos de la base de datos
      try {
        const [estudiantesRes, controlesRes] = await Promise.all([
          axios.get('/api/auth/coordinador/estudiantes'),
          axios.get('/api/control-operativo/list')
        ])
        
        const estudiantes = estudiantesRes.data || []
        const controles = controlesRes.data || []
        
        // Calcular métricas básicas
        const estudiantesRegistrados = estudiantes.filter(e => e.estado === 'REGISTRADO').length
        const estudiantesPendientes = estudiantes.filter(e => e.estado === 'VALIDADO').length
        
        // Calcular reportes de este mes
        const fechaActual = new Date()
        const inicioMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1)
        const reportesEsteMes = controles.filter(c => {
          const fechaCreacion = new Date(c.created_at)
          return fechaCreacion >= inicioMes
        }).length
        
        setMetricas({
          estudiantesRegistrados,
          reportesEsteMes,
          estudiantesPendientes,
          totalReportes: controles.length
        })
        
        // Generar actividad reciente básica
        const actividadReciente = controles
          .slice(0, 5)
          .map((control, index) => ({
            id: `control_${control.id}`,
            tipo: 'reporte',
            mensaje: `Nuevo control operativo: ${control.nombre_consultante}`,
            tiempo: `Hace ${index + 1} día${index > 0 ? 's' : ''}`
          }))
        
        setActividadReciente(actividadReciente)
        
        console.log('✅ Datos básicos cargados exitosamente')
      } catch (fallbackError) {
        console.error('❌ Error cargando datos de respaldo:', fallbackError)
        // Datos mínimos como último recurso
        setMetricas({
          estudiantesRegistrados: 0,
          reportesEsteMes: 0,
          estudiantesPendientes: 0,
          totalReportes: 0
        })
        setActividadReciente([])
      }
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (tipo) => {
    switch (tipo) {
      case 'registro':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'reporte':
        return <ClipboardDocumentListIcon className="h-5 w-5 text-blue-500" />
      case 'pendiente':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
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
            Bienvenido, {user?.nombre}
          </h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Panel de control - Consultorio Jurídico
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Principal */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Métricas */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-6 flex items-center`}>
                <ChartBarIcon className={`h-5 w-5 mr-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
                Métricas
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Métrica: Estudiantes Registrados */}
                <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                    <UserGroupIcon className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {metricas.estudiantesRegistrados}
                  </div>
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Estudiantes
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Registrados
                  </div>
                </div>
                
                {/* Métrica: Reportes Este Mes */}
                <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-green-50'}`}>
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
                    <ClipboardDocumentListIcon className={`h-6 w-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {metricas.reportesEsteMes}
                  </div>
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Reportes
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Este Mes
                  </div>
                </div>
                
                {/* Métrica: Estudiantes Pendientes */}
                <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-orange-50'}`}>
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                    <ExclamationTriangleIcon className={`h-6 w-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {metricas.estudiantesPendientes}
                  </div>
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Pendientes
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Registro
                  </div>
                </div>
                
                {/* Métrica: Total Reportes */}
                <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-purple-50'}`}>
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                    <DocumentTextIcon className={`h-6 w-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {metricas.totalReportes}
                  </div>
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Total Reportes
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-6`}>
                Acciones
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Acción: Registrar Estudiante */}
                <Link
                  to="/gestion-estudiantes"
                  className={`group rounded-xl p-5 border-2 transition-all duration-200 ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-gray-600' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'} hover:shadow-md`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-blue-900/30 group-hover:bg-blue-900/40' : 'bg-blue-100 group-hover:bg-blue-200'}`}>
                      <PlusIcon className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} group-hover:text-blue-600`}>Registrar Estudiante</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Agregar nuevos estudiantes al sistema</p>
                    </div>
                  </div>
                </Link>

                {/* Acción: Estadísticas */}
                <Link
                  to="/control-operativo"
                  className={`group rounded-xl p-5 border-2 transition-all duration-200 ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-gray-600' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'} hover:shadow-md`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-green-900/30 group-hover:bg-green-900/40' : 'bg-green-100 group-hover:bg-green-200'}`}>
                      <ChartBarIcon className={`h-6 w-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} group-hover:text-green-600`}>Estadísticas</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Analíticas y reportes del sistema</p>
                    </div>
                  </div>
                </Link>

                {/* Acción: Gestionar Estudiantes */}
                <Link
                  to="/gestion-estudiantes"
                  className={`group rounded-xl p-5 border-2 transition-all duration-200 ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-gray-600' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'} hover:shadow-md`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-purple-900/30 group-hover:bg-purple-900/40' : 'bg-purple-100 group-hover:bg-purple-200'}`}>
                      <UserGroupIcon className={`h-6 w-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} group-hover:text-purple-600`}>Gestionar Estudiantes</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Administrar y editar estudiantes</p>
                    </div>
                  </div>
                </Link>

                {/* Acción: Ver Reportes */}
                <Link
                  to="/control-operativo"
                  className={`group rounded-xl p-5 border-2 transition-all duration-200 ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-gray-600' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'} hover:shadow-md`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-orange-900/30 group-hover:bg-orange-900/40' : 'bg-orange-100 group-hover:bg-orange-200'}`}>
                      <ClipboardDocumentListIcon className={`h-6 w-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} group-hover:text-orange-600`}>Ver Reportes</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Revisar controles operativos</p>
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
                <ClockIcon className={`h-5 w-5 mr-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
                Actividad Reciente
              </h2>
              
              <div className="space-y-4">
                {actividadReciente.length > 0 ? (
                  actividadReciente.map((actividad) => (
                    <div key={actividad.id} className={`flex items-start space-x-3 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      {getActivityIcon(actividad.tipo)}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{actividad.mensaje}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{actividad.tiempo}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <ClockIcon className={`h-12 w-12 ${isDark ? 'text-gray-500' : 'text-gray-400'} mx-auto mb-3`} />
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>No hay actividad reciente</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>La actividad aparecerá aquí cuando haya estudiantes registrados o reportes creados</p>
                  </div>
                )}
              </div>
              
              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <Link
                  to="/actividad"
                  className="text-sm text-university-purple hover:text-purple-700 font-medium"
                >
                  Ver toda la actividad →
                </Link>
              </div>
            </div>

            {/* Resumen del Sistema */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-4`}>
                Resumen del Sistema
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Estado del Sistema</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}>
                    ✅ Operativo
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Tu Rol</span>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Coordinador</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Última Sesión</span>
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Hoy</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Versión</span>
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>v2.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardCoordinador