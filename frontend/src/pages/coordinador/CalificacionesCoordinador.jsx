import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import axios from 'axios'
import {
  TrophyIcon,
  ChartBarIcon,
  StarIcon,
  CalendarIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

const CalificacionesCoordinador = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [calificaciones, setCalificaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtroEstudiante, setFiltroEstudiante] = useState('')
  const [filtroProfesor, setFiltroProfesor] = useState('')

  useEffect(() => {
    // Limpiar cualquier cache o estado previo relacionado con filtros
    setFiltroEstudiante('')
    setFiltroProfesor('')
    cargarCalificaciones()
  }, [])

  const cargarCalificaciones = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      
      console.log('🔄 [COORDINADOR] Cargando todas las calificaciones...')
      
      const response = await axios.get('/api/calificaciones', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        // Forzar parámetros vacíos para evitar cualquier propagación
        params: {}
      })
      
      console.log('✅ [COORDINADOR] Respuesta de calificaciones:', response.data)
      
      if (response.data.calificaciones) {
        setCalificaciones(response.data.calificaciones)
      } else if (Array.isArray(response.data)) {
        setCalificaciones(response.data)
      } else {
        setCalificaciones([])
      }
      
    } catch (error) {
      console.error('❌ [COORDINADOR] Error cargando calificaciones:', error)
      setError(error.response?.data?.error || 'Error al cargar calificaciones')
      setCalificaciones([])
    } finally {
      setLoading(false)
    }
  }

  const calcularEstadisticas = () => {
    if (calificaciones.length === 0) {
      return { total: 0, promedio: 0, excelentes: 0, estudiantesUnicos: 0 }
    }
    
    const suma = calificaciones.reduce((total, cal) => total + cal.promedio_general, 0)
    const promedio = suma / calificaciones.length
    const excelentes = calificaciones.filter(cal => cal.promedio_general >= 4.5).length
    const estudiantesUnicos = new Set(calificaciones.map(cal => cal.estudiante_id)).size
    
    return {
      total: calificaciones.length,
      promedio: promedio.toFixed(1),
      excelentes,
      estudiantesUnicos
    }
  }

  const calificacionesFiltradas = calificaciones.filter(cal => {
    const matchEstudiante = !filtroEstudiante || 
      (cal.estudiante && `${cal.estudiante.nombres} ${cal.estudiante.apellidos}`.toLowerCase().includes(filtroEstudiante.toLowerCase()))
    
    const matchProfesor = !filtroProfesor || 
      (cal.profesor_evaluador && `${cal.profesor_evaluador.nombres} ${cal.profesor_evaluador.apellidos}`.toLowerCase().includes(filtroProfesor.toLowerCase()))
    
    return matchEstudiante && matchProfesor
  })

  const getColorBadge = (promedio) => {
    if (promedio >= 4.5) return 'text-green-600 bg-green-100 border-green-200'
    if (promedio >= 3.5) return 'text-yellow-600 bg-yellow-100 border-yellow-200'
    return 'text-red-600 bg-red-100 border-red-200'
  }

  const estadisticas = calcularEstadisticas()

  if (!user || user.role !== 'coordinador') {
    return (
      <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Solo coordinadores pueden acceder a esta página
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 mb-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full">
                <TrophyIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  Gestión de Calificaciones
                </h1>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Panel de coordinador - Todas las evaluaciones del sistema
                </p>
              </div>
            </div>
            <button
              onClick={cargarCalificaciones}
              disabled={loading}
              className={`px-4 py-2 rounded-lg transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isDark
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 text-center`}>
            <div className="p-3 bg-purple-600 rounded-full w-fit mx-auto mb-3">
              <StarIcon className="h-6 w-6 text-white" />
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
              {estadisticas.total}
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Total Calificaciones
            </p>
          </div>

          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 text-center`}>
            <div className="p-3 bg-blue-600 rounded-full w-fit mx-auto mb-3">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
              {estadisticas.promedio}/5.0
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Promedio General
            </p>
          </div>

          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 text-center`}>
            <div className="p-3 bg-green-600 rounded-full w-fit mx-auto mb-3">
              <TrophyIcon className="h-6 w-6 text-white" />
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
              {estadisticas.excelentes}
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Calificaciones Excelentes
            </p>
          </div>

          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 text-center`}>
            <div className="p-3 bg-indigo-600 rounded-full w-fit mx-auto mb-3">
              <UserIcon className="h-6 w-6 text-white" />
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
              {estadisticas.estudiantesUnicos}
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Estudiantes Evaluados
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Filtrar por Estudiante
              </label>
              <input
                type="text"
                value={filtroEstudiante}
                onChange={(e) => setFiltroEstudiante(e.target.value)}
                placeholder="Buscar por nombre del estudiante..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Filtrar por Profesor
              </label>
              <input
                type="text"
                value={filtroProfesor}
                onChange={(e) => setFiltroProfesor(e.target.value)}
                placeholder="Buscar por nombre del profesor..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        {loading ? (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-8`}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Cargando calificaciones...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className={`${isDark ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200'} rounded-xl border p-6`}>
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                  Error al cargar calificaciones
                </h3>
                <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                  {error}
                </p>
              </div>
            </div>
            <button
              onClick={cargarCalificaciones}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : calificacionesFiltradas.length === 0 ? (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-8`}>
            <div className="text-center">
              <EyeIcon className={`h-16 w-16 mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                {calificaciones.length === 0 ? 'No hay calificaciones registradas' : 'No se encontraron calificaciones con los filtros aplicados'}
              </h3>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                {calificaciones.length === 0 
                  ? 'Las calificaciones aparecerán cuando los profesores evalúen el desempeño de los estudiantes.'
                  : 'Intenta ajustar los filtros para encontrar las calificaciones que buscas.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border`}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                Calificaciones Registradas ({calificacionesFiltradas.length})
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              {calificacionesFiltradas.map((calificacion) => (
                <div
                  key={calificacion.id}
                  className={`border rounded-lg p-6 ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}
                >
                  {/* Header de la calificación */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        calificacion.promedio_general >= 4.5 
                          ? isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'
                          : calificacion.promedio_general >= 3.5 
                            ? isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                            : isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'
                      }`}>
                        <span className="text-lg font-bold">
                          {calificacion.promedio_general.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                          Control Operativo #{calificacion.control_operativo_id}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          Estudiante: {calificacion.estudiante ? 
                            `${calificacion.estudiante.nombres} ${calificacion.estudiante.apellidos}` :
                            `ID ${calificacion.estudiante_id}`
                          }
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {calificacion.profesor_evaluador ? 
                            `Evaluado por: Prof. ${calificacion.profesor_evaluador.nombres} ${calificacion.profesor_evaluador.apellidos}` :
                            calificacion.coordinador_evaluador ?
                            `Evaluado por: Coord. ${calificacion.coordinador_evaluador.nombres} ${calificacion.coordinador_evaluador.apellidos}` :
                            'Evaluado por: Sistema'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getColorBadge(calificacion.promedio_general)}`}>
                        {calificacion.promedio_general >= 4.5 ? 'Excelente' :
                         calificacion.promedio_general >= 3.5 ? 'Bueno' :
                         'Necesita Mejorar'}
                      </div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                        <CalendarIcon className="h-3 w-3 inline mr-1" />
                        {new Date(calificacion.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Detalles de criterios */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="text-center">
                        <span className={`text-xl font-bold ${
                          calificacion.cumplimiento_horario >= 4 ? 'text-green-600' :
                          calificacion.cumplimiento_horario >= 3 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {calificacion.cumplimiento_horario}
                        </span>
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/5</span>
                        <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mt-1`}>
                          Cumplimiento
                        </p>
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="text-center">
                        <span className={`text-xl font-bold ${
                          calificacion.presentacion_personal >= 4 ? 'text-green-600' :
                          calificacion.presentacion_personal >= 3 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {calificacion.presentacion_personal}
                        </span>
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/5</span>
                        <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mt-1`}>
                          Presentación
                        </p>
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="text-center">
                        <span className={`text-xl font-bold ${
                          calificacion.conocimiento_juridico >= 4 ? 'text-green-600' :
                          calificacion.conocimiento_juridico >= 3 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {calificacion.conocimiento_juridico}
                        </span>
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/5</span>
                        <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mt-1`}>
                          Conocimiento
                        </p>
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="text-center">
                        <span className={`text-xl font-bold ${
                          calificacion.trabajo_equipo >= 4 ? 'text-green-600' :
                          calificacion.trabajo_equipo >= 3 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {calificacion.trabajo_equipo}
                        </span>
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/5</span>
                        <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mt-1`}>
                          Trabajo
                        </p>
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="text-center">
                        <span className={`text-xl font-bold ${
                          calificacion.atencion_usuario >= 4 ? 'text-green-600' :
                          calificacion.atencion_usuario >= 3 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {calificacion.atencion_usuario}
                        </span>
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/5</span>
                        <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mt-1`}>
                          Atención
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Observaciones */}
                  {calificacion.observaciones && (
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-blue-50'} border ${isDark ? 'border-gray-600' : 'border-blue-200'}`}>
                      <h4 className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                        Observaciones del Evaluador:
                      </h4>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {calificacion.observaciones}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CalificacionesCoordinador