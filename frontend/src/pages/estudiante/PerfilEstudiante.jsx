import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import axios from 'axios'
import API_BASE_URL from '../../config/api'
import InfoModal from '../../components/ui/InfoModal'
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  CalendarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  KeyIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

const PerfilEstudiante = () => {
  const { user, updateUser } = useAuth()
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [infoModalData, setInfoModalData] = useState({})
  const [controles, setControles] = useState([])
  const [calificaciones, setCalificaciones] = useState([])
  const [loadingCalificaciones, setLoadingCalificaciones] = useState(false)
  const [estadisticas, setEstadisticas] = useState({
    controles_creados: 0,
    ultimo_acceso: null,
    fecha_registro: null
  })

  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    apellidos: user?.apellidos || '',
    email: user?.email || '',
    telefono: user?.telefono || '',
    codigo_estudiante: user?.codigo_estudiante || ''
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  useEffect(() => {
    cargarEstadisticas()
    cargarControlesOperativos()
    cargarCalificaciones()
  }, [])

  const cargarEstadisticas = async () => {
    try {
      const response = await axios.get('/api/auth/estudiante/estadisticas')
      setEstadisticas(response.data)
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
  }

  const cargarControlesOperativos = async () => {
    try {
      const response = await axios.get('/api/control-operativo/list')
      setControles(response.data || [])
    } catch (error) {
      console.error('Error cargando controles operativos:', error)
      setControles([])
    }
  }

  const cargarCalificaciones = async () => {
    try {
      setLoadingCalificaciones(true)
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/calificaciones/estudiante', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCalificaciones(response.data || [])
      console.log('✅ Calificaciones cargadas:', response.data)
    } catch (error) {
      console.error('❌ Error cargando calificaciones:', error)
      setCalificaciones([])
    } finally {
      setLoadingCalificaciones(false)
    }
  }

  const descargarPDF = async (controlId) => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/control-operativo/${controlId}/pdf`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `control_operativo_${controlId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      setInfoModalData({
        title: "PDF Descargado",
        message: "El control operativo se ha descargado correctamente.",
        details: [
          `Control Operativo #${controlId}`,
          "Archivo PDF generado exitosamente",
          "Revisa tu carpeta de descargas"
        ],
        type: "success"
      })
      setShowInfoModal(true)
    } catch (error) {
      console.error('Error descargando PDF:', error)
      setInfoModalData({
        title: "Error al Descargar",
        message: "No se pudo descargar el PDF del control operativo.",
        details: [error.response?.data?.detail || "Error del servidor"],
        type: "error"
      })
      setShowInfoModal(true)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSaveProfile = async () => {
    if (!formData.nombre || !formData.apellidos || !formData.email) {
      setInfoModalData({
        title: "Campos Obligatorios",
        message: "Por favor completa todos los campos obligatorios.",
        details: ["Nombre", "Apellidos", "Email"],
        type: "error"
      })
      setShowInfoModal(true)
      return
    }

    try {
      setLoading(true)
      const response = await axios.put('/api/auth/perfil', formData)
      
      // Actualizar contexto de usuario
      updateUser(response.data)
      
      setInfoModalData({
        title: "Perfil Actualizado",
        message: "Tu información personal ha sido actualizada correctamente.",
        details: ["Los cambios se han guardado exitosamente"],
        type: "success"
      })
      setShowInfoModal(true)
      setEditMode(false)
    } catch (error) {
      setInfoModalData({
        title: "Error",
        message: "No se pudo actualizar el perfil.",
        details: [error.response?.data?.detail || "Error del servidor"],
        type: "error"
      })
      setShowInfoModal(true)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      setInfoModalData({
        title: "Campos Obligatorios",
        message: "Por favor completa todos los campos de contraseña.",
        details: [],
        type: "error"
      })
      setShowInfoModal(true)
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setInfoModalData({
        title: "Error de Confirmación",
        message: "Las contraseñas nuevas no coinciden.",
        details: [],
        type: "error"
      })
      setShowInfoModal(true)
      return
    }

    if (passwordData.new_password.length < 6) {
      setInfoModalData({
        title: "Contraseña Débil",
        message: "La nueva contraseña debe tener al menos 6 caracteres.",
        details: [],
        type: "error"
      })
      setShowInfoModal(true)
      return
    }

    try {
      setLoading(true)
      await axios.put('/api/auth/cambiar-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      })
      
      setInfoModalData({
        title: "Contraseña Cambiada",
        message: "Tu contraseña ha sido actualizada correctamente.",
        details: ["Por seguridad, conserva tu nueva contraseña en un lugar seguro"],
        type: "success"
      })
      setShowInfoModal(true)
      setShowPasswordModal(false)
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
    } catch (error) {
      setInfoModalData({
        title: "Error",
        message: "No se pudo cambiar la contraseña.",
        details: [error.response?.data?.detail || "Verifica tu contraseña actual"],
        type: "error"
      })
      setShowInfoModal(true)
    } finally {
      setLoading(false)
    }
  }

  const cancelEdit = () => {
    setFormData({
      nombre: user?.nombre || '',
      apellidos: user?.apellidos || '',
      email: user?.email || '',
      telefono: user?.telefono || '',
      codigo_estudiante: user?.codigo_estudiante || ''
    })
    setEditMode(false)
  }

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 mb-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isDark ? 'bg-university-purple' : 'bg-university-purple'}`}>
                <span className="text-xl font-bold text-white">
                  {user?.nombre?.charAt(0)}{user?.apellidos?.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  {user?.nombre} {user?.apellidos}
                </h1>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Estudiante de Derecho</p>
                <p className="text-sm text-university-purple font-medium">
                  {user?.codigo_estudiante && `Código: ${user.codigo_estudiante}`}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              {editMode ? (
                <>
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 bg-university-purple text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className={`inline-flex items-center px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center px-4 py-2 bg-university-purple text-white rounded-lg hover:bg-purple-700"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Editar Perfil
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información Personal */}
          <div className="lg:col-span-2">
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-6`}>Información Personal</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                    <UserIcon className="h-4 w-4 inline mr-1" />
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      editMode 
                        ? `focus:ring-2 focus:ring-university-purple focus:border-transparent ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}` 
                        : `${isDark ? 'bg-gray-600 text-gray-300 border-gray-500' : 'bg-gray-100 text-gray-600 border-gray-300'}`
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                    <UserIcon className="h-4 w-4 inline mr-1" />
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      editMode 
                        ? `focus:ring-2 focus:ring-university-purple focus:border-transparent ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}` 
                        : `${isDark ? 'bg-gray-600 text-gray-300 border-gray-500' : 'bg-gray-100 text-gray-600 border-gray-300'}`
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                    <EnvelopeIcon className="h-4 w-4 inline mr-1" />
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      editMode 
                        ? `focus:ring-2 focus:ring-university-purple focus:border-transparent ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}` 
                        : `${isDark ? 'bg-gray-600 text-gray-300 border-gray-500' : 'bg-gray-100 text-gray-600 border-gray-300'}`
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                    <PhoneIcon className="h-4 w-4 inline mr-1" />
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      editMode 
                        ? `focus:ring-2 focus:ring-university-purple focus:border-transparent ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}` 
                        : `${isDark ? 'bg-gray-600 text-gray-300 border-gray-500' : 'bg-gray-100 text-gray-600 border-gray-300'}`
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                    <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                    Código de Estudiante
                  </label>
                  <input
                    type="text"
                    value={formData.codigo_estudiante}
                    disabled
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-600 text-gray-400 border-gray-500' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
                  />
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Este campo no se puede modificar</p>
                </div>
              </div>

              {/* Seguridad */}
              <div className={`mt-8 pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Seguridad</h3>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className={`inline-flex items-center px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                  <KeyIcon className="h-4 w-4 mr-2" />
                  Cambiar Contraseña
                </button>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="space-y-6">
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>
                <ChartBarIcon className="h-5 w-5 inline mr-2" />
                Estadísticas
              </h2>
              
              <div className="space-y-4">
                <div className={`flex justify-between items-center py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Controles Operativos</span>
                  <span className="font-semibold text-university-purple">{estadisticas.controles_creados}</span>
                </div>
                
                <div className={`flex justify-between items-center py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Estado</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}>Activo</span>
                </div>

                {estadisticas.ultimo_acceso && (
                  <div className="py-2">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} block`}>Último acceso</span>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <CalendarIcon className="h-3 w-3 inline mr-1" />
                      {new Date(estadisticas.ultimo_acceso).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}

                {estadisticas.fecha_registro && (
                  <div className="py-2">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} block`}>Miembro desde</span>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <CalendarIcon className="h-3 w-3 inline mr-1" />
                      {new Date(estadisticas.fecha_registro).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Control Operativo */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>
                <DocumentTextIcon className="h-5 w-5 inline mr-2" />
                Control Operativo
              </h2>
              
              {controles.length > 0 ? (
                <div className="space-y-3">
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                    Descarga los PDFs de tus controles operativos registrados
                  </p>
                  
                  {controles.slice(0, 3).map((control) => (
                    <div key={control.id} className={`p-3 border rounded-lg ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            Control #{control.id}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {control.nombre_consultante}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Área: {control.area_consulta || 'Sin área especificada'}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <CalendarIcon className="h-3 w-3 inline mr-1" />
                            {control.fecha_dia}/{control.fecha_mes}/{control.fecha_ano}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => descargarPDF(control.id)}
                          disabled={loading}
                          className="flex items-center px-4 py-2 bg-university-purple text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm transition-colors font-medium"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                          Descargar PDF
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {controles.length > 3 && (
                    <div className="text-center pt-2">
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        +{controles.length - 3} controles más disponibles en la sección Control Operativo
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <DocumentTextIcon className={`h-12 w-12 mx-auto mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    No tienes controles operativos registrados
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                    Crea tu primer control operativo para poder descargar PDFs
                  </p>
                </div>
              )}
            </div>

            {/* Mis Calificaciones */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>
                <ChartBarIcon className="h-5 w-5 inline mr-2" />
                Mis Calificaciones
              </h2>
              
              {loadingCalificaciones ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-university-purple mx-auto mb-3"></div>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Cargando calificaciones...
                  </p>
                </div>
              ) : calificaciones.length > 0 ? (
                <div className="space-y-4">
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                    Evaluaciones de tu desempeño académico
                  </p>
                  
                  {/* Promedio General */}
                  {calificaciones.length > 0 && (
                    <div className={`${isDark ? 'bg-purple-900/30 border-purple-800' : 'bg-purple-50 border-purple-200'} rounded-lg p-4 border mb-4`}>
                      <div className="text-center">
                        <span className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Promedio General</span>
                        <div className={`text-2xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                          {(calificaciones.reduce((sum, cal) => sum + cal.promedio_general, 0) / calificaciones.length).toFixed(1)}/5.0
                        </div>
                        <span className={`text-xs ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                          Basado en {calificaciones.length} evaluación{calificaciones.length !== 1 ? 'es' : ''}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Lista de Calificaciones */}
                  {calificaciones.slice(0, 3).map((calificacion) => (
                    <div key={calificacion.id} className={`p-3 border rounded-lg ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            Control #{calificacion.control_operativo_id}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Evaluado por: {calificacion.profesor_evaluador || calificacion.coordinador_evaluador || 'Sistema'}
                          </p>
                        </div>
                        <div className={`text-right`}>
                          <span className={`text-lg font-bold ${
                            calificacion.promedio_general >= 4.5 ? 'text-green-600' :
                            calificacion.promedio_general >= 3.5 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {calificacion.promedio_general.toFixed(1)}
                          </span>
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/5.0</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
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
                          <span className="font-medium">Trabajo Equipo:</span> {calificacion.trabajo_equipo}/5
                        </div>
                        <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} col-span-2`}>
                          <span className="font-medium">Atención Usuario:</span> {calificacion.atencion_usuario}/5
                        </div>
                      </div>
                      
                      {calificacion.observaciones && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className="font-medium">Observaciones:</span> {calificacion.observaciones}
                          </p>
                        </div>
                      )}
                      
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                        <CalendarIcon className="h-3 w-3 inline mr-1" />
                        {new Date(calificacion.created_at).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                  ))}
                  
                  {calificaciones.length > 3 && (
                    <div className="text-center pt-2">
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        +{calificaciones.length - 3} calificación{calificaciones.length - 3 !== 1 ? 'es' : ''} más
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <ChartBarIcon className={`h-12 w-12 mx-auto mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    No tienes calificaciones registradas
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                    Las calificaciones aparecerán cuando los profesores evalúen tu desempeño
                  </p>
                </div>
              )}
            </div>

            {/* Información del Sistema */}
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Sistema</h2>
              <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} space-y-2`}>
                <p><strong>Rol:</strong> {user?.role}</p>
                <p><strong>Universidad:</strong> Colegio Mayor de Cundinamarca</p>
                <p><strong>Facultad:</strong> Derecho</p>
                <p><strong>Sistema:</strong> Control Operativo v2.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cambiar Contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 w-full max-w-md mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Cambiar Contraseña</h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-1`}>
                  Contraseña Actual *
                </label>
                <input
                  type="password"
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-university-purple ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-1`}>
                  Nueva Contraseña *
                </label>
                <input
                  type="password"
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-university-purple ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-1`}>
                  Confirmar Nueva Contraseña *
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-university-purple ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className={`px-4 py-2 ${isDark ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="px-4 py-2 bg-university-purple text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Informativo */}
      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title={infoModalData.title}
        message={infoModalData.message}
        details={infoModalData.details || []}
        type={infoModalData.type}
      />
    </div>
  )
}

export default PerfilEstudiante