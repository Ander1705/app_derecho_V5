import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import InfoModal from '../../components/ui/InfoModal'
import API_BASE_URL from '../../config/api'

const ControlesAsignados = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [controles, setControles] = useState([])
  const [controlesOriginales, setControlesOriginales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedControl, setSelectedControl] = useState(null)
  const [conceptoAsesor, setConceptoAsesor] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const [controlesFiltrados, setControlesFiltrados] = useState([])
  const [searchParams] = useSearchParams()
  const [filtros, setFiltros] = useState({
    busqueda: '',
    mes: '',
    ano: '',
    estado: searchParams.get('estado') || searchParams.get('filtro') === 'pendientes' ? 'pendientes' : 'todos'
  })
  
  // Estados para calificaciones
  const [showCalificacionModal, setShowCalificacionModal] = useState(false)
  const [controlParaCalificar, setControlParaCalificar] = useState(null)
  const [calificacionForm, setCalificacionForm] = useState({
    cumplimiento_horario: 5,
    presentacion_personal: 5,
    conocimiento_juridico: 5,
    trabajo_equipo: 5,
    atencion_usuario: 5,
    observaciones: ''
  })
  const [savingCalificacion, setSavingCalificacion] = useState(false)
  
  // Estados para modales de éxito y error
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    cargarControlesAsignados()
  }, [])

  // Actualización automática cada 30 segundos (optimizada)
  useEffect(() => {
    const interval = setInterval(() => {
      // Solo actualizar si no se está cargando actualmente
      if (!loading) {
        console.log('🔄 Actualizando controles asignados automáticamente...')
        cargarControlesAsignados()
      }
    }, 30000) // 30 segundos
    
    return () => clearInterval(interval)
  }, [loading])

  // Actualización cuando se regresa a la pestaña
  useEffect(() => {
    const handleFocus = () => {
      console.log('👁️ Pestaña enfocada, actualizando controles...')
      cargarControlesAsignados()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Efecto para actualizar filtros cuando cambian los parámetros de URL
  useEffect(() => {
    const estadoUrl = searchParams.get('estado') || (searchParams.get('filtro') === 'pendientes' ? 'pendientes' : 'todos')
    console.log('🔄 Parámetro estado de URL cambió:', estadoUrl)
    
    // Limpiar búsqueda al cambiar filtros desde dashboard
    setSearchTerm('')
    setSearchMode(false)
    
    setFiltros(prevFiltros => ({
      ...prevFiltros,
      estado: estadoUrl,
      busqueda: '' // También limpiar la búsqueda en filtros
    }))
    
    // Restaurar datos originales
    if (controlesOriginales.length > 0) {
      setControles(controlesOriginales)
      setControlesFiltrados(controlesOriginales)
    }
  }, [searchParams, controlesOriginales])

  // ⭐ BÚSQUEDA EN TIEMPO REAL - BÚSQUEDA LOCAL EN CONTROLES DEL PROFESOR
  // Diferente al coordinador: busca localmente en controlesOriginales en lugar de hacer llamadas al servidor
  // Esto es más eficiente para profesores que tienen un conjunto limitado de controles asignados
  const [searchTerm, setSearchTerm] = useState('')
  
  // Buscar inmediatamente mientras escribe (igual al coordinador)
  const handleBusquedaChange = async (e) => {
    const valor = e.target.value
    setSearchTerm(valor)
    setFiltros({...filtros, busqueda: valor}) // Mantener sincronizado
    console.log('📝 Profesor buscando en tiempo real:', valor)
    
    // Si está vacío, restaurar datos inmediatamente
    if (!valor.trim()) {
      console.log('🔄 Restaurando datos originales del profesor')
      console.log('📋 Controles originales a restaurar:', controlesOriginales.length)
      console.log('📋 Primeros 2 controles originales:', controlesOriginales.slice(0, 2).map(c => ({ id: c.id, consultante: c.nombre_consultante })))
      setSearchMode(false)
      setControles(controlesOriginales)
      setControlesFiltrados(controlesOriginales)
      console.log('✅ Datos restaurados - searchMode: false')
      return
    }
    
    // Asegurarse de que hay controles originales antes de buscar
    if (controlesOriginales.length === 0) {
      console.log('⚠️ No hay controles originales cargados, recargando...')
      await cargarControlesAsignados()
      return
    }
    
    // Si tiene al menos 1 caracter, buscar inmediatamente
    if (valor.trim().length >= 1) {
      await ejecutarBusquedaTiempoReal(valor.trim())
    }
  }
  
  // Función para buscar en tiempo real - BÚSQUEDA LOCAL EN CONTROLES DEL PROFESOR
  const ejecutarBusquedaTiempoReal = async (busqueda) => {
    try {
      console.log('🔍 Profesor - Búsqueda local en controles asignados:', busqueda)
      console.log('📋 Controles originales disponibles:', controlesOriginales.length)
      
      if (!controlesOriginales || controlesOriginales.length === 0) {
        console.log('❌ No hay controles originales para buscar')
        setControles([])
        setControlesFiltrados([])
        setSearchMode(true)
        return
      }
      
      // Buscar localmente en los controles ya asignados al profesor
      const busquedaLower = busqueda.toLowerCase().trim()
      const resultadosLocales = controlesOriginales.filter(control => {
        const id = control.id?.toString().toLowerCase() || ''
        const nombreConsultante = control.nombre_consultante?.toLowerCase().trim() || ''
        const nombreEstudiante = control.nombre_estudiante?.toLowerCase().trim() || ''
        const numeroDocumento = control.numero_documento?.toString().toLowerCase() || ''
        const areaConsulta = control.area_consulta?.toLowerCase().trim() || ''
        
        // Si es búsqueda numérica, priorizar ID y documento
        if (/^\d+$/.test(busqueda.trim())) {
          console.log('🔢 Búsqueda numérica:', busqueda)
          return id.includes(busquedaLower) || numeroDocumento.includes(busquedaLower)
        } else {
          console.log('📝 Búsqueda de texto:', busqueda)
          return nombreConsultante.includes(busquedaLower) ||
                 nombreEstudiante.includes(busquedaLower) ||
                 areaConsulta.includes(busquedaLower) ||
                 numeroDocumento.includes(busquedaLower)
        }
      })
      
      console.log('✅ Resultados encontrados localmente:', resultadosLocales.length)
      
      if (resultadosLocales.length > 0) {
        console.log('📋 Controles encontrados:', resultadosLocales.map(r => ({ 
          id: r.id, 
          consultante: r.nombre_consultante,
          estudiante: r.nombre_estudiante
        })))
      }
      
      // Actualizar estados
      setControles(resultadosLocales)
      setControlesFiltrados(resultadosLocales)
      setSearchMode(true)
      
    } catch (error) {
      console.error('❌ Error en búsqueda local del profesor:', error)
      setControles([])
      setControlesFiltrados([])
      setSearchMode(true)
    }
  }

  // Efecto para filtrar controles localmente solo por mes/año/estado cuando no hay búsqueda
  useEffect(() => {
    if (!searchTerm.trim() && !searchMode) {
      console.log('🎛️ Aplicando filtros locales (mes/año/estado)')
      aplicarFiltros()
    }
  }, [controles, filtros.mes, filtros.ano, filtros.estado, searchTerm, searchMode])

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
    for (let i = anoActual; i >= anoActual - 5; i--) {
      anos.push(i)
    }
    return anos
  })()

  const aplicarFiltros = () => {
    let controlesParaFiltrar = [...controles]

    // Filtro por búsqueda (ID, cédula, nombre, área) - NOTA: Ya no se usa porque tenemos búsqueda en tiempo real
    if (searchTerm.trim()) {
      const busqueda = searchTerm.toLowerCase().trim()
      controlesParaFiltrar = controlesParaFiltrar.filter(control => {
        const nombreConsultante = control.nombre_consultante?.toLowerCase().trim() || ''
        const nombreEstudiante = control.nombre_estudiante?.toLowerCase().trim() || ''
        const areaConsulta = control.area_consulta?.toLowerCase().trim() || ''
        const numeroDocumento = control.numero_documento?.toString().toLowerCase() || ''
        const id = control.id?.toString().toLowerCase() || ''
        
        // Búsqueda exacta por ID (prioridad)
        if (busqueda === id) {
          return true
        }
        
        // Búsqueda parcial por ID (si parece un número)
        if (/^\d+$/.test(searchTerm.trim()) && id.includes(busqueda)) {
          return true
        }
        
        // Búsqueda en otros campos
        return nombreConsultante.includes(busqueda) ||
               nombreEstudiante.includes(busqueda) ||
               areaConsulta.includes(busqueda) ||
               numeroDocumento.includes(busqueda)
      })
    }

    // Filtro por mes y año usando los campos de fecha del formulario
    if (filtros.mes || filtros.ano) {
      controlesParaFiltrar = controlesParaFiltrar.filter(control => {
        let cumpleMes = true
        let cumpleAno = true
        
        // Usar fecha del formulario si está disponible, sino usar created_at
        if (control.fecha_mes && control.fecha_ano) {
          if (filtros.mes) {
            cumpleMes = control.fecha_mes === parseInt(filtros.mes)
          }
          
          if (filtros.ano) {
            cumpleAno = control.fecha_ano === parseInt(filtros.ano)
          }
        } else if (control.created_at) {
          // Fallback a fecha de creación si no hay fecha de formulario
          try {
            const fechaCreacion = new Date(control.created_at)
            
            if (filtros.mes && !isNaN(fechaCreacion.getTime())) {
              cumpleMes = (fechaCreacion.getMonth() + 1) === parseInt(filtros.mes)
            }
            
            if (filtros.ano && !isNaN(fechaCreacion.getTime())) {
              cumpleAno = fechaCreacion.getFullYear() === parseInt(filtros.ano)
            }
          } catch (error) {
            // Si hay error parseando la fecha, no coincide con los filtros de fecha
            if (filtros.mes) cumpleMes = false
            if (filtros.ano) cumpleAno = false
          }
        } else {
          // Si no hay fecha de creación, no coincide con los filtros de fecha
          if (filtros.mes) cumpleMes = false
          if (filtros.ano) cumpleAno = false
        }
        
        return cumpleMes && cumpleAno
      })
    }

    // Filtro por estado
    if (filtros.estado !== 'todos') {
      console.log('🎛️ Aplicando filtro de estado:', filtros.estado)
      switch (filtros.estado) {
        case 'pendientes':
          controlesParaFiltrar = controlesParaFiltrar.filter(control => 
            control.estado_flujo === 'pendiente_profesor'
          )
          console.log('📋 Controles pendientes encontrados:', controlesParaFiltrar.length)
          break
        case 'completados':
          controlesParaFiltrar = controlesParaFiltrar.filter(control => 
            control.estado_flujo === 'completo' || control.estado_flujo === 'con_resultado'
          )
          console.log('📋 Controles completados encontrados:', controlesParaFiltrar.length)
          break
      }
    } else {
      console.log('📋 Mostrando todos los controles:', controlesParaFiltrar.length)
    }

    setControlesFiltrados(controlesParaFiltrar)
  }

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      mes: '',
      ano: '',
      estado: 'todos'
    })
    setSearchTerm('') // También limpiar el término de búsqueda
    setSearchMode(false)
    // Recargar controles normales cuando se limpian filtros
    cargarControlesAsignados()
  }


  const cargarControlesAsignados = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      try {
        const response = await axios.get(`${API_BASE_URL}/profesor/controles-asignados`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        // Extraer solo el array de controles de la respuesta con validación defensiva
        const controlesArray = Array.isArray(response.data) ? response.data : (response.data?.data || [])
        
        // Validación defensiva adicional para asegurar que es un array válido
        const validControlesArray = Array.isArray(controlesArray) ? controlesArray : []
        
        setControles(validControlesArray)
        setControlesOriginales(validControlesArray)
        console.log('✅ Controles cargados desde el backend:', controlesArray.length)
        console.log('📋 Controles originales establecidos:', controlesArray.length)
        
        // MENSAJE ESPECÍFICO PARA BOTONES CALIFICAR
        const controlesCompletos = controlesArray?.filter(c => c.estado_flujo === 'completo') || []
        if (controlesCompletos.length > 0) {
          console.log('🎯 SE DEBEN MOSTRAR BOTONES CALIFICAR PARA:', controlesCompletos.map(c => `Control ID ${c.id} - ${c.nombre_estudiante}`))
        } else {
          console.log('❌ NO HAY CONTROLES COMPLETOS - NO SE MOSTRARAN BOTONES CALIFICAR')
        }
      } catch (backendError) {
        console.log('🔧 Backend no disponible, usando datos mock para demostración')
        
        // 🎯 DATOS MOCK FUNCIONALES - Controles asignados al profesor
        const mockControles = [
          {
            id: 1,
            created_at: new Date().toISOString(),
            nombre_estudiante: 'Carlos Andrés Rodríguez',
            nombre_consultante: 'María Elena González',
            numero_documento: '1234567890',
            area_consulta: 'Civil',
            estado_flujo: 'pendiente_profesor',
            concepto_asesor: null,
            descripcion_caso: 'Consulta sobre contrato de arrendamiento con cláusulas abusivas',
            concepto_estudiante: 'Análisis jurídico preliminar del caso de arrendamiento'
          },
          {
            id: 2,
            created_at: new Date(Date.now() - 86400000).toISOString(), // Ayer
            nombre_estudiante: 'Ana Isabel Martínez',
            nombre_consultante: 'Pedro José Ramírez',
            numero_documento: '9876543210',
            area_consulta: 'Laboral',
            estado_flujo: 'completo',
            concepto_asesor: 'Se recomienda presentar demanda por despido injustificado',
            descripcion_caso: 'Despido sin justa causa de trabajador con 5 años de antigüedad',
            concepto_estudiante: 'Análisis de estabilidad laboral reforzada'
          },
          {
            id: 3,
            created_at: new Date(Date.now() - 172800000).toISOString(), // Hace 2 días
            nombre_estudiante: 'Luis Fernando Castro',
            nombre_consultante: 'Carmen Rosa López',
            numero_documento: '1122334455',
            area_consulta: 'Familia',
            estado_flujo: 'con_resultado',
            concepto_asesor: 'Procede la demanda de custodia. Se debe adjuntar documentación adicional',
            descripcion_caso: 'Proceso de custodia de menor de edad',
            concepto_estudiante: 'Análisis del interés superior del menor'
          },
          {
            id: 4,
            created_at: new Date(Date.now() - 259200000).toISOString(), // Hace 3 días
            nombre_estudiante: 'Jennifer Paola Herrera',
            nombre_consultante: 'Roberto Carlos Mendoza',
            numero_documento: '2233445566',
            area_consulta: 'Penal',
            estado_flujo: 'pendiente_profesor',
            concepto_asesor: null,
            descripcion_caso: 'Denuncia por hurto calificado y daño en bien ajeno',
            concepto_estudiante: 'Análisis de tipificación penal y agravantes del delito'
          }
        ]
        
        setControles(mockControles)
        setControlesOriginales(mockControles)
        console.log('📊 Usando datos mock - Total controles:', mockControles.length)
        console.log('📋 Controles originales mock establecidos:', mockControles.length)
      }
    } catch (error) {
      console.error('❌ Error general cargando controles:', error)
      setError('Error al cargar los controles operativos')
      
      // Fallback con al menos un control de ejemplo
      const fallbackControles = [
        {
          id: 1,
          created_at: new Date().toISOString(),
          nombre_estudiante: 'Estudiante Demo',
          nombre_consultante: 'Consultante Demo',
          numero_documento: '123456789',
          area_consulta: 'Civil',
          estado_flujo: 'pendiente_profesor',
          concepto_asesor: null,
          descripcion_caso: 'Caso de demostración del sistema',
          concepto_estudiante: 'Análisis de demostración'
        }
      ]
      setControles(fallbackControles)
      setControlesOriginales(fallbackControles)
      console.log('🆘 Fallback controles establecidos:', fallbackControles.length)
    } finally {
      setLoading(false)
    }
  }

  const handleVerDetalle = (control) => {
    setSelectedControl(control)
    setConceptoAsesor(control.concepto_asesor || '')
  }

  const handleGuardarConcepto = async () => {
    if (!conceptoAsesor.trim()) {
      setErrorMessage('Por favor ingrese el concepto del asesor')
      setShowErrorModal(true)
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      await axios.put(
        `${API_BASE_URL}/profesor/control-operativo/${selectedControl.id}/concepto`,
        { concepto_asesor: conceptoAsesor },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Mostrar modal de éxito
      setSuccessMessage('Concepto de asesor jurídico guardado exitosamente. El estudiante será notificado.')
      setShowSuccessModal(true)
      setSelectedControl(null)
      cargarControlesAsignados() // Recargar la lista
    } catch (error) {
      console.error('Error guardando concepto:', error)
      setErrorMessage('Error al guardar el concepto: ' + (error.response?.data?.error || error.message))
      setShowErrorModal(true)
    } finally {
      setSaving(false)
    }
  }

  // Funciones para calificaciones
  const handleCalificarEstudiante = (control) => {
    setControlParaCalificar(control)
    setCalificacionForm({
      cumplimiento_horario: 5,
      presentacion_personal: 5,
      conocimiento_juridico: 5,
      trabajo_equipo: 5,
      atencion_usuario: 5,
      observaciones: ''
    })
    setShowCalificacionModal(true)
  }

  const handleGuardarCalificacion = async () => {
    try {
      setSavingCalificacion(true)
      const token = localStorage.getItem('token')
      
      // Obtener el ID del estudiante creador del control
      const estudianteId = controlParaCalificar.created_by || controlParaCalificar.created_by_id
      
      if (!estudianteId) {
        setErrorMessage('Error: No se pudo identificar al estudiante para calificar')
        setShowErrorModal(true)
        return
      }

      const calificacionData = {
        control_operativo_id: controlParaCalificar.id,
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
      setSuccessMessage(`¡Calificación guardada exitosamente! El control #${controlParaCalificar.id} del estudiante ${controlParaCalificar.nombre_estudiante} ha sido calificado y ya no necesita calificación adicional.`)
      setShowSuccessModal(true)
      setShowCalificacionModal(false)
      setControlParaCalificar(null)
      
      // Recargar controles para actualizar estados
      cargarControlesAsignados()
    } catch (error) {
      console.error('Error guardando calificación:', error)
      if (error.response?.status === 409) {
        setErrorMessage('Error: Ya existe una calificación para este estudiante en este control operativo')
      } else {
        setErrorMessage('Error al guardar la calificación: ' + (error.response?.data?.error || error.message))
      }
      setShowErrorModal(true)
    } finally {
      setSavingCalificacion(false)
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

  const getEstadoBadge = (estadoFlujo) => {
    const estados = {
      'pendiente_profesor': { text: 'Pendiente de completar', color: isDark ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      'completo': { text: 'Completado', color: isDark ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-100 text-green-800 border-green-200' },
      'con_resultado': { text: 'Con resultado', color: isDark ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-200' }
    }
    
    const estado = estados[estadoFlujo] || { text: 'Sin estado', color: isDark ? 'bg-gray-900/30 text-gray-400 border-gray-800' : 'bg-gray-100 text-gray-800 border-gray-200' }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${estado.color}`}>
        {estado.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-university-purple mx-auto mb-4"></div>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Cargando controles asignados...
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
            onClick={() => {
              setError(null)
              cargarControlesAsignados()
            }}
            className="mt-4 px-4 py-2 bg-university-purple text-white rounded-lg hover:bg-purple-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            Controles Operativos Asignados
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Gestiona los controles operativos asignados a ti como profesor asesor
          </p>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Pendientes
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {(controles || []).filter(c => c && c.estado_flujo === 'pendiente_profesor').length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Completados
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {(controles || []).filter(c => c && (c.estado_flujo === 'completo' || c.estado_flujo === 'con_resultado')).length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Asignados
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {(controles || []).length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Filtrados
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {controlesFiltrados.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros de Búsqueda */}
        {controles.length > 0 && (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 mb-6`}>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-4 flex items-center`}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Filtros y Búsqueda
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Barra de Búsqueda */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Buscar
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por ID, número documento, nombre consultante..."
                    value={searchTerm}
                    onChange={handleBusquedaChange}
                    className={`w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'}`}
                  />
                  <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Filtro por Mes */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Mes
                </label>
                <select
                  value={filtros.mes}
                  onChange={(e) => setFiltros({...filtros, mes: e.target.value})}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">Todos los meses</option>
                  {meses.map(mes => (
                    <option key={mes.value} value={mes.value}>{mes.label}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Año */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Año
                </label>
                <select
                  value={filtros.ano}
                  onChange={(e) => setFiltros({...filtros, ano: e.target.value})}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">Todos los años</option>
                  {anosDisponibles.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Estado */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Estado
                </label>
                <select
                  value={filtros.estado}
                  onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="todos">Todos ({controlesFiltrados.length})</option>
                  <option value="pendientes">Pendientes ({controles.filter(c => c.estado_flujo === 'pendiente_profesor').length})</option>
                  <option value="completados">Completados ({controles.filter(c => c.estado_flujo === 'completo' || c.estado_flujo === 'con_resultado').length})</option>
                </select>
              </div>

              {/* Botón Limpiar Filtros */}
              <div className="flex items-end lg:col-span-1">
                <button
                  onClick={limpiarFiltros}
                  disabled={!searchTerm && !filtros.mes && !filtros.ano && filtros.estado === 'todos'}
                  className="w-full px-3 py-2 text-sm bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden sm:inline">Limpiar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de controles */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Controles Operativos ({controlesFiltrados.length})
            </h2>
          </div>

          {controles.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                No hay controles asignados
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Los controles operativos asignados a ti aparecerán aquí
              </p>
            </div>
          ) : controlesFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                No se encontraron resultados
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Ajusta los filtros para ver más controles
              </p>
              <button
                onClick={limpiarFiltros}
                className="mt-4 px-4 py-2 bg-university-purple text-white rounded-lg hover:bg-purple-700"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              {/* Vista Desktop - Tabla */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Control
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Estudiante
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Consultante
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Área de Consulta
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Estado
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className={`${isDark ? 'bg-gray-800' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {(controlesFiltrados || []).map((control) => (
                    <tr key={control.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          #{control.id}
                        </span>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {control.created_at ? new Date(control.created_at).toLocaleDateString('es-ES') : 'Sin fecha'}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        <div>
                          <div className="font-medium">
                            {control.nombre_estudiante 
                              ? control.nombre_estudiante.split(' ').length >= 2 
                                ? `${control.nombre_estudiante.split(' ')[0]} ${control.nombre_estudiante.split(' ')[1]}`
                                : control.nombre_estudiante
                              : 'Sin nombre'
                            }
                          </div>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Estudiante
                          </div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        <div>
                          <div className="font-medium">
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
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {control.area_consulta}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getEstadoBadge(control.estado_flujo)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleVerDetalle(control)}
                          className="text-university-purple hover:text-purple-700 mr-3"
                        >
                          {control.estado_flujo === 'pendiente_profesor' ? 'Completar' : 'Ver detalle'}
                        </button>
                        {control.estado_flujo === 'completo' && !control.ya_calificado && (
                          <button
                            onClick={() => {
                              console.log('🎯 Botón Calificar clickeado para control:', control)
                              handleCalificarEstudiante(control)
                            }}
                            className="text-green-600 hover:text-green-700 text-sm"
                            title="Calificar estudiante"
                          >
                            Calificar
                          </button>
                        )}
                        {control.estado_flujo === 'completo' && control.ya_calificado && (
                          <span className={`text-sm font-medium ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                            ✅ Calificado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Mobile - Cards */}
            <div className="lg:hidden space-y-4 p-4">
              {(controlesFiltrados || []).map((control) => (
                <div key={control.id} className={`${isDark ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow-md p-4 border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                  {/* Header del Card */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        #{control.id}
                      </span>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {control.created_at ? new Date(control.created_at).toLocaleDateString('es-ES') : 'Sin fecha'}
                      </div>
                    </div>
                    <div>
                      {getEstadoBadge(control.estado_flujo)}
                    </div>
                  </div>

                  {/* Información Principal */}
                  <div className="space-y-2 mb-4">
                    <div>
                      <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Estudiante</span>
                      <div className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {control.nombre_estudiante 
                          ? control.nombre_estudiante.split(' ').length >= 2 
                            ? `${control.nombre_estudiante.split(' ')[0]} ${control.nombre_estudiante.split(' ')[1]}`
                            : control.nombre_estudiante
                          : 'Sin nombre'
                        }
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Consultante</span>
                        <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
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

                      <div>
                        <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Área de Consulta</span>
                        <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                          {control.area_consulta}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className={`pt-3 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'} space-y-2`}>
                    <button
                      onClick={() => handleVerDetalle(control)}
                      className="w-full px-4 py-2 bg-university-purple text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      {control.estado_flujo === 'pendiente_profesor' ? 'Completar' : 'Ver detalle'}
                    </button>
                    {control.estado_flujo === 'completo' && !control.ya_calificado && (
                      <button
                        onClick={() => {
                          console.log('🎯 Botón Calificar (móvil) clickeado para control:', control)
                          handleCalificarEstudiante(control)
                        }}
                        className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Calificar Estudiante
                      </button>
                    )}
                    {control.estado_flujo === 'completo' && control.ya_calificado && (
                      <div className={`w-full px-4 py-2 text-sm rounded-lg text-center font-medium ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-800'}`}>
                        ✅ Ya Calificado
                      </div>
                    )}
                    {/* DEBUG: Mostrar estado del control en móvil */}
                    <div className="text-xs text-gray-500 mt-2">
                      Estado: {control.estado_flujo} | ID: {control.id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
          )}
        </div>

        {/* Modal para completar concepto */}
        {selectedControl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Control Operativo #{selectedControl.id}
                </h3>
                <button
                  onClick={() => setSelectedControl(null)}
                  className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Estudiante
                  </label>
                  <p className={`${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {selectedControl.nombre_estudiante}
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Consultante
                  </label>
                  <p className={`${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {selectedControl.nombre_consultante}
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Área de Consulta
                  </label>
                  <p className={`${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {selectedControl.area_consulta}
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Estado
                  </label>
                  {getEstadoBadge(selectedControl.estado_flujo)}
                </div>
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Descripción del Caso
                </label>
                <p className={`${isDark ? 'text-gray-100 bg-gray-700' : 'text-gray-900 bg-gray-50'} p-3 rounded-lg text-sm`}>
                  {selectedControl.descripcion_caso}
                </p>
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Concepto del Estudiante
                </label>
                <p className={`${isDark ? 'text-gray-100 bg-gray-700' : 'text-gray-900 bg-gray-50'} p-3 rounded-lg text-sm`}>
                  {selectedControl.concepto_estudiante}
                </p>
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  V. CONCEPTO DEL ASESOR JURÍDICO *
                </label>
                <textarea
                  value={conceptoAsesor}
                  onChange={(e) => setConceptoAsesor(e.target.value)}
                  rows={6}
                  placeholder="Ingrese su concepto como asesor jurídico..."
                  className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-purple focus:border-transparent border`}
                  disabled={selectedControl.estado_flujo !== 'pendiente_profesor'}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedControl(null)}
                  className={`px-4 py-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancelar
                </button>
                {selectedControl.estado_flujo === 'pendiente_profesor' && (
                  <button
                    onClick={handleGuardarConcepto}
                    disabled={saving || !conceptoAsesor.trim()}
                    className={`px-4 py-2 rounded-lg text-white ${
                      saving || !conceptoAsesor.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-university-purple hover:bg-purple-700'
                    }`}
                  >
                    {saving ? 'Guardando...' : 'Guardar Concepto'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal para calificar estudiante */}
        {showCalificacionModal && controlParaCalificar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Calificar Estudiante - Control #{controlParaCalificar.id}
                </h3>
                <button
                  onClick={() => setShowCalificacionModal(false)}
                  className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Información del estudiante */}
              <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4 mb-6`}>
                <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                  Información del Estudiante
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Estudiante:</span>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {controlParaCalificar.nombre_estudiante || 'Sin nombre'}
                    </p>
                  </div>
                  <div>
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Área de Consulta:</span>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {controlParaCalificar.area_consulta || 'Sin especificar'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Criterios de evaluación */}
              <div className="space-y-6">
                <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>
                  Criterios de Evaluación (1 = Muy deficiente, 5 = Excelente)
                </h4>

                {/* Cumplimiento del horario */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    CUMPLIMIENTO DEL HORARIO
                  </label>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                    El/la estudiante llegó a tiempo al turno
                  </p>
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
                    PRESENTACIÓN PERSONAL
                  </label>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                    El/la estudiante se presenta a la actividad con ropa formal, NO JEANS, NO TENNIS, entre otros
                  </p>
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
                    CONOCIMIENTO JURÍDICO
                  </label>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                    El/la estudiante demuestra sus habilidades de conocimiento enmarcadas en el ámbito legal
                  </p>
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
                    TRABAJO EN EQUIPO
                  </label>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                    El/la estudiante brindó apoyo a sus compañeros(as) durante la jornada, mostró actitud de apoyo en el desarrollo del turno
                  </p>
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
                    ATENCIÓN AL USUARIO
                  </label>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                    El/la estudiante brindó una atención cordial y respetuosa a los usuarios durante la jornada, mostrando disposición, empatía y actitud de servicio en todo momento
                  </p>
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
                    Observaciones Adicionales (Opcional)
                  </label>
                  <textarea
                    value={calificacionForm.observaciones}
                    onChange={(e) => setCalificacionForm({
                      ...calificacionForm,
                      observaciones: e.target.value
                    })}
                    rows={3}
                    placeholder="Comentarios adicionales sobre el desempeño del estudiante..."
                    className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-purple focus:border-transparent border`}
                  />
                </div>

                {/* Promedio calculado */}
                <div className={`${isDark ? 'bg-purple-900/30 border-purple-800' : 'bg-purple-50 border-purple-200'} rounded-lg p-4 border`}>
                  <div className="text-center">
                    <span className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Promedio General</span>
                    <div className={`text-3xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                      {calcularPromedio()}/5.0
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCalificacionModal(false)}
                  className={`px-4 py-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarCalificacion}
                  disabled={savingCalificacion}
                  className={`px-4 py-2 rounded-lg text-white ${
                    savingCalificacion
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

        {/* Modal de Éxito */}
        <InfoModal
          isOpen={showSuccessModal}
          title="¡Operación Exitosa!"
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

export default ControlesAsignados