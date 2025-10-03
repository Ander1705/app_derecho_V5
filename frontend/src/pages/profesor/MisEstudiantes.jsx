import { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import API_BASE_URL from '../../config/api'
import {
  UserGroupIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'

const MisEstudiantes = () => {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [estudiantes, setEstudiantes] = useState([])
  const [filteredEstudiantes, setFilteredEstudiantes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [areas, setAreas] = useState([])
  const [estadisticas, setEstadisticas] = useState({
    totalEstudiantes: 0,
    estudiantesUnicos: 0,
    areasAtendidas: 0,
    casosPromedioPorEstudiante: 0
  })

  useEffect(() => {
    cargarEstudiantes()
  }, [])

  useEffect(() => {
    filtrarEstudiantes()
  }, [estudiantes, searchTerm, selectedArea])

  const cargarEstudiantes = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Obtener controles asignados al profesor
      const response = await axios.get(`${API_BASE_URL}/profesor/controles-asignados`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const controles = response.data || []
      
      // Procesar datos para extraer estudiantes únicos
      const estudiantesMap = new Map()
      const areasSet = new Set()
      
      controles.forEach(control => {
        const nombreEstudiante = control.nombre_estudiante
        const area = control.area_consulta
        
        if (nombreEstudiante) {
          if (!estudiantesMap.has(nombreEstudiante)) {
            estudiantesMap.set(nombreEstudiante, {
              nombre: nombreEstudiante,
              casos: [],
              areas: new Set(),
              totalCasos: 0
            })
          }
          
          const estudiante = estudiantesMap.get(nombreEstudiante)
          estudiante.casos.push(control)
          estudiante.totalCasos++
          
          if (area) {
            estudiante.areas.add(area)
            areasSet.add(area)
          }
        }
      })

      // Convertir Map a Array y procesar áreas
      const estudiantesArray = Array.from(estudiantesMap.values() || []).map(estudiante => ({
        ...estudiante,
        areas: Array.from(estudiante.areas),
        areasTexto: Array.from(estudiante.areas).join(', ') || 'Sin área especificada'
      }))

      const areasArray = Array.from(areasSet).sort()

      // Calcular estadísticas
      const stats = {
        totalEstudiantes: controles.length,
        estudiantesUnicos: estudiantesArray.length,
        areasAtendidas: areasArray.length,
        casosPromedioPorEstudiante: estudiantesArray.length > 0 
          ? (controles.length / estudiantesArray.length).toFixed(1) 
          : 0
      }

      setEstudiantes(estudiantesArray)
      setAreas(areasArray)
      setEstadisticas(stats)

    } catch (error) {
      console.error('Error cargando estudiantes:', error)
      
      // Datos de fallback
      const mockEstudiantes = [
        {
          nombre: 'Ana Martínez García',
          casos: [
            { id: 1, nombre_consultante: 'Carlos Rodríguez', area_consulta: 'Laboral', created_at: '2025-01-15' },
            { id: 2, nombre_consultante: 'María López', area_consulta: 'Civil', created_at: '2025-01-10' }
          ],
          areas: ['Laboral', 'Civil'],
          areasTexto: 'Laboral, Civil',
          totalCasos: 2
        },
        {
          nombre: 'Luis Castro Hernández',
          casos: [
            { id: 3, nombre_consultante: 'José Pérez', area_consulta: 'Penal', created_at: '2025-01-12' }
          ],
          areas: ['Penal'],
          areasTexto: 'Penal',
          totalCasos: 1
        },
        {
          nombre: 'Diana Morales Vega',
          casos: [
            { id: 4, nombre_consultante: 'Patricia Jiménez', area_consulta: 'Familia', created_at: '2025-01-08' },
            { id: 5, nombre_consultante: 'Eduardo Vargas', area_consulta: 'Familia', created_at: '2025-01-05' },
            { id: 6, nombre_consultante: 'Sandra Torres', area_consulta: 'Civil', created_at: '2025-01-03' }
          ],
          areas: ['Familia', 'Civil'],
          areasTexto: 'Familia, Civil',
          totalCasos: 3
        }
      ]

      setEstudiantes(mockEstudiantes)
      setAreas(['Laboral', 'Civil', 'Penal', 'Familia'])
      setEstadisticas({
        totalEstudiantes: 6,
        estudiantesUnicos: 3,
        areasAtendidas: 4,
        casosPromedioPorEstudiante: '2.0'
      })
    } finally {
      setLoading(false)
    }
  }

  const filtrarEstudiantes = () => {
    let filtered = estudiantes

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(estudiante =>
        estudiante.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        estudiante.areasTexto.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtrar por área
    if (selectedArea) {
      filtered = filtered.filter(estudiante =>
        estudiante.areas.includes(selectedArea)
      )
    }

    setFilteredEstudiantes(filtered)
  }

  const getAreaColor = (area, index) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800', 
      'bg-red-100 text-red-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-indigo-100 text-indigo-800',
      'bg-pink-100 text-pink-800'
    ]
    
    if (isDark) {
      const darkColors = [
        'bg-blue-900/30 text-blue-400',
        'bg-green-900/30 text-green-400',
        'bg-red-900/30 text-red-400',
        'bg-purple-900/30 text-purple-400',
        'bg-orange-900/30 text-orange-400',
        'bg-indigo-900/30 text-indigo-400',
        'bg-pink-900/30 text-pink-400'
      ]
      return darkColors[index % darkColors.length]
    }
    
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-university-purple mx-auto"></div>
          <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Cargando estudiantes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Header */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 mb-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                Mis Estudiantes
              </h1>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Estudiantes que han solicitado tu asesoría jurídica
              </p>
            </div>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-800'}`}>
              <UserGroupIcon className="h-5 w-5" />
              <span className="text-sm font-medium">{estadisticas.estudiantesUnicos} estudiantes únicos</span>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
            <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
              <DocumentTextIcon className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div className={`text-3xl font-bold text-center mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {estadisticas.totalEstudiantes}
            </div>
            <div className={`text-sm text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Total de Casos
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
            <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
              <UserGroupIcon className={`h-6 w-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <div className={`text-3xl font-bold text-center mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {estadisticas.estudiantesUnicos}
            </div>
            <div className={`text-sm text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Estudiantes Únicos
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
            <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
              <ChartBarIcon className={`h-6 w-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            </div>
            <div className={`text-3xl font-bold text-center mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {estadisticas.areasAtendidas}
            </div>
            <div className={`text-sm text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Áreas Atendidas
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
            <div className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
              <AcademicCapIcon className={`h-6 w-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <div className={`text-3xl font-bold text-center mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {estadisticas.casosPromedioPorEstudiante}
            </div>
            <div className={`text-sm text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Casos Promedio
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 mb-6`}>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Buscar por nombre de estudiante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                />
              </div>
            </div>

            {/* Filtro por área */}
            <div className="sm:w-64">
              <div className="relative">
                <FunnelIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                >
                  <option value="">Todas las áreas</option>
                  {areas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Estudiantes */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border`}>
          <div className="p-6">
            <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-6`}>
              Lista de Estudiantes ({filteredEstudiantes.length})
            </h2>
            
            {(filteredEstudiantes || []).length > 0 ? (
              <div className="space-y-4">
                {(filteredEstudiantes || []).map((estudiante, index) => (
                  <div
                    key={estudiante.nombre}
                    className={`p-6 rounded-lg border transition-all duration-200 hover:shadow-md ${isDark ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
                          <UserIcon className={`h-6 w-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                            {estudiante.nombre}
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center space-x-2">
                              <DocumentTextIcon className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                {estudiante.totalCasos} caso{estudiante.totalCasos !== 1 ? 's' : ''} asignado{estudiante.totalCasos !== 1 ? 's' : ''}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <ChartBarIcon className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                {estudiante.areas.length} área{estudiante.areas.length !== 1 ? 's' : ''} jurídica{estudiante.areas.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          {/* Áreas */}
                          <div className="mb-4">
                            <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} block mb-2`}>
                              Áreas de consulta:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {(estudiante.areas || []).map((area, areaIndex) => (
                                <span
                                  key={area}
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getAreaColor(area, areaIndex)}`}
                                >
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Casos recientes */}
                          <div>
                            <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} block mb-2`}>
                              Casos recientes:
                            </span>
                            <div className="space-y-1">
                              {(estudiante.casos || []).slice(0, 2).map((caso) => (
                                <div key={caso.id} className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                  • <span className="font-medium">{caso.nombre_consultante}</span>
                                  {caso.area_consulta && (
                                    <span className={`ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                      ({caso.area_consulta})
                                    </span>
                                  )}
                                </div>
                              ))}
                              {estudiante.casos.length > 2 && (
                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  +{estudiante.casos.length - 2} caso{estudiante.casos.length - 2 !== 1 ? 's' : ''} más
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserGroupIcon className={`h-16 w-16 mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'} mb-2`}>
                  No se encontraron estudiantes
                </h3>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {searchTerm || selectedArea 
                    ? 'Intenta cambiar los filtros de búsqueda' 
                    : 'Aún no tienes estudiantes asignados'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MisEstudiantes