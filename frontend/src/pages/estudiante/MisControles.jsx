import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { 
  FunnelIcon, 
  MagnifyingGlassIcon, 
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

const MisControles = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [searchParams] = useSearchParams()
  
  const [controles, setControles] = useState([])
  const [controlesFiltrados, setControlesFiltrados] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado: searchParams.get('estado') || 'todos'
  })

  useEffect(() => {
    cargarControles()
  }, [])

  useEffect(() => {
    filtrarControles()
  }, [controles, filtros])

  const cargarControles = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await axios.get('/api/control-operativo/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      console.log('✅ Controles cargados:', response.data)
      setControles(response.data || [])
    } catch (error) {
      console.error('❌ Error cargando controles:', error)
      setControles([])
    } finally {
      setLoading(false)
    }
  }

  const filtrarControles = () => {
    let filtrados = [...controles]
    
    // Filtro por búsqueda
    if (filtros.busqueda.trim()) {
      const busqueda = filtros.busqueda.toLowerCase()
      filtrados = filtrados.filter(control => 
        control.nombre_consultante?.toLowerCase().includes(busqueda) ||
        control.area_consulta?.toLowerCase().includes(busqueda) ||
        control.descripcion_caso?.toLowerCase().includes(busqueda)
      )
    }
    
    // Filtro por estado
    if (filtros.estado !== 'todos') {
      switch (filtros.estado) {
        case 'pendientes':
          filtrados = filtrados.filter(control => 
            control.estado_flujo === 'pendiente_profesor'
          )
          break
        case 'completos':
          filtrados = filtrados.filter(control => 
            control.estado_flujo === 'completo'
          )
          break
        case 'finalizados':
          filtrados = filtrados.filter(control => 
            control.estado_flujo === 'con_resultado'
          )
          break
      }
    }
    
    console.log('🔍 Filtros aplicados:', filtros)
    console.log('📊 Controles filtrados:', filtrados.length)
    setControlesFiltrados(filtrados)
  }

  const getEstadoBadge = (estadoFlujo, estadoResultado) => {
    switch (estadoFlujo) {
      case 'pendiente_profesor':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium badge-pendiente">
            <ClockIcon className="w-3 h-3 mr-1" />
            Pendiente
          </span>
        )
      case 'completo':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium badge-completo">
            <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
            Esperando
          </span>
        )
      case 'con_resultado':
        const resultados = {
          'asesoria_consulta': 'Asesoría',
          'auto_reparto': 'Auto Reparto',
          'reparto': 'Reparto', 
          'solicitud_conciliacion': 'Conciliación'
        }
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium badge-finalizado">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            {resultados[estadoResultado] || 'Finalizado'}
          </span>
        )
      default:
        return (
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
            <DocumentTextIcon className="w-3 h-3 mr-1" />
            Sin Estado
          </span>
        )
    }
  }

  const descargarPDF = async (controlId, nombreConsultante) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/control-operativo/${controlId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Control_Operativo_${nombreConsultante}_${controlId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log('✅ PDF descargado exitosamente')
    } catch (error) {
      console.error('❌ Error descargando PDF:', error)
    }
  }

  const contarPorEstado = (estado) => {
    switch (estado) {
      case 'pendientes':
        return controles.filter(c => c.estado_flujo === 'pendiente_profesor').length
      case 'completos':
        return controles.filter(c => c.estado_flujo === 'completo').length  
      case 'finalizados':
        return controles.filter(c => c.estado_flujo === 'con_resultado').length
      default:
        return controles.length
    }
  }

  if (loading) {
    return (
      <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-university-purple mx-auto"></div>
          <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Cargando mis controles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
            Mis Controles Operativos
          </h1>
          <p className={`text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Gestiona y supervisa todos tus controles operativos
          </p>
        </div>

        {/* Filtros */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Búsqueda */}
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  placeholder="Buscar por consultante, área..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-university-purple focus:border-transparent ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                />
              </div>
            </div>

            {/* Filtro por Estado */}
            <div>
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                className={`w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-university-purple focus:border-transparent ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="todos">Todos ({controles.length})</option>
                <option value="pendientes">Pendientes ({contarPorEstado('pendientes')})</option>
                <option value="completos">Completos ({contarPorEstado('completos')})</option>
                <option value="finalizados">Finalizados ({contarPorEstado('finalizados')})</option>
              </select>
            </div>

            {/* Indicador de Filtros */}
            <div className="flex items-center justify-center sm:justify-start sm:col-span-2 lg:col-span-1">
              <FunnelIcon className={`h-4 w-4 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Mostrando {controlesFiltrados.length} de {controles.length}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de Controles - Diseño Híbrido Responsive */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border overflow-hidden`}>
          {controlesFiltrados.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <DocumentTextIcon className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`mt-4 text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                No hay controles para mostrar
              </h3>
              <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {filtros.estado === 'todos' ? 'Aún no has creado ningún control operativo.' : `No tienes controles ${filtros.estado}.`}
              </p>
            </div>
          ) : (
            <>
              {/* Vista Desktop - Tabla */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                        Consultante
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                        Área
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                        Profesor
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                        Estado
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                        Fecha
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                    {controlesFiltrados.map((control) => (
                      <tr key={control.id} className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors duration-150`}>
                        <td className="px-6 py-4">
                          <div>
                            <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                              {control.nombre_consultante}
                            </div>
                            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              Doc: {control.numero_documento}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                            {control.area_consulta || 'Sin especificar'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {control.nombre_docente_responsable || 'Sin asignar'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getEstadoBadge(control.estado_flujo, control.estado_resultado)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {control.created_at ? new Date(control.created_at).toLocaleDateString('es-ES') : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {(control.estado_flujo === 'completo' || control.estado_flujo === 'con_resultado') ? (
                            <button
                              onClick={() => descargarPDF(control.id, control.nombre_consultante)}
                              className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors duration-200 ${isDark ? 'text-blue-400 hover:bg-blue-900/20' : 'text-blue-600 hover:bg-blue-50'}`}
                            >
                              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                              Descargar PDF
                            </button>
                          ) : (
                            <button
                              disabled
                              className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md cursor-not-allowed ${
                                isDark ? 'text-gray-500 bg-gray-700/50' : 'text-gray-400 bg-gray-100'
                              }`}
                              title={control.estado_flujo === 'pendiente_profesor' ? 'PDF disponible cuando el profesor complete su parte' : 'PDF no disponible'}
                            >
                              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                              {control.estado_flujo === 'pendiente_profesor' ? 'Pendiente' : 'No Disponible'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista Móvil/Tablet - Cards (Estilo ControlOperativo) */}
              <div className="lg:hidden space-y-4 p-4">
                {controlesFiltrados.map((control) => {
                  const fechaFormateada = control.created_at 
                    ? new Date(control.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric'
                      })
                    : 'No definida'
                  
                  return (
                    <div key={control.id} className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      {/* Header del Card */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className={`text-lg font-bold ${isDark ? 'text-purple-400' : 'text-university-purple'}`}>
                            #{control.id}
                          </span>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {fechaFormateada}
                          </div>
                        </div>
                        <div>
                          {getEstadoBadge(control.estado_flujo, control.estado_resultado)}
                        </div>
                      </div>

                      {/* Información Principal */}
                      <div className="space-y-2 mb-4">
                        <div>
                          <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Consultante</span>
                          <div className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            {control.nombre_consultante 
                              ? control.nombre_consultante.split(' ').length >= 2 
                                ? `${control.nombre_consultante.split(' ')[0]} ${control.nombre_consultante.split(' ')[1]}`
                                : control.nombre_consultante
                              : 'Sin nombre'
                            }
                          </div>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {control.numero_documento ? `Doc: ${control.numero_documento}` : 'Sin documento'}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Profesor</span>
                            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                              {control.nombre_docente_responsable 
                                ? control.nombre_docente_responsable.split(' ').length >= 2 
                                  ? `${control.nombre_docente_responsable.split(' ')[0]} ${control.nombre_docente_responsable.split(' ')[1]}`
                                  : control.nombre_docente_responsable
                                : 'Sin asignar'
                              }
                            </div>
                          </div>

                          <div>
                            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Área de Consulta</span>
                            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                              {control.area_consulta || 'Sin área'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botón de Acción */}
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        {(control.estado_flujo === 'completo' || control.estado_flujo === 'con_resultado') ? (
                          <button
                            onClick={() => descargarPDF(control.id, control.nombre_consultante)}
                            className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 text-white bg-university-purple hover:bg-purple-700 focus:ring-purple-500"
                            title="Descargar PDF del control operativo"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                            Descargar PDF
                          </button>
                        ) : (
                          <button
                            disabled
                            className={`w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-transparent rounded-lg focus:outline-none cursor-not-allowed transition-colors duration-200 ${
                              isDark ? 'text-gray-500 bg-gray-700' : 'text-gray-400 bg-gray-200'
                            }`}
                            title={control.estado_flujo === 'pendiente_profesor' ? 'PDF disponible cuando el profesor complete su parte' : 'PDF no disponible aún'}
                          >
                            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                            {control.estado_flujo === 'pendiente_profesor' ? 'Pendiente Profesor' : 'No Disponible'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Estadísticas Resumen Mejoradas */}
        <div className="mt-8">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>
            Resumen de Estados
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`${isDark ? 'bg-gradient-to-br from-orange-900/20 to-orange-800/10 border-orange-500/30' : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'} rounded-xl border p-6 hover:shadow-lg transition-all duration-200`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-3xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'} mb-1`}>
                    {contarPorEstado('pendientes')}
                  </p>
                  <p className={`text-sm font-medium ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                    Controles Pendientes
                  </p>
                  <p className={`text-xs ${isDark ? 'text-orange-400/70' : 'text-orange-600/70'} mt-1`}>
                    Esperando profesor
                  </p>
                </div>
                <div className={`p-3 rounded-full ${isDark ? 'bg-orange-500/20' : 'bg-orange-200'}`}>
                  <ClockIcon className={`h-8 w-8 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                </div>
              </div>
            </div>
            
            <div className={`${isDark ? 'bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-500/30' : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'} rounded-xl border p-6 hover:shadow-lg transition-all duration-200`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-3xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'} mb-1`}>
                    {contarPorEstado('completos')}
                  </p>
                  <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    Controles Completos
                  </p>
                  <p className={`text-xs ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'} mt-1`}>
                    Esperando resultado
                  </p>
                </div>
                <div className={`p-3 rounded-full ${isDark ? 'bg-blue-500/20' : 'bg-blue-200'}`}>
                  <ExclamationTriangleIcon className={`h-8 w-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
              </div>
            </div>
            
            <div className={`${isDark ? 'bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-500/30' : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'} rounded-xl border p-6 hover:shadow-lg transition-all duration-200 sm:col-span-1`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-3xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'} mb-1`}>
                    {contarPorEstado('finalizados')}
                  </p>
                  <p className={`text-sm font-medium ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                    Controles Finalizados
                  </p>
                  <p className={`text-xs ${isDark ? 'text-green-400/70' : 'text-green-600/70'} mt-1`}>
                    Con resultado asignado
                  </p>
                </div>
                <div className={`p-3 rounded-full ${isDark ? 'bg-green-500/20' : 'bg-green-200'}`}>
                  <CheckCircleIcon className={`h-8 w-8 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MisControles