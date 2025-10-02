import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
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
  AcademicCapIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

const PerfilCoordinador = () => {
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [infoModalData, setInfoModalData] = useState({})
  const [controles, setControles] = useState([])
  const [estadisticas, setEstadisticas] = useState({
    estudiantes_gestionados: 0,
    reportes_supervisados: 0,
    ultimo_acceso: null,
    fecha_ingreso: null
  })

  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    apellidos: user?.apellidos || '',
    email: user?.email || '',
    telefono: user?.telefono || '',
    codigo_coordinador: user?.codigo_coordinador || user?.id || ''
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  useEffect(() => {
    cargarEstadisticas()
    cargarControlesOperativos()
  }, [])

  const cargarEstadisticas = async () => {
    try {
      // Obtener estadísticas reales del coordinador
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/coordinador/estadisticas-completas', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const stats = response.data
      
      setEstadisticas({
        estudiantes_gestionados: stats.totalEstudiantes || 0,
        reportes_supervisados: stats.totalControles || 0,
        ultimo_acceso: new Date().toISOString(),
        fecha_ingreso: user?.created_at || new Date().toISOString()
      })
      
      console.log('✅ Estadísticas del perfil coordinador calculadas:', {
        estudiantes_gestionados: stats.totalEstudiantes,
        reportes_supervisados: stats.totalControles
      })
      
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
      // Datos de ejemplo en caso de error
      setEstadisticas({
        estudiantes_gestionados: 45,
        reportes_supervisados: 156,
        ultimo_acceso: new Date().toISOString(),
        fecha_ingreso: user?.created_at || new Date().toISOString()
      })
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
      codigo_coordinador: user?.codigo_coordinador || user?.id || ''
    })
    setEditMode(false)
  }

  return (
    <div className="min-h-full bg-theme-secondary">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="card-theme rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center">
                <AcademicCapIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-theme-primary">
                  {user?.nombre} {user?.apellidos}
                </h1>
                <p className="text-theme-secondary">Coordinador - Consultorio Jurídico</p>
                <p className="text-sm text-blue-600 font-medium">
                  {formData.codigo_coordinador && `ID: ${formData.codigo_coordinador}`}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              {editMode ? (
                <>
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="btn-theme-primary inline-flex items-center px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="btn-theme-secondary inline-flex items-center px-4 py-2 rounded-lg"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="btn-theme-primary inline-flex items-center px-4 py-2 rounded-lg"
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
            <div className="card-theme rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-theme-primary mb-6">Información Personal</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
                    <UserIcon className="h-4 w-4 inline mr-1" />
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`input-theme w-full px-3 py-2 rounded-lg ${
                      editMode 
                        ? 'focus:ring-2 focus:ring-blue-600 focus:border-transparent' 
                        : 'bg-theme-tertiary text-theme-secondary'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
                    <UserIcon className="h-4 w-4 inline mr-1" />
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`input-theme w-full px-3 py-2 rounded-lg ${
                      editMode 
                        ? 'focus:ring-2 focus:ring-blue-600 focus:border-transparent' 
                        : 'bg-theme-tertiary text-theme-secondary'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
                    <EnvelopeIcon className="h-4 w-4 inline mr-1" />
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`input-theme w-full px-3 py-2 rounded-lg ${
                      editMode 
                        ? 'focus:ring-2 focus:ring-blue-600 focus:border-transparent' 
                        : 'bg-theme-tertiary text-theme-secondary'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
                    <PhoneIcon className="h-4 w-4 inline mr-1" />
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className={`input-theme w-full px-3 py-2 rounded-lg ${
                      editMode 
                        ? 'focus:ring-2 focus:ring-blue-600 focus:border-transparent' 
                        : 'bg-theme-tertiary text-theme-secondary'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
                    <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                    ID de Coordinador
                  </label>
                  <input
                    type="text"
                    value={formData.codigo_coordinador}
                    disabled
                    className="input-theme w-full px-3 py-2 rounded-lg bg-theme-tertiary text-theme-secondary"
                  />
                  <p className="text-xs text-theme-muted mt-1">Este campo no se puede modificar</p>
                </div>
              </div>

              {/* Seguridad */}
              <div className="mt-8 pt-6 border-t border-theme">
                <h3 className="text-lg font-medium text-theme-primary mb-4">Seguridad</h3>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="btn-theme-secondary inline-flex items-center px-4 py-2 rounded-lg"
                >
                  <KeyIcon className="h-4 w-4 mr-2" />
                  Cambiar Contraseña
                </button>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="space-y-6">
            <div className="card-theme rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-theme-primary mb-4">
                <ChartBarIcon className="h-5 w-5 inline mr-2" />
                Estadísticas
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-theme">
                  <span className="text-sm text-theme-secondary">Estudiantes Gestionados</span>
                  <span className="font-semibold text-blue-600">{estadisticas.estudiantes_gestionados}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-theme">
                  <span className="text-sm text-theme-secondary">Reportes Supervisados</span>
                  <span className="font-semibold text-blue-600">{estadisticas.reportes_supervisados}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-theme">
                  <span className="text-sm text-theme-secondary">Estado</span>
                  <span className="px-2 py-1 bg-green-100 [data-theme='dark'] & bg-green-900/30 text-green-800 [data-theme='dark'] & text-green-200 text-xs rounded-full">Activo</span>
                </div>

                {estadisticas.ultimo_acceso && (
                  <div className="py-2">
                    <span className="text-sm text-theme-secondary block">Último acceso</span>
                    <span className="text-xs text-theme-muted">
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

                {estadisticas.fecha_ingreso && (
                  <div className="py-2">
                    <span className="text-sm text-theme-secondary block">Coordinador desde</span>
                    <span className="text-xs text-theme-muted">
                      <CalendarIcon className="h-3 w-3 inline mr-1" />
                      {new Date(estadisticas.fecha_ingreso).toLocaleDateString('es-ES', {
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
            <div className="card-theme rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-theme-primary mb-4">
                <DocumentTextIcon className="h-5 w-5 inline mr-2" />
                Control Operativo
              </h2>
              
              {controles.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-theme-secondary mb-4">
                    Como coordinador, puedes descargar PDFs de todos los controles operativos
                  </p>
                  
                  {controles.slice(0, 3).map((control) => (
                    <div key={control.id} className="p-3 border border-theme rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-theme-primary">
                            Control #{control.id}
                          </p>
                          <p className="text-xs text-theme-secondary">
                            Consultante: {control.nombre_consultante}
                          </p>
                          <p className="text-xs text-theme-secondary">
                            Estudiante: {control.nombre_estudiante}
                          </p>
                          <p className="text-xs text-theme-secondary">
                            Área: {control.area_consulta || 'Sin área especificada'}
                          </p>
                          <p className="text-xs text-theme-muted">
                            <CalendarIcon className="h-3 w-3 inline mr-1" />
                            {control.fecha_dia}/{control.fecha_mes}/{control.fecha_ano}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => descargarPDF(control.id)}
                          disabled={loading}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors font-medium"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                          Descargar PDF
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {controles.length > 3 && (
                    <div className="text-center pt-2">
                      <p className="text-xs text-theme-muted">
                        +{controles.length - 3} controles más disponibles en la sección Control Operativo
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <DocumentTextIcon className="h-12 w-12 text-theme-muted mx-auto mb-3" />
                  <p className="text-sm text-theme-secondary">
                    No hay controles operativos registrados
                  </p>
                  <p className="text-xs text-theme-muted mt-1">
                    Los controles creados por estudiantes aparecerán aquí
                  </p>
                </div>
              )}
            </div>

            {/* Información del Sistema */}
            <div className="card-theme rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-theme-primary mb-4">Sistema</h2>
              <div className="text-sm text-theme-secondary space-y-2">
                <p><strong>Rol:</strong> {user?.role}</p>
                <p><strong>Universidad:</strong> Colegio Mayor de Cundinamarca</p>
                <p><strong>Facultad:</strong> Derecho</p>
                <p><strong>Departamento:</strong> Consultorio Jurídico</p>
                <p><strong>Sistema:</strong> Control Operativo v2.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cambiar Contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-theme rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">Cambiar Contraseña</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">
                  Contraseña Actual *
                </label>
                <input
                  type="password"
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  className="input-theme w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">
                  Nueva Contraseña *
                </label>
                <input
                  type="password"
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  className="input-theme w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">
                  Confirmar Nueva Contraseña *
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  className="input-theme w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 text-theme-secondary hover:text-theme-primary"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="btn-theme-primary px-4 py-2 rounded-lg disabled:opacity-50"
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

export default PerfilCoordinador