import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../../config/api'
import {
  TrophyIcon,
  ChartBarIcon,
  StarIcon,
  CalendarIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'

const MisCalificaciones = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [calificaciones, setCalificaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarCalificaciones()
  }, [])

  const cargarCalificaciones = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      
      console.log('🔄 Cargando calificaciones del estudiante...')
      const response = await axios.get(`${API_BASE_URL}/calificaciones/estudiante`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      console.log('✅ Respuesta de calificaciones:', response.data)
      
      if (response.data.calificaciones) {
        setCalificaciones(response.data.calificaciones)
      } else if (Array.isArray(response.data)) {
        setCalificaciones(response.data)
      } else {
        setCalificaciones([])
      }
      
    } catch (error) {
      console.error('❌ Error cargando calificaciones:', error)
      setError(error.response?.data?.error || 'Error al cargar calificaciones')
      setCalificaciones([])
    } finally {
      setLoading(false)
    }
  }

  const calcularPromedioGeneral = () => {
    if (calificaciones.length === 0) return 0
    const suma = calificaciones.reduce((total, cal) => total + cal.promedio_general, 0)
    return (suma / calificaciones.length).toFixed(1)
  }

  const getColorBadge = (promedio) => {
    if (promedio >= 4.5) return 'text-green-600 bg-green-100 border-green-200'
    if (promedio >= 3.5) return 'text-yellow-600 bg-yellow-100 border-yellow-200'
    return 'text-red-600 bg-red-100 border-red-200'
  }

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

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 mb-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full">
                <TrophyIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  Mis Calificaciones
                </h1>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Evaluaciones de tu desempeño académico
                </p>
              </div>
            </div>
            <Link
              to="/perfil-estudiante"
              className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                isDark 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Volver al Perfil
            </Link>
          </div>
        </div>

        {/* Contenido Principal */}
        {loading ? (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-8`}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Cargando tus calificaciones...
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
        ) : calificaciones.length === 0 ? (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-8`}>
            <div className="text-center">
              <ChartBarIcon className={`h-16 w-16 mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                No tienes calificaciones registradas
              </h3>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                Las calificaciones aparecerán cuando los profesores evalúen tu desempeño en los controles operativos.
              </p>
              <Link
                to="/mis-controles"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                Ver Mis Controles
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Estadísticas Generales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 text-center`}>
                <div className="p-3 bg-purple-600 rounded-full w-fit mx-auto mb-3">
                  <TrophyIcon className="h-6 w-6 text-white" />
                </div>
                <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                  {calcularPromedioGeneral()}/5.0
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Promedio General
                </p>
              </div>

              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 text-center`}>
                <div className="p-3 bg-blue-600 rounded-full w-fit mx-auto mb-3">
                  <StarIcon className="h-6 w-6 text-white" />
                </div>
                <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                  {calificaciones.length}
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Evaluaciones Recibidas
                </p>
              </div>

              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 text-center`}>
                <div className="p-3 bg-green-600 rounded-full w-fit mx-auto mb-3">
                  <AcademicCapIcon className="h-6 w-6 text-white" />
                </div>
                <div className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                  {calificaciones.filter(cal => cal.promedio_general >= 4.0).length}
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Evaluaciones Sobresalientes
                </p>
              </div>
            </div>

            {/* Lista de Calificaciones */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border`}>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  Historial de Evaluaciones
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                {calificaciones.map((calificacion) => (
                  <div
                    key={calificacion.id}
                    className={`border rounded-lg p-6 ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}
                  >
                    {/* Header de la calificación */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          calificacion.promedio_general >= 4.5 ? 'bg-green-100 text-green-600' :
                          calificacion.promedio_general >= 3.5 ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
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
                            {calificacion.ProfesorEvaluador ? 
                              `Evaluado por: Prof. ${calificacion.ProfesorEvaluador.nombres} ${calificacion.ProfesorEvaluador.apellidos}` :
                              calificacion.CoordinadorEvaluador ?
                              `Evaluado por: Coord. ${calificacion.CoordinadorEvaluador.nombres} ${calificacion.CoordinadorEvaluador.apellidos}` :
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="text-center">
                          <span className={`text-2xl font-bold ${
                            calificacion.cumplimiento_horario >= 4 ? 'text-green-600' :
                            calificacion.cumplimiento_horario >= 3 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {calificacion.cumplimiento_horario}
                          </span>
                          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/5</span>
                          <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mt-1`}>
                            Cumplimiento del Horario
                          </p>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="text-center">
                          <span className={`text-2xl font-bold ${
                            calificacion.presentacion_personal >= 4 ? 'text-green-600' :
                            calificacion.presentacion_personal >= 3 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {calificacion.presentacion_personal}
                          </span>
                          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/5</span>
                          <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mt-1`}>
                            Presentación Personal
                          </p>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="text-center">
                          <span className={`text-2xl font-bold ${
                            calificacion.conocimiento_juridico >= 4 ? 'text-green-600' :
                            calificacion.conocimiento_juridico >= 3 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {calificacion.conocimiento_juridico}
                          </span>
                          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/5</span>
                          <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mt-1`}>
                            Conocimiento Jurídico
                          </p>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="text-center">
                          <span className={`text-2xl font-bold ${
                            calificacion.trabajo_equipo >= 4 ? 'text-green-600' :
                            calificacion.trabajo_equipo >= 3 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {calificacion.trabajo_equipo}
                          </span>
                          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/5</span>
                          <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mt-1`}>
                            Trabajo en Equipo
                          </p>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} md:col-span-2 lg:col-span-1`}>
                        <div className="text-center">
                          <span className={`text-2xl font-bold ${
                            calificacion.atencion_usuario >= 4 ? 'text-green-600' :
                            calificacion.atencion_usuario >= 3 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {calificacion.atencion_usuario}
                          </span>
                          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/5</span>
                          <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mt-1`}>
                            Atención al Usuario
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
          </>
        )}
      </div>
    </div>
  )
}

export default MisCalificaciones