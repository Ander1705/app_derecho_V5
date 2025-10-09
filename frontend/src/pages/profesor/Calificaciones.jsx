import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import axios from 'axios'
import InfoModal from '../../components/ui/InfoModal'
import API_BASE_URL from '../../config/api'
import { 
  StarIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

const Calificaciones = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [controles, setControles] = useState([])
  const [todosLosControles, setTodosLosControles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // 🚀 CACHE LOCAL para rendimiento
  const [cache, setCache] = useState(null)
  const [lastFetch, setLastFetch] = useState(null)
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const [selectedControl, setSelectedControl] = useState(null)
  const [calificacionForm, setCalificacionForm] = useState({
    cumplimiento_horario: 0,
    presentacion_personal: 0,
    conocimiento_juridico: 0,
    trabajo_equipo: 0,
    atencion_usuario: 0,
    observaciones: ''
  })
  const [saving, setSaving] = useState(false)
  
  // Estados para modales
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    cargarControlesParaCalificar()
  }, [])

  const cargarControlesParaCalificar = async (force = false) => {
    // 🚀 CACHE: Solo fetch si no hay cache o han pasado más de 2 minutos
    const now = Date.now()
    if (!force && cache && lastFetch && (now - lastFetch) < 120000) {
      console.log('📦 Usando datos del cache local')
      const controlesCompletos = cache.filter(c => 
        c.estado_flujo === 'completo' && !c.ya_calificado
      )
      setTodosLosControles(cache)
      setControles(controlesCompletos)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/profesor/controles-asignados`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      console.log('🔍 Cargando desde servidor - Controles recibidos:', response.data?.length || 0)
      
      const data = response.data || []
      
      // 📦 GUARDAR EN CACHE
      setCache(data)
      setLastFetch(now)
      
      // Filtrar solo controles completos que necesitan calificación
      const controlesCompletos = data.filter(c => 
        c.estado_flujo === 'completo' && !c.ya_calificado
      )
      
      console.log('✅ Controles listos para calificar:', controlesCompletos.length)
      
      setTodosLosControles(data)
      setControles(controlesCompletos)
    } catch (error) {
      console.error('Error cargando controles:', error)
      setError('Error al cargar los controles para calificar')
    } finally {
      setLoading(false)
    }
  }

  const handleSeleccionarControl = (control) => {
    setSelectedControl(control)
    // Resetear formulario con valores vacíos (0 estrellas)
    setCalificacionForm({
      cumplimiento_horario: 0,
      presentacion_personal: 0,
      conocimiento_juridico: 0,
      trabajo_equipo: 0,
      atencion_usuario: 0,
      observaciones: ''
    })
  }

  const handleCalificacionChange = (criterio, valor) => {
    setCalificacionForm(prev => ({
      ...prev,
      [criterio]: valor
    }))
  }

  const renderStars = (criterio, valor) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleCalificacionChange(criterio, star)}
            className={`w-8 h-8 transition-colors duration-200 ${
              star <= valor ? 'text-yellow-400' : isDark ? 'text-gray-600' : 'text-gray-300'
            }`}
          >
            {star <= valor ? <StarIconSolid className="w-full h-full" /> : <StarIcon className="w-full h-full" />}
          </button>
        ))}
        <span className={`ml-2 text-sm font-medium ${
          valor === 0 
            ? isDark ? 'text-gray-500' : 'text-gray-400'
            : isDark ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {valor === 0 ? 'Sin calificar' : `${valor}/5`}
        </span>
      </div>
    )
  }

  const handleGuardarCalificacion = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      // Validar que todos los criterios tengan al menos 1 estrella
      const criteriosSinCalificar = Object.keys(calificacionForm)
        .filter(key => key !== 'observaciones')
        .filter(key => calificacionForm[key] === 0)
      
      if (criteriosSinCalificar.length > 0) {
        const criteriosTexto = criteriosSinCalificar.map(getCriterioTitle).join(', ')
        setErrorMessage(`Por favor califica todos los criterios. Falta calificar: ${criteriosTexto}`)
        setShowErrorModal(true)
        setSaving(false)
        return
      }
      
      // Obtener el ID del estudiante creador del control
      const estudianteId = selectedControl.created_by || selectedControl.created_by_id
      
      if (!estudianteId) {
        setErrorMessage('Error: No se pudo identificar al estudiante para calificar')
        setShowErrorModal(true)
        setSaving(false)
        return
      }

      const calificacionData = {
        control_operativo_id: selectedControl.id,
        estudiante_id: estudianteId,
        cumplimiento_horario: calificacionForm.cumplimiento_horario,
        presentacion_personal: calificacionForm.presentacion_personal,
        conocimiento_juridico: calificacionForm.conocimiento_juridico,
        trabajo_equipo: calificacionForm.trabajo_equipo,
        atencion_usuario: calificacionForm.atencion_usuario,
        observaciones: calificacionForm.observaciones
      }

      await axios.post(
        `${API_BASE_URL}/profesor/calificaciones`,
        calificacionData,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Mostrar modal de éxito
      setSuccessMessage(`¡Calificación guardada exitosamente! El control #${selectedControl.id} ha sido removido de la lista de pendientes. El estudiante ${selectedControl.nombre_estudiante} ha sido notificado.`)
      setShowSuccessModal(true)
      setSelectedControl(null)
      
      // Recargar controles para actualizar la lista
      cargarControlesParaCalificar()
    } catch (error) {
      console.error('Error guardando calificación:', error)
      if (error.response?.status === 409) {
        setErrorMessage('Error: Ya existe una calificación para este estudiante en este control operativo')
      } else {
        setErrorMessage('Error al guardar la calificación: ' + (error.response?.data?.error || error.message))
      }
      setShowErrorModal(true)
    } finally {
      setSaving(false)
    }
  }

  const getCriterioIcon = (criterio) => {
    switch (criterio) {
      case 'cumplimiento_horario':
        return <ClockIcon className="w-6 h-6" />
      case 'presentacion_personal':
        return <UserGroupIcon className="w-6 h-6" />
      case 'conocimiento_juridico':
        return <AcademicCapIcon className="w-6 h-6" />
      case 'trabajo_equipo':
        return <UserGroupIcon className="w-6 h-6" />
      case 'atencion_usuario':
        return <ChatBubbleLeftRightIcon className="w-6 h-6" />
      default:
        return <StarIcon className="w-6 h-6" />
    }
  }

  const getCriterioTitle = (criterio) => {
    switch (criterio) {
      case 'cumplimiento_horario':
        return 'Cumplimiento de Horario'
      case 'presentacion_personal':
        return 'Presentación Personal'
      case 'conocimiento_juridico':
        return 'Conocimiento Jurídico'
      case 'trabajo_equipo':
        return 'Trabajo en Equipo'
      case 'atencion_usuario':
        return 'Atención al Usuario'
      default:
        return criterio
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Calificar Estudiantes
              </h1>
              <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Califica el desempeño de los estudiantes en los controles operativos completados y sin calificar
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setMostrarTodos(!mostrarTodos)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {mostrarTodos ? 'Solo Listos' : 'Ver Todos'}
              </button>
              <button
                onClick={cargarControlesParaCalificar}
                disabled={loading}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : isDark
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? 'Actualizando...' : 'Actualizar Lista'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lista de Controles Para Calificar */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {mostrarTodos 
                  ? `Todos los Controles Asignados (${todosLosControles.length})`
                  : `Controles Pendientes de Calificar (${controles.length})`
                }
              </h2>
              {!mostrarTodos && controles.length > 0 && (
                <span className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-600'} flex items-center`}>
                  ⚠️ Al calificar, el control se quita de esta lista
                </span>
              )}
            </div>
            
            {(mostrarTodos ? todosLosControles : controles).length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {mostrarTodos 
                    ? "No hay controles asignados a este profesor." 
                    : "¡Excelente! No hay controles pendientes de calificar."
                  }
                </p>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {mostrarTodos 
                    ? "Los controles aparecerán cuando sean asignados a este profesor." 
                    : "Todos los controles completos ya han sido calificados. Los nuevos controles aparecerán aquí cuando estén completos y necesiten calificación."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(mostrarTodos ? todosLosControles : controles).map((control) => (
                  <div
                    key={control.id}
                    onClick={() => !control.ya_calificado && handleSeleccionarControl(control)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      control.ya_calificado
                        ? isDark 
                          ? 'cursor-not-allowed opacity-60 bg-gray-800 border-gray-700' 
                          : 'cursor-not-allowed opacity-60 bg-gray-100 border-gray-300'
                        : selectedControl?.id === control.id
                          ? isDark 
                            ? 'border-blue-500 bg-blue-900/20 cursor-pointer' 
                            : 'border-blue-500 bg-blue-50 cursor-pointer'
                          : isDark
                            ? 'border-gray-700 hover:border-gray-600 bg-gray-700/50 cursor-pointer'
                            : 'border-gray-200 hover:border-gray-300 bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Control #{control.id}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          Estudiante: {control.nombre_estudiante}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Consultante: {control.nombre_consultante}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Área: {control.area_consulta}
                        </p>
                      </div>
                      <div className="flex items-center">
                        {mostrarTodos ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            control.ya_calificado
                              ? isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-800'
                              : control.estado_flujo === 'completo' 
                                ? isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                                : control.estado_flujo === 'pendiente_profesor' 
                                  ? isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
                                  : control.estado_flujo === 'con_resultado'
                                    ? isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                                    : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {control.ya_calificado && 'Ya calificado'}
                            {!control.ya_calificado && control.estado_flujo === 'completo' && 'Listo para calificar'}
                            {!control.ya_calificado && control.estado_flujo === 'pendiente_profesor' && 'Pendiente concepto'}
                            {!control.ya_calificado && control.estado_flujo === 'con_resultado' && 'Con resultado'}
                            {!control.ya_calificado && !['completo', 'pendiente_profesor', 'con_resultado'].includes(control.estado_flujo) && control.estado_flujo}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Listo para calificar
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario de Calificación */}
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
            {selectedControl ? (
              <>
                <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Calificar Estudiante
                </h2>
                
                {/* Información del Control */}
                <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Control #{selectedControl.id}
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <strong>Estudiante:</strong> {selectedControl.nombre_estudiante}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <strong>Consultante:</strong> {selectedControl.nombre_consultante}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <strong>Área:</strong> {selectedControl.area_consulta}
                  </p>
                </div>

                {/* Criterios de Calificación */}
                <div className="space-y-6">
                  {Object.keys(calificacionForm).filter(key => key !== 'observaciones').map((criterio) => (
                    <div key={criterio} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          {getCriterioIcon(criterio)}
                        </div>
                        <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {getCriterioTitle(criterio)}
                        </label>
                      </div>
                      {renderStars(criterio, calificacionForm[criterio])}
                    </div>
                  ))}

                  {/* Observaciones */}
                  <div className="space-y-2">
                    <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Observaciones (Opcional)
                    </label>
                    <textarea
                      value={calificacionForm.observaciones}
                      onChange={(e) => handleCalificacionChange('observaciones', e.target.value)}
                      rows={4}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="Comentarios adicionales sobre el desempeño del estudiante..."
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="flex space-x-4 mt-8">
                  <button
                    onClick={() => setSelectedControl(null)}
                    className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${
                      isDark
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarCalificacion}
                    disabled={saving || Object.keys(calificacionForm).filter(key => key !== 'observaciones').some(key => calificacionForm[key] === 0)}
                    className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
                      saving
                        ? 'bg-gray-400 cursor-not-allowed'
                        : Object.keys(calificacionForm).filter(key => key !== 'observaciones').some(key => calificacionForm[key] === 0)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {saving 
                      ? 'Guardando...' 
                      : Object.keys(calificacionForm).filter(key => key !== 'observaciones').some(key => calificacionForm[key] === 0)
                        ? 'Complete todas las calificaciones'
                        : 'Guardar Calificación'
                    }
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <StarIcon className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                  Selecciona un Control
                </h3>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Elige un control operativo de la lista para comenzar a calificar al estudiante.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Éxito */}
        <InfoModal
          isOpen={showSuccessModal}
          title="¡Calificación Guardada!"
          message={successMessage}
          type="success"
          onClose={() => setShowSuccessModal(false)}
        />

        {/* Modal de Error */}
        <InfoModal
          isOpen={showErrorModal}
          title="Error"
          message={errorMessage}
          type="error"
          onClose={() => setShowErrorModal(false)}
        />
      </div>
    </div>
  )
}

export default Calificaciones