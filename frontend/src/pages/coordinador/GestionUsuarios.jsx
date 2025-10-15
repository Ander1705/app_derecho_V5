import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import ConfirmModal from '../../components/ui/ConfirmModal'
import axios from 'axios'
import API_BASE_URL from '../../config/api'
import { 
  ChartBarIcon,
  StarIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

const GestionUsuarios = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [searchParams] = useSearchParams()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('todos') // todos, estudiante, profesor
  const [busqueda, setBusqueda] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  
  // Estados para evaluaciones de coordinador
  const [showEvaluacionModal, setShowEvaluacionModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [calificacionForm, setCalificacionForm] = useState({
    control_operativo_id: '',
    cumplimiento_horario: 1,
    presentacion_personal: 1,
    conocimiento_juridico: 1,
    trabajo_equipo: 1,
    atencion_usuario: 1,
    observaciones: ''
  })
  const [studentControls, setStudentControls] = useState([])
  const [savingCalificacion, setSavingCalificacion] = useState(false)
  const [showCalificacionesModal, setShowCalificacionesModal] = useState(false)
  const [studentCalificaciones, setStudentCalificaciones] = useState([])

  useEffect(() => {
    if (user?.role === 'coordinador') {
      cargarUsuarios()
    }
  }, [user])

  // Efecto para aplicar filtro desde URL
  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam && (roleParam === 'estudiante' || roleParam === 'profesor')) {
      setFiltroTipo(roleParam)
      console.log('🎯 Filtro aplicado desde URL:', roleParam)
    }
  }, [searchParams])

  const cargarUsuarios = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/coordinador/usuarios', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsuarios(response.data)
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      setError('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const abrirModalConfirmacion = (usuario, accion) => {
    setSelectedUser(usuario)
    setPendingAction(accion)
    setShowConfirmModal(true)
  }

  const cambiarEstadoUsuario = async () => {
    if (!selectedUser || !pendingAction) return

    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `/api/coordinador/usuario/${selectedUser.id}/estado`,
        { activo: pendingAction === 'activar' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      // Actualizar la lista local
      setUsuarios(prev => prev.map(u => 
        u.id === selectedUser.id ? { ...u, activo: pendingAction === 'activar' } : u
      ))
      
      // Cerrar modal
      setShowConfirmModal(false)
      setSelectedUser(null)
      setPendingAction(null)
      
    } catch (error) {
      console.error('Error cambiando estado:', error)
      alert('Error al cambiar el estado del usuario')
    }
  }

  // Funciones para evaluaciones de coordinador
  const handleEvaluarEstudiante = async (estudiante) => {
    setSelectedStudent(estudiante)
    
    // Cargar controles operativos del estudiante
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/control-operativo/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Filtrar controles del estudiante que estén completos
      const controlesEstudiante = response.data.filter(control => 
        control.created_by_id === estudiante.id && 
        (control.estado_flujo === 'completo' || control.estado_flujo === 'con_resultado')
      )
      
      setStudentControls(controlesEstudiante)
    } catch (error) {
      console.error('Error cargando controles:', error)
      setStudentControls([])
    }
    
    // Reset form
    setCalificacionForm({
      control_operativo_id: '',
      cumplimiento_horario: 1,
      presentacion_personal: 1,
      conocimiento_juridico: 1,
      trabajo_equipo: 1,
      atencion_usuario: 1,
      observaciones: ''
    })
    
    setShowEvaluacionModal(true)
  }

  const handleGuardarCalificacion = async () => {
    if (!calificacionForm.control_operativo_id) {
      alert('Debes seleccionar un control operativo')
      return
    }

    try {
      setSavingCalificacion(true)
      const token = localStorage.getItem('token')
      
      await axios.post('/api/calificaciones', {
        control_operativo_id: parseInt(calificacionForm.control_operativo_id),
        estudiante_id: selectedStudent.id,
        cumplimiento_horario: calificacionForm.cumplimiento_horario,
        presentacion_personal: calificacionForm.presentacion_personal,
        conocimiento_juridico: calificacionForm.conocimiento_juridico,
        trabajo_equipo: calificacionForm.trabajo_equipo,
        atencion_usuario: calificacionForm.atencion_usuario,
        observaciones: calificacionForm.observaciones
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      alert('Calificación guardada exitosamente')
      setShowEvaluacionModal(false)
    } catch (error) {
      console.error('Error guardando calificación:', error)
      alert('Error al guardar la calificación')
    } finally {
      setSavingCalificacion(false)
    }
  }

  const handleVerCalificaciones = async (estudiante) => {
    setSelectedStudent(estudiante)
    
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/calificaciones?estudiante_id=${estudiante.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setStudentCalificaciones(response.data.calificaciones || [])
      setShowCalificacionesModal(true)
    } catch (error) {
      console.error('Error cargando calificaciones:', error)
      setStudentCalificaciones([])
      setShowCalificacionesModal(true)
    }
  }

  const calcularPromedio = () => {
    const suma = calificacionForm.cumplimiento_horario + 
                 calificacionForm.presentacion_personal + 
                 calificacionForm.conocimiento_juridico + 
                 calificacionForm.trabajo_equipo + 
                 calificacionForm.atencion_usuario
    return (suma / 5).toFixed(1)
  }

  const usuariosFiltrados = (usuarios || []).filter(usuario => {
    // Filtro por tipo
    if (filtroTipo !== 'todos' && usuario.role !== filtroTipo) {
      return false
    }
    
    // Filtro por búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase()
      return (
        usuario.nombre_usuario?.toLowerCase().includes(termino) ||
        usuario.email?.toLowerCase().includes(termino) ||
        usuario.nombres?.toLowerCase().includes(termino) ||
        usuario.apellidos?.toLowerCase().includes(termino) ||
        usuario.numero_documento?.toLowerCase().includes(termino)
      )
    }
    
    return true
  })

  const getEstadoBadge = (activo) => {
    return activo ? (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}>
        Activo
      </span>
    ) : (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'}`}>
        Suspendido
      </span>
    )
  }

  const getRoleBadge = (role) => {
    const roles = {
      'estudiante': { 
        text: 'Estudiante', 
        color: isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800' 
      },
      'profesor': { 
        text: 'Profesor', 
        color: isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-800' 
      },
      'coordinador': { 
        text: 'Coordinador', 
        color: isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800' 
      }
    }
    
    const roleInfo = roles[role] || { 
      text: role, 
      color: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800' 
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
        {roleInfo.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-university-blue mx-auto mb-4"></div>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Cargando usuarios...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
        <div className="text-center">
          <p className="text-red-500 text-lg">{error}</p>
          <button
            onClick={cargarUsuarios}
            className="mt-4 px-4 py-2 bg-university-blue text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="max-w-full mx-auto px-4">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            Gestión de Usuarios
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Gestiona estudiantes y profesores - activa o desactiva cuentas
          </p>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <svg className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Usuarios
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {usuarios.length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <svg className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Estudiantes
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {(usuarios || []).filter(u => u && u.role === 'estudiante').length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                <svg className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Profesores
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {(usuarios || []).filter(u => u && u.role === 'profesor').length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-100'}`}>
                <svg className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.76 0L4.054 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Suspendidos
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {(usuarios || []).filter(u => u && !u.activo).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg mb-8`}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filtro por tipo */}
            <div className="flex-1">
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Filtrar por tipo
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
              >
                <option value="todos">Todos los usuarios</option>
                <option value="estudiante">Solo Estudiantes</option>
                <option value="profesor">Solo Profesores</option>
              </select>
            </div>

            {/* Búsqueda */}
            <div className="flex-2">
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Buscar usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre, email, documento..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full pl-10 px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de usuarios */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Lista de Usuarios ({usuariosFiltrados.length})
            </h2>
          </div>

          {usuariosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                No se encontraron usuarios
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Ajusta los filtros o la búsqueda para ver resultados
              </p>
            </div>
          ) : (
            <>
              {/* Vista Desktop - Tabla */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Usuario
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Email
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Rol
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Estado
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Registro
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`${isDark ? 'bg-gray-800' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {(usuariosFiltrados || []).map((usuario) => (
                      <tr key={usuario.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className={`h-10 w-10 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-300'} flex items-center justify-center`}>
                                <svg className={`h-6 w-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                {usuario.nombres && usuario.apellidos ? 
                                  `${usuario.nombres} ${usuario.apellidos}` : 
                                  usuario.nombre_usuario
                                }
                              </div>
                              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {usuario.numero_documento ? `Doc: ${usuario.numero_documento}` : `@${usuario.nombre_usuario}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                          {usuario.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(usuario.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getEstadoBadge(usuario.activo)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                          {new Date(usuario.created_at).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {usuario.role === 'estudiante' && usuario.activo && (
                              <>
                                <button
                                  onClick={() => handleEvaluarEstudiante(usuario)}
                                  className={`inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded-md transition-colors ${
                                    isDark ? 'text-blue-400 bg-blue-900/30 hover:bg-blue-900/40' : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                                  }`}
                                  title="Evaluar estudiante"
                                >
                                  <StarIcon className="h-3 w-3 mr-1" />
                                  Evaluar
                                </button>
                                <button
                                  onClick={() => handleVerCalificaciones(usuario)}
                                  className={`inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded-md transition-colors ${
                                    isDark ? 'text-purple-400 bg-purple-900/30 hover:bg-purple-900/40' : 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                                  }`}
                                  title="Ver calificaciones"
                                >
                                  <EyeIcon className="h-3 w-3 mr-1" />
                                  Ver
                                </button>
                              </>
                            )}
                            {usuario.role !== 'coordinador' && (
                              <button
                                onClick={() => abrirModalConfirmacion(usuario, usuario.activo ? 'desactivar' : 'activar')}
                                className={`inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md transition-colors ${
                                  usuario.activo
                                    ? (isDark ? 'text-red-400 bg-red-900/30 hover:bg-red-900/40' : 'text-red-700 bg-red-100 hover:bg-red-200')
                                    : (isDark ? 'text-green-400 bg-green-900/30 hover:bg-green-900/40' : 'text-green-700 bg-green-100 hover:bg-green-200')
                                }`}
                              >
                                {usuario.activo ? 'Desactivar' : 'Activar'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista Mobile - Cards */}
              <div className="lg:hidden space-y-4 p-4">
                {(usuariosFiltrados || []).map((usuario) => (
                  <div key={usuario.id} className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    {/* Header del Card */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className={`h-12 w-12 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-300'} flex items-center justify-center mr-3`}>
                          <svg className={`h-6 w-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <div className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            {usuario.nombres && usuario.apellidos ? 
                              `${usuario.nombres.split(' ')[0]} ${usuario.apellidos.split(' ')[0]}` : 
                              usuario.nombre_usuario
                            }
                          </div>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {usuario.numero_documento ? `Doc: ${usuario.numero_documento}` : `@${usuario.nombre_usuario}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getRoleBadge(usuario.role)}
                        {getEstadoBadge(usuario.activo)}
                      </div>
                    </div>

                    {/* Información del Usuario */}
                    <div className="space-y-2 mb-4">
                      <div>
                        <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Email</span>
                        <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                          {usuario.email}
                        </div>
                      </div>
                      
                      <div>
                        <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Registro</span>
                        <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                          {new Date(usuario.created_at).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    {usuario.role !== 'coordinador' && (
                      <div className={`pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} space-y-2`}>
                        {usuario.role === 'estudiante' && usuario.activo && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleEvaluarEstudiante(usuario)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                isDark ? 'text-blue-400 bg-blue-900/30 hover:bg-blue-900/40' : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                              }`}
                            >
                              <StarIcon className="h-4 w-4 inline mr-1" />
                              Evaluar
                            </button>
                            <button
                              onClick={() => handleVerCalificaciones(usuario)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                isDark ? 'text-purple-400 bg-purple-900/30 hover:bg-purple-900/40' : 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                              }`}
                            >
                              <EyeIcon className="h-4 w-4 inline mr-1" />
                              Ver Calificaciones
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => abrirModalConfirmacion(usuario, usuario.activo ? 'desactivar' : 'activar')}
                          className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            usuario.activo
                              ? (isDark ? 'text-red-400 bg-red-900/30 hover:bg-red-900/40' : 'text-red-700 bg-red-100 hover:bg-red-200')
                              : (isDark ? 'text-green-400 bg-green-900/30 hover:bg-green-900/40' : 'text-green-700 bg-green-100 hover:bg-green-200')
                          }`}
                        >
                          {usuario.activo ? 'Desactivar Usuario' : 'Activar Usuario'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal para Evaluar Estudiante */}
        {showEvaluacionModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Evaluar Estudiante: {selectedStudent.nombres} {selectedStudent.apellidos}
                </h3>
                <button
                  onClick={() => setShowEvaluacionModal(false)}
                  className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Seleccionar Control Operativo *
                </label>
                <select
                  value={calificacionForm.control_operativo_id}
                  onChange={(e) => setCalificacionForm({
                    ...calificacionForm,
                    control_operativo_id: e.target.value
                  })}
                  className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-purple focus:border-transparent border`}
                >
                  <option value="">Seleccione un control operativo...</option>
                  {(studentControls || []).map(control => (
                    <option key={control.id} value={control.id}>
                      Control #{control.id} - {control.nombre_consultante} ({control.area_consulta})
                    </option>
                  ))}
                </select>
                {studentControls.length === 0 && (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                    Este estudiante no tiene controles operativos completados disponibles para evaluar.
                  </p>
                )}
              </div>

              {/* Criterios de Evaluación - Versión Compacta */}
              <div className="space-y-4">
                {/* Cumplimiento del horario */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    CUMPLIMIENTO DEL HORARIO (1-5)
                  </label>
                  <div className="flex space-x-4">
                    {[1, 2, 3, 4, 5].map(valor => (
                      <label key={valor} className="flex items-center">
                        <input
                          type="radio"
                          name="cumplimiento_horario"
                          value={valor}
                          checked={calificacionForm.cumplimiento_horario === valor}
                          onChange={(e) => setCalificacionForm({
                            ...calificacionForm,
                            cumplimiento_horario: parseInt(e.target.value)
                          })}
                          className="mr-2"
                        />
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{valor}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Presentación personal */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    PRESENTACIÓN PERSONAL (1-5)
                  </label>
                  <div className="flex space-x-4">
                    {[1, 2, 3, 4, 5].map(valor => (
                      <label key={valor} className="flex items-center">
                        <input
                          type="radio"
                          name="presentacion_personal"
                          value={valor}
                          checked={calificacionForm.presentacion_personal === valor}
                          onChange={(e) => setCalificacionForm({
                            ...calificacionForm,
                            presentacion_personal: parseInt(e.target.value)
                          })}
                          className="mr-2"
                        />
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{valor}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Conocimiento jurídico */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    CONOCIMIENTO JURÍDICO (1-5)
                  </label>
                  <div className="flex space-x-4">
                    {[1, 2, 3, 4, 5].map(valor => (
                      <label key={valor} className="flex items-center">
                        <input
                          type="radio"
                          name="conocimiento_juridico"
                          value={valor}
                          checked={calificacionForm.conocimiento_juridico === valor}
                          onChange={(e) => setCalificacionForm({
                            ...calificacionForm,
                            conocimiento_juridico: parseInt(e.target.value)
                          })}
                          className="mr-2"
                        />
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{valor}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Trabajo en equipo */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    TRABAJO EN EQUIPO (1-5)
                  </label>
                  <div className="flex space-x-4">
                    {[1, 2, 3, 4, 5].map(valor => (
                      <label key={valor} className="flex items-center">
                        <input
                          type="radio"
                          name="trabajo_equipo"
                          value={valor}
                          checked={calificacionForm.trabajo_equipo === valor}
                          onChange={(e) => setCalificacionForm({
                            ...calificacionForm,
                            trabajo_equipo: parseInt(e.target.value)
                          })}
                          className="mr-2"
                        />
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{valor}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Atención al usuario */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    ATENCIÓN AL USUARIO (1-5)
                  </label>
                  <div className="flex space-x-4">
                    {[1, 2, 3, 4, 5].map(valor => (
                      <label key={valor} className="flex items-center">
                        <input
                          type="radio"
                          name="atencion_usuario"
                          value={valor}
                          checked={calificacionForm.atencion_usuario === valor}
                          onChange={(e) => setCalificacionForm({
                            ...calificacionForm,
                            atencion_usuario: parseInt(e.target.value)
                          })}
                          className="mr-2"
                        />
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{valor}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Observaciones (Opcional)
                  </label>
                  <textarea
                    value={calificacionForm.observaciones}
                    onChange={(e) => setCalificacionForm({
                      ...calificacionForm,
                      observaciones: e.target.value
                    })}
                    rows={2}
                    placeholder="Comentarios adicionales..."
                    className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-purple focus:border-transparent border`}
                  />
                </div>

                {/* Promedio calculado */}
                <div className={`${isDark ? 'bg-purple-900/30 border-purple-800' : 'bg-purple-50 border-purple-200'} rounded-lg p-3 border`}>
                  <div className="text-center">
                    <span className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Promedio General</span>
                    <div className={`text-2xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                      {calcularPromedio()}/5.0
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEvaluacionModal(false)}
                  className={`px-4 py-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarCalificacion}
                  disabled={savingCalificacion || !calificacionForm.control_operativo_id}
                  className={`px-4 py-2 rounded-lg text-white ${
                    savingCalificacion || !calificacionForm.control_operativo_id
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {savingCalificacion ? 'Guardando...' : 'Guardar Calificación'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Ver Calificaciones */}
        {showCalificacionesModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Calificaciones de: {selectedStudent.nombres} {selectedStudent.apellidos}
                </h3>
                <button
                  onClick={() => setShowCalificacionesModal(false)}
                  className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {studentCalificaciones.length > 0 ? (
                <div className="space-y-4">
                  {/* Promedio General */}
                  <div className={`${isDark ? 'bg-purple-900/30 border-purple-800' : 'bg-purple-50 border-purple-200'} rounded-lg p-4 border`}>
                    <div className="text-center">
                      <span className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Promedio General del Estudiante</span>
                      <div className={`text-3xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                        {(studentCalificaciones.reduce((sum, cal) => sum + cal.promedio_general, 0) / studentCalificaciones.length).toFixed(1)}/5.0
                      </div>
                      <span className={`text-xs ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                        Basado en {studentCalificaciones.length} evaluación{studentCalificaciones.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Calificaciones */}
                  <div className="space-y-3">
                    {(studentCalificaciones || []).map((calificacion) => (
                      <div key={calificacion.id} className={`p-4 border rounded-lg ${isDark ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                              Control Operativo #{calificacion.control_operativo_id}
                            </h4>
                            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              Evaluado por: {
                                calificacion.ProfesorEvaluador ? 
                                  `Prof. ${calificacion.ProfesorEvaluador.nombres} ${calificacion.ProfesorEvaluador.apellidos}` :
                                calificacion.CoordinadorEvaluador ?
                                  `Coord. ${calificacion.CoordinadorEvaluador.nombres} ${calificacion.CoordinadorEvaluador.apellidos}` :
                                'Sistema'
                              }
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xl font-bold ${
                              calificacion.promedio_general >= 4.5 ? 'text-green-600' :
                              calificacion.promedio_general >= 3.5 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {calificacion.promedio_general.toFixed(1)}
                            </span>
                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/5.0</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                          <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="font-medium">Horario:</span> {calificacion.cumplimiento_horario}/5
                          </div>
                          <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="font-medium">Presentación:</span> {calificacion.presentacion_personal}/5
                          </div>
                          <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="font-medium">Conocimiento:</span> {calificacion.conocimiento_juridico}/5
                          </div>
                          <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="font-medium">Equipo:</span> {calificacion.trabajo_equipo}/5
                          </div>
                          <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="font-medium">Atención:</span> {calificacion.atencion_usuario}/5
                          </div>
                        </div>
                        
                        {calificacion.observaciones && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              <span className="font-medium">Observaciones:</span> {calificacion.observaciones}
                            </p>
                          </div>
                        )}
                        
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                          {new Date(calificacion.created_at).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChartBarIcon className={`h-16 w-16 mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Este estudiante no tiene calificaciones registradas
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                    Las calificaciones aparecerán cuando sean evaluadas por profesores o coordinadores
                  </p>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowCalificacionesModal(false)}
                  className={`px-4 py-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación */}
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false)
            setSelectedUser(null)
            setPendingAction(null)
          }}
          onConfirm={cambiarEstadoUsuario}
          title={`Confirmar ${pendingAction === 'activar' ? 'Activación' : 'Desactivación'}`}
          message={
            selectedUser && pendingAction
              ? `¿Está seguro que desea ${pendingAction} al usuario "${selectedUser.nombre_usuario}"?
              
Usuario: ${selectedUser.nombres || ''} ${selectedUser.apellidos || ''}
Email: ${selectedUser.email || ''}
Rol: ${selectedUser.role || ''}

${pendingAction === 'desactivar' 
  ? '⚠️ El usuario no podrá acceder al sistema mientras esté desactivado.' 
  : '✅ El usuario podrá acceder normalmente al sistema.'}`
              : ''
          }
          confirmText={pendingAction === 'activar' ? 'Activar Usuario' : 'Desactivar Usuario'}
          cancelText="Cancelar"
          type={pendingAction === 'activar' ? 'success' : 'warning'}
        />
      </div>
    </div>
  )
}

export default GestionUsuarios