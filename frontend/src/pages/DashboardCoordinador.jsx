import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../config/api'
import { 
  UserGroupIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TagIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

const DashboardCoordinador = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  
  // ✅ Estado inicializado con datos por defecto para evitar pantalla en blanco
  const [metricas, setMetricas] = useState({
    estudiantesRegistrados: 0,
    profesoresRegistrados: 0,
    controlesPendientes: 0,
    totalReportes: 0
  })
  const [loading, setLoading] = useState(true)
  
  const [actividadReciente, setActividadReciente] = useState([
    {
      id: 'default_1',
      tipo: 'completado',
      mensaje: 'Sistema inicializado correctamente',
      tiempo: new Date().toLocaleDateString('es-ES')
    }
  ])
  
  const [areasConsulta, setAreasConsulta] = useState([
    { area: 'Laboral', cantidad: 7, color: 'blue' },
    { area: 'Civil', cantidad: 5, color: 'green' },
    { area: 'Penal', cantidad: 6, color: 'red' },
    { area: 'Comercial', cantidad: 4, color: 'purple' },
    { area: 'Familia', cantidad: 4, color: 'orange' }
  ])

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      console.log('🔄 Cargando datos REALES del dashboard coordinador...')
      
      const token = localStorage.getItem('token')
      
      // 🎯 CARGAR ESTADÍSTICAS REALES DEL ENDPOINT ESPECÍFICO
      
      // 1. Obtener estadísticas del coordinador (incluye todas las métricas)
      const estadisticasResponse = await axios.get(`${API_BASE_URL}/coordinador/estadisticas`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const estadisticas = estadisticasResponse.data || {}
      console.log('📊 Estadísticas recibidas del backend:', estadisticas)
      
      // 2. Obtener controles para actividad reciente y áreas de consulta
      const controlesResponse = await axios.get(`${API_BASE_URL}/coordinador/controles-completos`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const controles = controlesResponse.data || []
      console.log('📋 Controles recibidos del backend:', controles.length, 'controles')
      
      // 3. Usar estadísticas reales del backend
      const estudiantesRegistrados = estadisticas.estudiantes_registrados || 0
      const profesoresRegistrados = estadisticas.profesores_registrados || 0
      const controlesPendientes = estadisticas.controles_pendientes || 0
      const totalReportes = estadisticas.total_controles || 0
      
      // 4. Calcular áreas de consulta reales
      const areasCount = {}
      controles.forEach(control => {
        const area = control.area_consulta || 'Sin especificar'
        areasCount[area] = (areasCount[area] || 0) + 1
      })
      
      const colores = ['blue', 'green', 'red', 'purple', 'orange', 'indigo', 'pink']
      const areasConsultaReales = Object.entries(areasCount)
        .map(([area, cantidad], index) => ({
          area,
          cantidad,
          color: colores[index % colores.length]
        }))
        .sort((a, b) => b.cantidad - a.cantidad)
      
      // 5. Generar actividad reciente real
      const actividadReal = controles
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3)
        .map(control => ({
          id: `control_${control.id}`,
          tipo: control.estado_flujo === 'con_resultado' ? 'completado' : 'reporte',
          mensaje: `${control.nombre_consultante || 'Consultante'} - ${control.area_consulta || 'Sin área'}`,
          tiempo: new Date(control.created_at).toLocaleDateString('es-ES')
        }))
      
      // 6. Actualizar estados
      setMetricas({
        estudiantesRegistrados,
        profesoresRegistrados,
        controlesPendientes,
        totalReportes
      })
      
      setAreasConsulta(areasConsultaReales)
      setActividadReciente(actividadReal.length > 0 ? actividadReal : [{
        id: 'empty_1',
        tipo: 'completado',
        mensaje: 'Sistema funcionando correctamente',
        tiempo: new Date().toLocaleDateString('es-ES')
      }])
      
      console.log('✅ Datos REALES cargados:', {
        estudiantes: estudiantesRegistrados,
        profesores: profesoresRegistrados, 
        pendientes: controlesPendientes,
        total: totalReportes,
        areas: areasConsultaReales.length
      })
      
    } catch (error) {
      console.error('❌ Error al cargar datos reales:', error)
      
      // Fallback con datos básicos
      setMetricas({
        estudiantesRegistrados: 0,
        profesoresRegistrados: 0,
        controlesPendientes: 0,
        totalReportes: 0
      })
      setActividadReciente([{
        id: 'error_1',
        tipo: 'completado',
        mensaje: 'Error cargando datos - Verificar conexión',
        tiempo: new Date().toLocaleDateString('es-ES')
      }])
      setAreasConsulta([])
    } finally {
      setLoading(false)
    }
  }

  const getAreaColors = (color) => {
    const colors = {
      blue: isDark ? 'bg-blue-900/30 text-blue-400 border-blue-800 hover:bg-blue-900/40' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      green: isDark ? 'bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/40' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
      red: isDark ? 'bg-red-900/30 text-red-400 border-red-800 hover:bg-red-900/40' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
      purple: isDark ? 'bg-purple-900/30 text-purple-400 border-purple-800 hover:bg-purple-900/40' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
      orange: isDark ? 'bg-orange-900/30 text-orange-400 border-orange-800 hover:bg-orange-900/40' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
      indigo: isDark ? 'bg-indigo-900/30 text-indigo-400 border-indigo-800 hover:bg-indigo-900/40' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
      pink: isDark ? 'bg-pink-900/30 text-pink-400 border-pink-800 hover:bg-pink-900/40' : 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100'
    }
    return colors[color] || colors.blue
  }

  const getActivityIcon = (tipo) => {
    switch (tipo) {
      case 'registro':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'reporte':
        return <ClipboardDocumentListIcon className="h-5 w-5 text-blue-500" />
      case 'completado':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'pendiente':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }


  // ✅ Verificación de seguridad: no renderizar sin usuario
  if (!user) {
    return (
      <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Cargando perfil...</p>
        </div>
      </div>
    )
  }

  // ✅ Estado de carga de datos
  if (loading) {
    return (
      <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Cargando datos del dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Banner de Nuevas Funcionalidades */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-white bg-opacity-20' : 'bg-purple-100'}`}>
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">🎉 ¡Nuevas Funcionalidades Disponibles!</h2>
                <p className="text-purple-100">Sistema de calificaciones, evaluaciones y más herramientas para coordinadores</p>
              </div>
            </div>
            <Link
              to="/calificaciones-intro"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? 'bg-gray-100 text-purple-700 hover:bg-gray-200' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
            >
              Ver Detalles
            </Link>
          </div>
        </div>

        {/* Bienvenida */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 mb-6`}>
          <h1 className={`text-2xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
            Bienvenido, {user?.nombres} {user?.apellidos}
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
                <Link 
                  to="/gestion-usuarios?role=estudiante"
                  className={`block text-center p-4 rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer ${isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-blue-50 hover:bg-blue-100'}`}
                >
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
                </Link>
                
                {/* Métrica: Profesores Registrados */}
                <Link 
                  to="/gestion-usuarios?role=profesor"
                  className={`block text-center p-4 rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer ${isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-green-50 hover:bg-green-100'}`}
                >
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
                    <UserGroupIcon className={`h-6 w-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {metricas.profesoresRegistrados}
                  </div>
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Profesores
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Registrados
                  </div>
                </Link>
                
                {/* Métrica: Controles Pendientes */}
                <Link 
                  to="/control-operativo?estado=pendiente"
                  className={`block text-center p-4 rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer ${isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-orange-50 hover:bg-orange-100'}`}
                >
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                    <ClockIcon className={`h-6 w-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {metricas.controlesPendientes}
                  </div>
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Pendientes
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Sin Resultado
                  </div>
                </Link>
                
                {/* Métrica: Total Reportes */}
                <Link 
                  to="/control-operativo"
                  className={`block text-center p-4 rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer ${isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-purple-50 hover:bg-purple-100'}`}
                >
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                    <DocumentTextIcon className={`h-6 w-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {metricas.totalReportes}
                  </div>
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Total Reportes
                  </div>
                </Link>
              </div>
            </div>

            {/* Acciones */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-6`}>
                Acciones
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Acción: Crear Respaldo */}
                <Link
                  to="/backup-sistema"
                  className={`group rounded-xl p-5 border-2 transition-all duration-200 ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-gray-600' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'} hover:shadow-md`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-blue-900/30 group-hover:bg-blue-900/40' : 'bg-blue-100 group-hover:bg-blue-200'}`}>
                      <PlusIcon className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} group-hover:text-blue-600`}>Crear Respaldo</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Respaldar datos del sistema</p>
                    </div>
                  </div>
                </Link>

                {/* Acción: Estadísticas */}
                <Link
                  to="/estadisticas"
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

                {/* Acción: Gestión de Usuarios */}
                <Link
                  to="/gestion-usuarios"
                  className={`group rounded-xl p-5 border-2 transition-all duration-200 ${isDark ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-gray-600' : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'} hover:shadow-md`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-purple-900/30 group-hover:bg-purple-900/40' : 'bg-purple-100 group-hover:bg-purple-200'}`}>
                      <UserGroupIcon className={`h-6 w-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} group-hover:text-purple-600`}>Gestión de Usuarios</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Administrar estudiantes y profesores</p>
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

            {/* Áreas de Consulta */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-6 flex items-center`}>
                <TagIcon className={`h-5 w-5 mr-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
                Áreas de Consulta
              </h2>
              
              <div className="space-y-3">
                {areasConsulta.length > 0 ? (
                  areasConsulta.map((area, index) => (
                    <Link
                      key={index}
                      to={`/control-operativo?area=${encodeURIComponent(area.area)}`}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${getAreaColors(area.color)}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full bg-current opacity-60`}></div>
                        <span className="font-medium">{area.area}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${isDark ? 'bg-white bg-opacity-20 text-white' : 'bg-white bg-opacity-60 text-gray-800'}`}>
                          {area.cantidad}
                        </span>
                        <ArrowRightIcon className="h-4 w-4 opacity-60" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <TagIcon className={`h-12 w-12 ${isDark ? 'text-gray-500' : 'text-gray-400'} mx-auto mb-3`} />
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>No hay datos de áreas de consulta</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Las áreas aparecerán cuando haya controles operativos registrados</p>
                  </div>
                )}
              </div>
              
              <div className={`mt-6 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} text-center`}>
                <Link
                  to="/control-operativo"
                  className="text-sm text-university-purple hover:text-purple-700 font-medium"
                >
                  Ver todos los controles operativos →
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