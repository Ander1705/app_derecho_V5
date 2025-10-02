import { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import API_BASE_URL from '../../config/api'
import {
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  AcademicCapIcon,
  ScaleIcon,
  SparklesIcon,
  TrophyIcon,
  FireIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

const Estadisticas = () => {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [filtroMes, setFiltroMes] = useState('') // '' = todos los meses
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear())
  const [estadisticas, setEstadisticas] = useState({
    general: {
      totalControles: 0,
      estudiantesActivos: 0,
      profesoresActivos: 0,
      controlesPendientes: 0,
      controlesCompletos: 0
    },
    porArea: [],
    porMes: [],
    porCiudad: [],
    porResultado: [],
    resultadosPorArea: [], // Nueva sección para mostrar resultados por área
    tendencias: {
      controlEsteMe: 0,
      controlMesAnterior: 0,
      crecimiento: 0
    },
    profesoresTop: [],
    estudiantesTop: []
  })

  useEffect(() => {
    cargarEstadisticas()
  }, [filtroMes, filtroAno])

  const cargarEstadisticas = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Construir parámetros para el nuevo endpoint
      let url = `${API_BASE_URL}/coordinador/estadisticas-completas`
      const params = new URLSearchParams()
      
      if (filtroAno) {
        params.append('ano', filtroAno.toString())
      }
      if (filtroMes) {
        params.append('mes', filtroMes.toString())
      }
      
      if (params.toString()) {
        url += '?' + params.toString()
      }

      // Usar el nuevo endpoint de estadísticas completas
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = response.data || {}

      // Usar datos directamente del endpoint exhaustivo
      const general = {
        totalControles: data.general?.total_controles || 0,
        estudiantesActivos: data.general?.estudiantes_activos || 0,
        profesoresActivos: data.general?.profesores_activos || 0,
        controlesPendientes: data.general?.controles_pendientes || 0,
        controlesCompletos: data.general?.controles_completos || 0
      }

      // Estadísticas por área (ya procesadas por el backend)
      const porArea = data.por_area || []

      // Estadísticas por resultado (procesar desde resultados_por_area)
      const porResultado = []
      if (data.resultados_por_area && Array.isArray(data.resultados_por_area)) {
        // Sumar todos los tipos de resultado
        const totalResultados = {
          asesoria_consulta: 0,
          reparto: 0,
          auto_reparto: 0,
          solicitud_conciliacion: 0
        }

        data.resultados_por_area.forEach(area => {
          totalResultados.asesoria_consulta += area.asesoria_consulta || 0
          totalResultados.reparto += area.reparto || 0
          totalResultados.auto_reparto += area.auto_reparto || 0
          totalResultados.solicitud_conciliacion += area.solicitud_conciliacion || 0
        })

        // Convertir a formato requerido
        Object.entries(totalResultados).forEach(([resultado, cantidad]) => {
          if (cantidad > 0) {
            porResultado.push({ resultado, cantidad })
          }
        })
        porResultado.sort((a, b) => b.cantidad - a.cantidad)
      }

      // Estadísticas por ciudad (ya procesadas por el backend)
      const porCiudad = (data.por_ciudad || []).slice(0, 5)

      // Top profesores (ya procesados por el backend)
      const profesoresTop = (data.top_profesores || []).slice(0, 5)

      // Top estudiantes (ya procesados por el backend)
      const estudiantesTop = (data.top_estudiantes || []).slice(0, 5)

      // Calcular tendencias desde datos mensuales
      const tendenciasMensuales = data.tendencias_mensuales || []
      let controlEsteMe = 0
      let controlMesAnterior = 0
      
      if (tendenciasMensuales.length > 0) {
        // Mes actual (primer elemento, más reciente)
        controlEsteMe = tendenciasMensuales[0]?.cantidad || 0
        // Mes anterior (segundo elemento)
        controlMesAnterior = tendenciasMensuales[1]?.cantidad || 0
      }

      const crecimiento = controlMesAnterior > 0 
        ? ((controlEsteMe - controlMesAnterior) / controlMesAnterior * 100) 
        : 0

      const tendencias = {
        controlEsteMe,
        controlMesAnterior,
        crecimiento
      }

      // Procesar datos para el gráfico mensual
      const porMes = tendenciasMensuales.reverse() // Mostrar cronológicamente

      setEstadisticas({
        general,
        porArea,
        porMes,
        porCiudad,
        porResultado,
        tendencias,
        profesoresTop,
        estudiantesTop,
        resultadosPorArea: data.resultados_por_area || [] // Agregar nueva sección
      })

    } catch (error) {
      console.error('Error cargando estadísticas:', error)
      // En caso de error, mantener estadísticas vacías
      setEstadisticas({
        general: {
          totalControles: 0,
          estudiantesActivos: 0,
          profesoresActivos: 0,
          controlesPendientes: 0,
          controlesCompletos: 0
        },
        porArea: [],
        porMes: [],
        porCiudad: [],
        porResultado: [],
        tendencias: {
          controlEsteMe: 0,
          controlMesAnterior: 0,
          crecimiento: 0
        },
        profesoresTop: [],
        estudiantesTop: [],
        resultadosPorArea: []
      })
    } finally {
      setLoading(false)
    }
  }

  const getBarWidth = (value, max) => {
    return max > 0 ? (value / max) * 100 : 0
  }

  const getResultadoLabel = (resultado) => {
    const labels = {
      'asesoria_consulta': 'Asesoría/Consulta',
      'reparto': 'Reparto',
      'auto_reparto': 'Auto Reparto',
      'solicitud_conciliacion': 'Solicitud Conciliación'
    }
    return labels[resultado] || resultado
  }

  const meses = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ]

  const anosDisponibles = (() => {
    const anoActual = new Date().getFullYear()
    const anos = []
    for (let i = anoActual; i >= anoActual - 3; i--) {
      anos.push(i)
    }
    return anos
  })()

  const getMesLabel = (mes) => {
    const mesObj = meses.find(m => m.value === mes.toString())
    return mesObj ? mesObj.label : `Mes ${mes}`
  }

  if (loading) {
    return (
      <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-university-purple mx-auto"></div>
          <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Cargando estadísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-blue-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header Rediseñado */}
        <div className={`${isDark ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-700' : 'bg-gradient-to-r from-white to-blue-50 border-gray-200'} rounded-3xl shadow-xl border p-8 mb-8`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-purple-600 to-blue-600' : 'bg-gradient-to-br from-university-purple to-blue-600'}`}>
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                  Dashboard Ejecutivo
                </h1>
                <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Análisis completo del Consultorio Jurídico
                </p>
              </div>
            </div>
            <div className={`flex items-center space-x-3 px-6 py-3 rounded-2xl ${isDark ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-green-100 text-green-800 border border-green-200'}`}>
              <SparklesIcon className="h-6 w-6" />
              <span className="text-lg font-semibold">Sistema Activo</span>
            </div>
          </div>
        </div>

        {/* Filtros de Fecha */}
        <div className={`${isDark ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-gray-700' : 'bg-gradient-to-r from-white to-gray-50 border-gray-200'} rounded-2xl shadow-lg border p-6 mb-8`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <CalendarIcon className={`h-6 w-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                Filtros de Período
              </h3>
              {(filtroMes || filtroAno !== new Date().getFullYear()) && (
                <div className={`px-3 py-1 rounded-lg text-sm font-medium ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                  {filtroMes ? getMesLabel(filtroMes) : 'Todo el año'} {filtroAno}
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Mes:
                </label>
                <select
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  className={`px-3 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">Todos los meses</option>
                  {meses.map(mes => (
                    <option key={mes.value} value={mes.value}>{mes.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Año:
                </label>
                <select
                  value={filtroAno}
                  onChange={(e) => setFiltroAno(parseInt(e.target.value))}
                  className={`px-3 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  {anosDisponibles.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => {
                  setFiltroMes('')
                  setFiltroAno(new Date().getFullYear())
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${isDark ? 'bg-gray-600 hover:bg-gray-500 text-gray-100' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards Rediseñadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Total Controles */}
          <div className={`${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-br from-white to-blue-50 border-blue-200'} rounded-2xl shadow-lg border p-6 transform hover:scale-105 transition-all duration-300`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              <BoltIcon className={`h-5 w-5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
            </div>
            <div className={`text-3xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {estadisticas.general.totalControles}
            </div>
            <div className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Total Controles
            </div>
            <div className={`h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
              <div 
                className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: '100%' }}
              ></div>
            </div>
          </div>

          {/* Controles Completos */}
          <div className={`${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-br from-white to-green-50 border-green-200'} rounded-2xl shadow-lg border p-6 transform hover:scale-105 transition-all duration-300`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-green-500 to-green-600'}`}>
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
              <TrophyIcon className={`h-5 w-5 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
            </div>
            <div className={`text-3xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {estadisticas.general.controlesCompletos}
            </div>
            <div className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Casos Completados
            </div>
            <div className={`h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
              <div 
                className="h-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${estadisticas.general.totalControles > 0 ? (estadisticas.general.controlesCompletos / estadisticas.general.totalControles) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* Estudiantes Activos */}
          <div className={`${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-br from-white to-purple-50 border-purple-200'} rounded-2xl shadow-lg border p-6 transform hover:scale-105 transition-all duration-300`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-purple-500 to-purple-600'}`}>
                <AcademicCapIcon className="h-6 w-6 text-white" />
              </div>
              <FireIcon className={`h-5 w-5 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
            </div>
            <div className={`text-3xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {estadisticas.general.estudiantesActivos}
            </div>
            <div className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Estudiantes Activos
            </div>
            <div className={`h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
              <div 
                className="h-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min((estadisticas.general.estudiantesActivos / 20) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Profesores Activos */}
          <div className={`${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-br from-white to-orange-50 border-orange-200'} rounded-2xl shadow-lg border p-6 transform hover:scale-105 transition-all duration-300`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-orange-600 to-orange-700' : 'bg-gradient-to-br from-orange-500 to-orange-600'}`}>
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <SparklesIcon className={`h-5 w-5 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
            </div>
            <div className={`text-3xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {estadisticas.general.profesoresActivos}
            </div>
            <div className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Profesores Activos
            </div>
            <div className={`h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
              <div 
                className="h-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min((estadisticas.general.profesoresActivos / 10) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Panel de Rendimiento Ampliado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          
          {/* Tasa de Éxito Ampliada */}
          <div className={`${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-br from-white to-green-50 border-green-200'} rounded-3xl shadow-xl border p-8`}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} flex items-center`}>
                  <TrophyIcon className={`h-6 w-6 mr-3 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  Rendimiento del Sistema
                </h2>
                {filtroMes && (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                    {getMesLabel(filtroMes)} {filtroAno}
                  </p>
                )}
              </div>
            </div>
            
            <div className="text-center mb-8">
              <div className={`text-5xl font-bold mb-4 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                {estadisticas.general.totalControles > 0 ? Math.round((estadisticas.general.controlesCompletos / estadisticas.general.totalControles) * 100) : 0}%
              </div>
              <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                Tasa de Éxito Global
              </p>
              <div className={`h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden mb-6`}>
                <div 
                  className="h-4 bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-1500 ease-out"
                  style={{ width: `${estadisticas.general.totalControles > 0 ? (estadisticas.general.controlesCompletos / estadisticas.general.totalControles) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                  {estadisticas.general.controlesCompletos}
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Casos Completados
                </div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                  {estadisticas.general.controlesPendientes}
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Casos Pendientes
                </div>
              </div>
            </div>
          </div>

          {/* Tendencia de Crecimiento Ampliada */}
          <div className={`${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-br from-white to-blue-50 border-blue-200'} rounded-3xl shadow-xl border p-8`}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} flex items-center`}>
                  {estadisticas.tendencias.crecimiento >= 0 ? (
                    <ArrowTrendingUpIcon className={`h-6 w-6 mr-3 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
                  ) : (
                    <ArrowTrendingDownIcon className={`h-6 w-6 mr-3 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                  )}
                  Tendencias del Sistema
                </h2>
                {filtroMes && (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                    Comparativa mensual
                  </p>
                )}
              </div>
            </div>
            
            <div className="text-center mb-8">
              <div className={`text-5xl font-bold mb-4 ${estadisticas.tendencias.crecimiento >= 0 ? (isDark ? 'text-green-400' : 'text-green-500') : (isDark ? 'text-red-400' : 'text-red-500')}`}>
                {estadisticas.tendencias.crecimiento >= 0 ? '+' : ''}{estadisticas.tendencias.crecimiento.toFixed(1)}%
              </div>
              <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                Crecimiento vs. mes anterior
              </p>
              <div className={`h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden mb-6`}>
                <div 
                  className={`h-4 rounded-full transition-all duration-1500 ease-out ${estadisticas.tendencias.crecimiento >= 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}
                  style={{ width: `${Math.min(Math.abs(estadisticas.tendencias.crecimiento), 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                  {estadisticas.tendencias.controlEsteMe}
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Este Mes
                </div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                  {estadisticas.tendencias.controlMesAnterior}
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Mes Anterior
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resultados de Casos por Área Jurídica */}
        {estadisticas.resultadosPorArea && estadisticas.resultadosPorArea.length > 0 && (
          <div className={`${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'} rounded-3xl shadow-xl border p-8 mb-10`}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} flex items-center`}>
                  <ScaleIcon className={`h-6 w-6 mr-3 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  Resultados de Casos por Área Jurídica
                </h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                  Distribución detallada de tipos de resultado por cada área de práctica legal
                </p>
              </div>
              <div className={`px-4 py-2 rounded-xl ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                <span className="text-sm font-semibold">
                  {estadisticas.resultadosPorArea.reduce((acc, area) => acc + (area.total || 0), 0)} casos con resultado
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className={`w-full ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <thead>
                  <tr className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg`}>
                    <th className="px-6 py-4 text-left font-semibold">Área Jurídica</th>
                    <th className="px-4 py-4 text-center font-semibold">Asesoría/Consulta</th>
                    <th className="px-4 py-4 text-center font-semibold">Reparto</th>
                    <th className="px-4 py-4 text-center font-semibold">Auto Reparto</th>
                    <th className="px-4 py-4 text-center font-semibold">Conciliación</th>
                    <th className="px-6 py-4 text-center font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {estadisticas.resultadosPorArea.map((area, index) => (
                    <tr key={area.area} className={`${isDark ? 'hover:bg-gray-600/30' : 'hover:bg-gray-50'} transition-colors rounded-lg`}>
                      <td className="px-6 py-4 font-semibold">{area.area}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                          {area.asesoria_consulta || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                          {area.reparto || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                          {area.auto_reparto || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                          {area.solicitud_conciliacion || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                          {area.total || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rankings y Resultados */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Top Profesores */}
          <div className={`${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-br from-white to-blue-50 border-blue-200'} rounded-2xl shadow-lg border p-6`}>
            <h3 className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-6 flex items-center`}>
              <UserGroupIcon className={`h-6 w-6 mr-3 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              Top Profesores
            </h3>
            
            <div className="space-y-4">
              {estadisticas.profesoresTop.map((profesor, index) => {
                const maxCasos = Math.max(...estadisticas.profesoresTop.map(p => p.casos))
                const colors = ['bg-yellow-500', 'bg-gray-400', 'bg-orange-500', 'bg-blue-500', 'bg-purple-500']
                const bgColor = colors[index] || 'bg-gray-500'
                
                return (
                  <div key={profesor.nombre} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                          {index + 1}
                        </div>
                        <span className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'} truncate`}>
                          {profesor.nombre}
                        </span>
                      </div>
                      <span className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {profesor.casos}
                      </span>
                    </div>
                    <div className={`h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                      <div 
                        className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700"
                        style={{ width: `${getBarWidth(profesor.casos, maxCasos)}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Estudiantes */}
          <div className={`${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-br from-white to-purple-50 border-purple-200'} rounded-2xl shadow-lg border p-6`}>
            <h3 className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-6 flex items-center`}>
              <AcademicCapIcon className={`h-6 w-6 mr-3 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              Top Estudiantes
            </h3>
            
            <div className="space-y-4">
              {estadisticas.estudiantesTop.map((estudiante, index) => {
                const maxCasos = Math.max(...estadisticas.estudiantesTop.map(e => e.casos))
                const colors = ['bg-yellow-500', 'bg-gray-400', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500']
                const bgColor = colors[index] || 'bg-gray-500'
                
                return (
                  <div key={estudiante.nombre} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                          {index + 1}
                        </div>
                        <span className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'} truncate`}>
                          {estudiante.nombre}
                        </span>
                      </div>
                      <span className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {estudiante.casos}
                      </span>
                    </div>
                    <div className={`h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                      <div 
                        className="h-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-700"
                        style={{ width: `${getBarWidth(estudiante.casos, maxCasos)}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Resultados de Casos */}
          <div className={`${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600' : 'bg-gradient-to-br from-white to-green-50 border-green-200'} rounded-2xl shadow-lg border p-6`}>
            <div className="mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} flex items-center`}>
                <ScaleIcon className={`h-6 w-6 mr-3 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                Resultados de Casos
              </h3>
              {filtroMes && (
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                  {getMesLabel(filtroMes)} {filtroAno}
                </p>
              )}
            </div>
            
            <div className="space-y-4">
              {estadisticas.porResultado.map((resultado, index) => {
                const maxCantidad = Math.max(...estadisticas.porResultado.map(r => r.cantidad))
                const colors = [
                  { from: 'from-emerald-500', to: 'to-emerald-600', bg: 'bg-emerald-500' },
                  { from: 'from-cyan-500', to: 'to-cyan-600', bg: 'bg-cyan-500' },
                  { from: 'from-yellow-500', to: 'to-yellow-600', bg: 'bg-yellow-500' },
                  { from: 'from-rose-500', to: 'to-rose-600', bg: 'bg-rose-500' }
                ]
                const color = colors[index % colors.length]
                
                return (
                  <div key={resultado.resultado} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${color.bg} shadow-lg`}></div>
                        <span className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                          {getResultadoLabel(resultado.resultado)}
                        </span>
                      </div>
                      <span className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {resultado.cantidad}
                      </span>
                    </div>
                    <div className={`h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                      <div 
                        className={`h-2 bg-gradient-to-r ${color.from} ${color.to} rounded-full transition-all duration-700`}
                        style={{ width: `${getBarWidth(resultado.cantidad, maxCantidad)}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Estadisticas