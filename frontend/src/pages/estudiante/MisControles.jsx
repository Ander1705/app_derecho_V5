import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../../config/api'
import { 
  FunnelIcon, 
  MagnifyingGlassIcon, 
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import InfoModal from '../../components/ui/InfoModal'

const MisControles = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [searchParams] = useSearchParams()
  
  const [controles, setControles] = useState([])
  const [controlesOriginales, setControlesOriginales] = useState([])
  const [controlesFiltrados, setControlesFiltrados] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchMode, setSearchMode] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado: searchParams.get('estado') || 'todos'
  })
  
  // Estados para el modal de asignar estado resultado
  const [showEstadoModal, setShowEstadoModal] = useState(false)
  const [controlParaEstado, setControlParaEstado] = useState(null)
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('')
  const [savingEstado, setSavingEstado] = useState(false)
  
  // Estados para modal de verificación
  
  // Estados para modal de confirmación de estado
  const [showEstadoConfirmModal, setShowEstadoConfirmModal] = useState(false)
  const [estadoConfirmData, setEstadoConfirmData] = useState(null)
  
  // Estados para InfoModal
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [infoModalData, setInfoModalData] = useState({
    title: '',
    message: '',
    type: 'info'
  })
  
  // Estados para nuevo control operativo
  const [showForm, setShowForm] = useState(false)
  const [profesores, setProfesores] = useState([])
  const [loadingForm, setLoadingForm] = useState(false)
  const [documentos, setDocumentos] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  
  const inicialNombreEstudiante = (user?.nombres && user?.apellidos) ? `${user.nombres} ${user.apellidos}` : ''
  
  const [formData, setFormData] = useState({
    ciudad: 'Bogotá D.C',
    fecha_dia: new Date().getDate(),
    fecha_mes: new Date().getMonth() + 1,
    fecha_ano: new Date().getFullYear(),
    nombre_docente_responsable: '',
    profesor_id: null,
    nombre_estudiante: inicialNombreEstudiante,
    area_consulta: '',
    remitido_por: '',
    correo_electronico: '',
    nombre_consultante: '',
    edad: '',
    fecha_nacimiento_dia: '',
    fecha_nacimiento_mes: '',
    fecha_nacimiento_ano: '',
    lugar_nacimiento: '',
    sexo: '',
    tipo_documento: '',
    numero_documento: '',
    lugar_expedicion: '',
    direccion: '',
    barrio: '',
    estrato: '',
    numero_telefonico: '',
    numero_celular: '',
    estado_civil: '',
    escolaridad: '',
    profesion_oficio: '',
    descripcion_caso: '',
    concepto_estudiante: ''
  })

  useEffect(() => {
    cargarControles()
    cargarProfesores()
  }, [])

  // *** BÚSQUEDA AHORA SE MANEJA EN TIEMPO REAL CON handleBusquedaChange ***

  // Efecto para filtrar controles localmente solo por estado cuando no hay búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      filtrarControles()
    }
  }, [controles, filtros.estado])

  const cargarControles = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await axios.get('/api/control-operativo/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      console.log('✅ Controles cargados:', response.data)
      // Extraer solo el array de controles de la respuesta paginada
      const controlesArray = response.data?.data || response.data || []
      setControles(controlesArray)
      setControlesOriginales(controlesArray)
    } catch (error) {
      console.error('❌ Error cargando controles:', error)
      setControles([])
    } finally {
      setLoading(false)
    }
  }

  const filtrarControles = () => {
    let filtrados = [...controles]
    
    // Filtro por estado (solo cuando NO hay búsqueda activa)
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

  // *** FUNCIÓN buscarControles REMOVIDA - AHORA SE USA ejecutarBusquedaTiempoReal ***

  // Función para manejar cambios en el input de búsqueda (igual que coordinador)
  const handleBusquedaChange = async (e) => {
    const valor = e.target.value
    setSearchTerm(valor)
    console.log('📝 Buscando en tiempo real:', valor)
    
    // Si está vacío, restaurar datos inmediatamente
    if (!valor.trim()) {
      console.log('🔄 Restaurando datos originales')
      setSearchMode(false)
      setControles(controlesOriginales)
      setControlesFiltrados(controlesOriginales)
      return
    }
    
    // Si tiene al menos 1 caracter, buscar inmediatamente
    if (valor.trim().length >= 1) {
      await ejecutarBusquedaTiempoReal(valor.trim())
    }
  }
  
  // Función para buscar en tiempo real usando el endpoint del backend
  const ejecutarBusquedaTiempoReal = async (busqueda) => {
    try {
      const token = localStorage.getItem('token')
      console.log('🔑 Token:', token ? 'Presente' : 'NO encontrado')
      
      let url = '/api/control-operativo/search?'
      const params = new URLSearchParams()
      
      if (/^\d+$/.test(busqueda)) {
        // Solo buscar por ID cuando sea un número
        params.append('id', busqueda)
        console.log('🔢 Búsqueda SOLO por ID:', busqueda)
      } else {
        params.append('consultante', busqueda)
        params.append('nombre', busqueda)
        console.log('📝 Búsqueda por texto (nombres/consultante):', busqueda)
      }
      
      url += params.toString()
      console.log('🌐 URL de búsqueda:', url)

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.data && response.data.controles) {
        console.log('✅ Controles encontrados:', response.data.controles.length)
        setSearchMode(true)
        setControles(response.data.controles)
        setControlesFiltrados(response.data.controles)
      } else {
        console.log('❌ No se encontraron controles')
        setSearchMode(true)  
        setControles([])
        setControlesFiltrados([])
      }
    } catch (error) {
      console.error('❌ Error en búsqueda:', error)
      setSearchMode(true)
      setControles([])
      setControlesFiltrados([])
    }
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
      console.log(`🔄 Descargando PDF para control ${controlId}`)
      const token = localStorage.getItem('token')
      
      if (!token) {
        alert('Error: No hay token de autenticación')
        return
      }

      const response = await axios.get(`/api/control-operativo/${controlId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        timeout: 30000 // 30 segundos timeout
      })

      if (!response.data || response.data.size === 0) {
        throw new Error('PDF vacío recibido del servidor')
      }

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Control_Operativo_${nombreConsultante || 'Sin_Nombre'}_${controlId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log('✅ PDF descargado exitosamente')
      
    } catch (error) {
      console.error('❌ Error descargando PDF:', error)
      let errorMsg = 'Error desconocido'
      
      if (error.response?.status === 401) {
        errorMsg = 'Error de autenticación. Inicia sesión nuevamente.'
      } else if (error.response?.status === 404) {
        errorMsg = 'Control operativo no encontrado'
      } else if (error.response?.status === 403) {
        errorMsg = 'No tienes permisos para descargar este PDF'
      } else if (error.code === 'ECONNABORTED') {
        errorMsg = 'Timeout: El servidor tardó demasiado en responder'
      } else {
        errorMsg = error.message || 'Error descargando PDF'
      }
      
      alert(`❌ ${errorMsg}`)
    }
  }

  const handleEstablecerEstado = (control) => {
    setControlParaEstado(control)
    setEstadoSeleccionado('')
    setShowEstadoModal(true)
  }

  const guardarEstadoResultado = () => {
    if (!estadoSeleccionado || !controlParaEstado) {
      setInfoModalData({
        title: 'Campos requeridos',
        message: 'Debes seleccionar un estado para continuar',
        type: 'error'
      })
      setShowInfoModal(true)
      return
    }
    
    // Mostrar modal de confirmación con los datos
    setEstadoConfirmData({
      control: controlParaEstado,
      estadoSeleccionado: estadoSeleccionado
    })
    setShowEstadoConfirmModal(true)
  }

  // Nueva función para confirmar y enviar el estado
  // Función para obtener la descripción del estado
  const getEstadoDescription = (estado) => {
    switch (estado) {
      case 'asesoria_consulta':
        return {
          titulo: 'Asesoría y Consulta',
          descripcion: 'El caso será manejado como una consulta jurídica con asesoría especializada.'
        }
      case 'reparto':
        return {
          titulo: 'Reparto',
          descripcion: 'El caso será asignado al equipo correspondiente para su tramitación.'
        }
      case 'auto_reparto':
        return {
          titulo: 'Auto Reparto',
          descripcion: 'El caso será asignado automáticamente según los criterios establecidos.'
        }
      case 'solicitud_conciliacion':
        return {
          titulo: 'Solicitud de Conciliación',
          descripcion: 'Se procederá con un proceso de conciliación para resolver el conflicto.'
        }
      default:
        return {
          titulo: estado,
          descripcion: 'Estado del control operativo.'
        }
    }
  }

  const confirmarEstadoResultado = async () => {
    try {
      setSavingEstado(true)
      const token = localStorage.getItem('token')
      
      await axios.put(
        `/api/control-operativo/${estadoConfirmData.control.id}/estado-resultado`,
        { estado_resultado: estadoConfirmData.estadoSeleccionado },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Actualizar el control en la lista
      setControles(prevControles => 
        prevControles.map(control => 
          control.id === estadoConfirmData.control.id 
            ? { ...control, estado_resultado: estadoConfirmData.estadoSeleccionado, estado_flujo: 'con_resultado' }
            : control
        )
      )

      setShowEstadoModal(false)
      setShowEstadoConfirmModal(false)
      setInfoModalData({
        title: '¡Éxito!',
        message: 'Estado resultado establecido correctamente',
        type: 'success'
      })
      setShowInfoModal(true)
      
      // Auto-cerrar después de 3 segundos para éxitos
      setTimeout(() => {
        setShowInfoModal(false)
      }, 3000)
    } catch (error) {
      console.error('Error estableciendo estado:', error)
      setInfoModalData({
        title: 'Error',
        message: 'Error al establecer el estado resultado',
        type: 'error'
      })
      setShowInfoModal(true)
    } finally {
      setSavingEstado(false)
    }
  }

  const contarPorEstado = (estado) => {
    const controlesArray = controles || []
    switch (estado) {
      case 'pendientes':
        return controlesArray.filter(c => c && c.estado_flujo === 'pendiente_profesor').length
      case 'completos':
        return controlesArray.filter(c => c && c.estado_flujo === 'completo').length  
      case 'finalizados':
        return controlesArray.filter(c => c && c.estado_flujo === 'con_resultado').length
      default:
        return controlesArray.length
    }
  }

  // Funciones para nuevo control operativo
  const cargarProfesores = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/profesores', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProfesores(response.data)
    } catch (error) {
      console.error('Error cargando profesores:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleProfesorChange = (e) => {
    const selectedProfesorId = e.target.value
    const selectedProfesor = profesores.find(p => p.id.toString() === selectedProfesorId)
    
    console.log('🔍 Profesor seleccionado:', selectedProfesor)
    
    setFormData(prev => ({
      ...prev,
      profesor_id: selectedProfesor ? selectedProfesor.id : null,
      nombre_docente_responsable: selectedProfesor ? selectedProfesor.nombre : ''
    }))
  }

  const handleSubmitNuevoControl = async (e) => {
    console.log('🔄 INICIO: handleSubmitNuevoControl')
    e.preventDefault()
    
    try {
      console.log('🔄 Activando loading form...')
      setLoadingForm(true)
      
      // Validaciones básicas - campos requeridos por el backend
      const camposObligatorios = [
        'ciudad', 
        'nombre_docente_responsable',
        'nombre_estudiante', 
        'area_consulta',
        'nombre_consultante',
        'sexo',
        'tipo_documento',
        'numero_documento',
        'descripcion_caso',
        'concepto_estudiante'
      ]
      
      const camposFaltantes = camposObligatorios.filter(campo => !formData[campo]?.trim())
      
      console.log('🔄 Validando campos obligatorios...')
      
      if (camposFaltantes.length > 0) {
        console.log('❌ Campos faltantes:', camposFaltantes)
        const camposTexto = camposFaltantes.map(campo => {
          switch(campo) {
            case 'ciudad': return 'Ciudad'
            case 'nombre_docente_responsable': return 'Nombre del docente responsable'
            case 'nombre_estudiante': return 'Nombre del estudiante responsable'
            case 'area_consulta': return 'Área de consulta'
            case 'nombre_consultante': return 'Nombre del consultante'
            case 'sexo': return 'Sexo'
            case 'tipo_documento': return 'Tipo de documento'
            case 'numero_documento': return 'Número de documento'
            case 'descripcion_caso': return 'Descripción del caso'
            case 'concepto_estudiante': return 'Concepto del estudiante'
            default: return campo
          }
        })
        alert(`Por favor completa los siguientes campos obligatorios: ${camposTexto.join(', ')}`)
        return
      }

      console.log('🔄 Validando documentos...')
      console.log('📄 Documentos actuales:', documentos)
      
      // Validar que hay archivos subidos
      if (documentos.length === 0) {
        console.log('❌ No hay documentos subidos')
        alert('Debes subir al menos un archivo para continuar. Los archivos son obligatorios para el control operativo.')
        setLoadingForm(false)
        return
      }

      console.log('🔄 Obteniendo token...')
      const token = localStorage.getItem('token')
      console.log('🔑 Token:', token ? 'Presente' : 'No presente')
      
      console.log('🔄 Preparando datos para envío...')
      // Preparar datos con documentos adjuntos y convertir campos numéricos
      const dataToSend = {
        ...formData,
        // Convertir campos numéricos de string a number
        edad: parseInt(formData.edad) || 0,
        fecha_dia: parseInt(formData.fecha_dia) || new Date().getDate(),
        fecha_mes: parseInt(formData.fecha_mes) || new Date().getMonth() + 1,
        fecha_ano: parseInt(formData.fecha_ano) || new Date().getFullYear(),
        fecha_nacimiento_dia: parseInt(formData.fecha_nacimiento_dia) || 0,
        fecha_nacimiento_mes: parseInt(formData.fecha_nacimiento_mes) || 0,
        fecha_nacimiento_ano: parseInt(formData.fecha_nacimiento_ano) || 0,
        estrato: parseInt(formData.estrato) || 0,
        documentos_adjuntos: documentos.map(doc => doc.ruta_archivo)
      }
      
      console.log('🔍 DEBUG: Datos que se envían al backend:', dataToSend)
      
      // Enviar directamente al backend
      const response = await axios.post('/api/control-operativo', dataToSend, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      })
      
      console.log('✅ Control operativo creado exitosamente:', response.data)
      
      // Subir archivos al control operativo recién creado si hay archivos temporales
      if (documentos.length > 0 && response.data.control) {
        console.log(`📎 Procesando ${documentos.length} archivos para el control ${response.data.control.id}`)
        // Los archivos ya están subidos como temporales, el backend los procesa automáticamente
      }
      
      // Agregar el nuevo control a la lista inmediatamente
      if (response.data.control) {
        const nuevoControl = response.data.control
        setControles(prevControles => [nuevoControl, ...prevControles])
        setControlesOriginales(prevOriginales => [nuevoControl, ...prevOriginales])
        console.log('✅ Control agregado instantáneamente a la lista local:', nuevoControl.id)
      }
      
      // Cerrar modal y resetear
      setShowForm(false)
      resetForm()
      
      // Mostrar notificación de éxito
      setInfoModalData({
        title: '¡Control Operativo Guardado Exitosamente!',
        message: 'El control operativo ha sido registrado correctamente en el sistema.',
        type: 'success'
      })
      setShowInfoModal(true)
      
      setLoadingForm(false)
      
    } catch (error) {
      console.error('❌ Error guardando control operativo:', error.response?.data || error.message)
      
      let errorMessage = 'Error guardando el control operativo'
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'No se puede conectar al servidor. Verifica que el backend esté funcionando.'
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'La conexión tardó demasiado. Intenta de nuevo.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setInfoModalData({
        title: 'Error al Guardar',
        message: errorMessage,
        type: 'error'
      })
      setShowInfoModal(true)
      setLoadingForm(false)
    }
  }


  const resetForm = () => {
    setFormData({
      ciudad: 'Bogotá D.C',
      fecha_dia: new Date().getDate(),
      fecha_mes: new Date().getMonth() + 1,
      fecha_ano: new Date().getFullYear(),
      nombre_docente_responsable: '',
      profesor_id: null,
      nombre_estudiante: inicialNombreEstudiante,
      area_consulta: '',
      remitido_por: '',
      correo_electronico: '',
      nombre_consultante: '',
      edad: '',
      fecha_nacimiento_dia: '',
      fecha_nacimiento_mes: '',
      fecha_nacimiento_ano: '',
      lugar_nacimiento: '',
      sexo: '',
      tipo_documento: '',
      numero_documento: '',
      lugar_expedicion: '',
      direccion: '',
      barrio: '',
      estrato: '',
      numero_telefonico: '',
      numero_celular: '',
      estado_civil: '',
      escolaridad: '',
      profesion_oficio: '',
      descripcion_caso: '',
      concepto_estudiante: ''
    })
    setDocumentos([])
  }

  // Funciones para manejo de archivos
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files)
    if (!files.length) return
    
    // Validar que todos los archivos sean PDFs
    const invalidFiles = files.filter(file => !file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))
    if (invalidFiles.length > 0) {
      alert(`Solo se permiten archivos PDF. Los siguientes archivos no son válidos: ${invalidFiles.map(f => f.name).join(', ')}`)
      return
    }
    
    // Validar tamaño individual de archivos
    const maxSize = 5 * 1024 * 1024 // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      alert(`Los siguientes archivos exceden el límite de 5MB: ${oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(', ')}`)
      return
    }
    
    // Validar límite de archivos
    if (documentos.length + files.length > 30) {
      alert(`Solo se pueden subir máximo 30 archivos. Tienes ${documentos.length} y estás intentando subir ${files.length} más.`)
      return
    }
    
    try {
      setUploadingFile(true)
      
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await axios.post('/api/upload/temp', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        const nuevoDocumento = {
          id: Date.now() + Math.random(),
          filename: response.data.filename,
          nombre_original: response.data.original,
          ruta_archivo: response.data.filename,  // El backend usa este campo para identificar el archivo
          tamaño: response.data.size,
          tipo_mime: file.type,
          uploaded_by: user?.nombres && user?.apellidos ? `${user.nombres} ${user.apellidos}` : 'Usuario',
          uploaded_at: new Date().toISOString()
        }
        
        setDocumentos(prev => [...prev, nuevoDocumento])
      }
      
      console.log('✅ Archivos subidos exitosamente')
      event.target.value = ''
      
    } catch (error) {
      console.error('❌ Error subiendo archivos:', error)
      alert('Error al subir los archivos')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteDocument = async (documentoId) => {
    if (!confirm('¿Estás seguro de eliminar este archivo?')) return
    
    try {
      setDocumentos(prev => prev.filter(doc => doc.id !== documentoId))
    } catch (error) {
      console.error('Error eliminando documento:', error)
      alert('Error eliminando el archivo')
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                Mis Controles Operativos
              </h1>
              <p className={`text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Gestiona y supervisa todos tus controles operativos
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setShowForm(true)}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Nuevo Control Operativo</span>
              </button>
            </div>
          </div>
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
                  placeholder="Buscar por ID, número documento, nombre consultante..."
                  value={searchTerm}
                  onChange={handleBusquedaChange}
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
                <option value="todos">Todos ({(controles || []).length})</option>
                <option value="pendientes">Pendientes ({contarPorEstado('pendientes')})</option>
                <option value="completos">Completos ({contarPorEstado('completos')})</option>
                <option value="finalizados">Finalizados ({contarPorEstado('finalizados')})</option>
              </select>
            </div>

            {/* Indicador de Filtros */}
            <div className="flex items-center justify-center sm:justify-start sm:col-span-2 lg:col-span-1">
              <FunnelIcon className={`h-4 w-4 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Mostrando {(controlesFiltrados || []).length} de {(controles || []).length}
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
                        ID
                      </th>
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
                    {(controlesFiltrados || []).map((control) => (
                      <tr key={control.id} className={`${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors duration-150`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-800'}`}>
                            #{control.id}
                          </span>
                        </td>
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
                          <div className="flex items-center justify-end space-x-2">
                            {control.estado_flujo === 'completo' && !control.estado_resultado && (
                              <button
                                onClick={() => handleEstablecerEstado(control)}
                                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors duration-200 ${isDark ? 'text-green-400 hover:bg-green-900/20' : 'text-green-600 hover:bg-green-50'}`}
                                title="Establecer estado resultado"
                              >
                                <CheckCircleIcon className="w-4 h-4 mr-1" />
                                Establecer Estado
                              </button>
                            )}
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista Móvil/Tablet - Cards (Estilo ControlOperativo) */}
              <div className="lg:hidden space-y-4 p-4">
                {(controlesFiltrados || []).map((control) => {
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

                      {/* Botones de Acción */}
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        {control.estado_flujo === 'completo' && !control.estado_resultado && (
                          <button
                            onClick={() => handleEstablecerEstado(control)}
                            className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 text-white bg-green-600 hover:bg-green-700 focus:ring-green-500"
                            title="Establecer estado resultado del control"
                          >
                            <CheckCircleIcon className="w-4 h-4 mr-2" />
                            Establecer Estado
                          </button>
                        )}
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

        {/* Modal para establecer estado resultado */}
        {showEstadoModal && controlParaEstado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Establecer Estado Resultado
                </h3>
                <button
                  onClick={() => setShowEstadoModal(false)}
                  className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                  Control Operativo #{controlParaEstado.id} - {controlParaEstado.nombre_consultante}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                  Selecciona el estado resultado que corresponde a este control operativo:
                </p>

                <div className="space-y-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="estado_resultado"
                      value="asesoria_consulta"
                      checked={estadoSeleccionado === 'asesoria_consulta'}
                      onChange={(e) => setEstadoSeleccionado(e.target.value)}
                      className="mr-3 text-university-purple"
                    />
                    <div>
                      <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Asesoría/Consulta
                      </span>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Orientación jurídica sin iniciar proceso legal
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="estado_resultado"
                      value="reparto"
                      checked={estadoSeleccionado === 'reparto'}
                      onChange={(e) => setEstadoSeleccionado(e.target.value)}
                      className="mr-3 text-university-purple"
                    />
                    <div>
                      <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Reparto
                      </span>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Proceso judicial requiere reparto ordinario
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="estado_resultado"
                      value="auto_reparto"
                      checked={estadoSeleccionado === 'auto_reparto'}
                      onChange={(e) => setEstadoSeleccionado(e.target.value)}
                      className="mr-3 text-university-purple"
                    />
                    <div>
                      <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Auto Reparto
                      </span>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Proceso que se auto-asigna automáticamente
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="estado_resultado"
                      value="solicitud_conciliacion"
                      checked={estadoSeleccionado === 'solicitud_conciliacion'}
                      onChange={(e) => setEstadoSeleccionado(e.target.value)}
                      className="mr-3 text-university-purple"
                    />
                    <div>
                      <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Solicitud de Conciliación
                      </span>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Mecanismo alternativo de solución de conflictos
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEstadoModal(false)}
                  className={`px-4 py-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarEstadoResultado}
                  disabled={!estadoSeleccionado || savingEstado}
                  className={`px-4 py-2 rounded-lg text-white ${
                    !estadoSeleccionado || savingEstado
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {savingEstado ? 'Guardando...' : 'Establecer Estado'}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Modal de Confirmación de Estado */}
        {showEstadoConfirmModal && estadoConfirmData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-2xl`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Confirmar Estado Resultado
                </h3>
                <button
                  onClick={() => setShowEstadoConfirmModal(false)}
                  className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Advertencia */}
                <div className={`${isDark ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'} border rounded-lg p-4`}>
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className={`h-5 w-5 ${isDark ? 'text-orange-400' : 'text-orange-600'} mr-2`} />
                    <p className={`text-sm font-medium ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>
                      Esta acción establecerá el estado resultado del control operativo y no se puede deshacer
                    </p>
                  </div>
                </div>

                {/* Información del Control */}
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <h4 className={`font-semibold text-lg ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-3`}>
                    Información del Control Operativo
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>ID:</span>
                      <span className={`ml-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>#{estadoConfirmData.control.id}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Consultante:</span>
                      <span className={`ml-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{estadoConfirmData.control.nombre_consultante}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Área:</span>
                      <span className={`ml-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{estadoConfirmData.control.area_consulta}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Profesor:</span>
                      <span className={`ml-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{estadoConfirmData.control.nombre_docente_responsable}</span>
                    </div>
                  </div>
                </div>

                {/* Estado Seleccionado */}
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <h4 className={`font-semibold text-lg ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-3`}>
                    Estado Resultado Seleccionado
                  </h4>
                  <div className={`${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
                    <div className="flex items-center mb-2">
                      <CheckCircleIcon className={`h-5 w-5 ${isDark ? 'text-green-400' : 'text-green-600'} mr-2`} />
                      <h5 className={`font-semibold ${isDark ? 'text-green-300' : 'text-green-800'}`}>
                        {getEstadoDescription(estadoConfirmData.estadoSeleccionado).titulo}
                      </h5>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-green-200' : 'text-green-700'} ml-7`}>
                      {getEstadoDescription(estadoConfirmData.estadoSeleccionado).descripcion}
                    </p>
                  </div>
                </div>

                {/* Descripción del caso */}
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                  <h4 className={`font-semibold text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Descripción del Caso:
                  </h4>
                  <p className={`text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'} ${isDark ? 'bg-gray-800' : 'bg-white'} p-3 rounded border`}>
                    {estadoConfirmData.control.descripcion_caso}
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => setShowEstadoConfirmModal(false)}
                    className={`px-6 py-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarEstadoResultado}
                    disabled={savingEstado}
                    className={`px-6 py-2 rounded-lg text-white ${
                      savingEstado
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                    } flex items-center space-x-2`}
                  >
                    {savingEstado ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Estableciendo...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Confirmar Estado</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Nuevo Control Operativo */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Nuevo Control Operativo
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmitNuevoControl} className="space-y-8">
                {/* I. DATOS DEL USUARIO */}
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-6 rounded-lg`}>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-4`}>
                    I. DATOS DEL USUARIO
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Ciudad *
                      </label>
                      <input
                        type="text"
                        name="ciudad"
                        value={formData.ciudad}
                        onChange={handleInputChange}
                        required
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Fecha de diligenciamiento
                      </label>
                      <input
                        type="text"
                        value={`${formData.fecha_dia}/${formData.fecha_mes}/${formData.fecha_ano}`}
                        disabled
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-gray-100 border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg border`}
                      />
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Se completa automáticamente</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Nombre del Docente Responsable
                      </label>
                      <select
                        name="profesor_selection"
                        value={formData.profesor_id || ''}
                        onChange={handleProfesorChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      >
                        <option value="">Seleccione un profesor</option>
                        {(profesores || []).map((profesor) => (
                          <option key={profesor.id} value={profesor.id}>
                            {profesor.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Nombre del Estudiante *
                      </label>
                      <input
                        type="text"
                        name="nombre_estudiante"
                        value={formData.nombre_estudiante}
                        onChange={handleInputChange}
                        readOnly
                        required
                        className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-600'}`}
                        title="Este campo se completa automáticamente con tu nombre"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Área de Consulta
                      </label>
                      <select
                        name="area_consulta"
                        value={formData.area_consulta}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      >
                        <option value="">Seleccionar área</option>
                        <option value="Civil">Civil</option>
                        <option value="Penal">Penal</option>
                        <option value="Laboral">Laboral</option>
                        <option value="Comercial">Comercial</option>
                        <option value="Administrativo">Administrativo</option>
                        <option value="Familia">Familia</option>
                        <option value="Constitucional">Constitucional</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* II. INFORMACIÓN GENERAL DEL CONSULTANTE */}
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-6 rounded-lg`}>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-4`}>
                    II. INFORMACIÓN GENERAL DEL CONSULTANTE
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Remitido por
                      </label>
                      <input
                        type="text"
                        name="remitido_por"
                        value={formData.remitido_por}
                        onChange={handleInputChange}
                        placeholder="Ej: Consultorio Jurídico, Defensoría, etc."
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        name="correo_electronico"
                        value={formData.correo_electronico}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Nombre del consultante *
                      </label>
                      <input
                        type="text"
                        name="nombre_consultante"
                        value={formData.nombre_consultante}
                        onChange={handleInputChange}
                        required
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Edad
                      </label>
                      <input
                        type="number"
                        name="edad"
                        value={formData.edad}
                        onChange={handleInputChange}
                        min="0"
                        max="120"
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                  </div>

                  {/* Fecha de nacimiento */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Día nac.
                      </label>
                      <input
                        type="number"
                        name="fecha_nacimiento_dia"
                        value={formData.fecha_nacimiento_dia}
                        onChange={handleInputChange}
                        min="1"
                        max="31"
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Mes nac.
                      </label>
                      <input
                        type="number"
                        name="fecha_nacimiento_mes"
                        value={formData.fecha_nacimiento_mes}
                        onChange={handleInputChange}
                        min="1"
                        max="12"
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Año nac.
                      </label>
                      <input
                        type="number"
                        name="fecha_nacimiento_ano"
                        value={formData.fecha_nacimiento_ano}
                        onChange={handleInputChange}
                        min="1900"
                        max={new Date().getFullYear()}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Lugar de nacimiento
                      </label>
                      <input
                        type="text"
                        name="lugar_nacimiento"
                        value={formData.lugar_nacimiento}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                  </div>

                  {/* Sexo y documentos */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Sexo *
                      </label>
                      <select
                        name="sexo"
                        value={formData.sexo}
                        onChange={handleInputChange}
                        required
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      >
                        <option value="">Seleccionar</option>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Tipo de documento *
                      </label>
                      <select
                        name="tipo_documento"
                        value={formData.tipo_documento}
                        onChange={handleInputChange}
                        required
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      >
                        <option value="">Seleccionar</option>
                        <option value="CC">Cédula de Ciudadanía</option>
                        <option value="TI">Tarjeta de Identidad</option>
                        <option value="CE">Cédula de Extranjería</option>
                        <option value="PAS">Pasaporte</option>
                        <option value="RC">Registro Civil</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Número de documento *
                      </label>
                      <input
                        type="text"
                        name="numero_documento"
                        value={formData.numero_documento}
                        onChange={handleInputChange}
                        required
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Lugar de expedición
                      </label>
                      <input
                        type="text"
                        name="lugar_expedicion"
                        value={formData.lugar_expedicion}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                  </div>

                  {/* Dirección y datos socioeconómicos */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Dirección
                      </label>
                      <input
                        type="text"
                        name="direccion"
                        value={formData.direccion}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Barrio
                      </label>
                      <input
                        type="text"
                        name="barrio"
                        value={formData.barrio}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Estrato
                      </label>
                      <select
                        name="estrato"
                        value={formData.estrato}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      >
                        <option value="">Seleccionar</option>
                        <option value="1">Estrato 1</option>
                        <option value="2">Estrato 2</option>
                        <option value="3">Estrato 3</option>
                        <option value="4">Estrato 4</option>
                        <option value="5">Estrato 5</option>
                        <option value="6">Estrato 6</option>
                      </select>
                    </div>
                  </div>

                  {/* Contacto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Número telefónico
                      </label>
                      <input
                        type="tel"
                        name="numero_telefonico"
                        value={formData.numero_telefonico}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Número celular
                      </label>
                      <input
                        type="tel"
                        name="numero_celular"
                        value={formData.numero_celular}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                  </div>

                  {/* Información personal adicional */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Estado civil
                      </label>
                      <select
                        name="estado_civil"
                        value={formData.estado_civil}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      >
                        <option value="">Seleccionar</option>
                        <option value="Soltero">Soltero/a</option>
                        <option value="Casado">Casado/a</option>
                        <option value="Union Libre">Unión Libre</option>
                        <option value="Divorciado">Divorciado/a</option>
                        <option value="Viudo">Viudo/a</option>
                        <option value="Separado">Separado/a</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Escolaridad
                      </label>
                      <select
                        name="escolaridad"
                        value={formData.escolaridad}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      >
                        <option value="">Seleccionar</option>
                        <option value="Sin escolaridad">Sin escolaridad</option>
                        <option value="Primaria incompleta">Primaria incompleta</option>
                        <option value="Primaria completa">Primaria completa</option>
                        <option value="Bachillerato incompleto">Bachillerato incompleto</option>
                        <option value="Bachillerato completo">Bachillerato completo</option>
                        <option value="Técnico">Técnico</option>
                        <option value="Tecnológico">Tecnológico</option>
                        <option value="Universitario incompleto">Universitario incompleto</option>
                        <option value="Universitario completo">Universitario completo</option>
                        <option value="Posgrado">Posgrado</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Profesión u oficio
                      </label>
                      <input
                        type="text"
                        name="profesion_oficio"
                        value={formData.profesion_oficio}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                  </div>
                </div>

                {/* III. DESCRIPCIÓN DEL CASO */}
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-6 rounded-lg`}>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-4`}>
                    III. DESCRIPCIÓN DEL CASO
                  </h2>
                  
                  <div className="mb-4">
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                      Descripción detallada del caso o problema jurídico
                    </label>
                    <textarea
                      name="descripcion_caso"
                      value={formData.descripcion_caso}
                      onChange={handleInputChange}
                      rows={6}
                      className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      placeholder="Describe detalladamente la situación jurídica, los hechos relevantes, fechas importantes, personas involucradas, documentos disponibles, etc."
                    />
                  </div>

                  <div className="mb-4">
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                      Concepto inicial del estudiante
                    </label>
                    <textarea
                      name="concepto_estudiante"
                      value={formData.concepto_estudiante}
                      onChange={handleInputChange}
                      rows={4}
                      className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      placeholder="Tu análisis inicial del caso, posibles áreas del derecho involucradas, normatividad aplicable, etc."
                    />
                  </div>
                </div>

                {/* IV. DOCUMENTOS */}
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-6 rounded-lg`}>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-4`}>
                    IV. DOCUMENTOS ADJUNTOS *
                  </h2>
                  
                  <div className="mb-4">
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                      Subir archivos relacionados con el caso
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="file"
                        multiple
                        accept=".pdf"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        required={documentos.length === 0}
                        className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-university-blue file:text-white hover:file:bg-purple-700 disabled:opacity-50 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                      />
                      {uploadingFile && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-300"></div>
                      )}
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                      Solo archivos PDF (máximo 5MB cada uno, hasta 30 archivos). Se integrarán en el documento final.
                    </p>
                  </div>
                  
                  {/* Archivos subidos */}
                  {documentos.length > 0 && (
                    <div className="mt-4">
                      <h3 className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                        Archivos subidos ({documentos.length}/30):
                      </h3>
                      <div className="space-y-2">
                        {(documentos || []).map((doc) => (
                          <div key={doc.id} className={`flex items-center justify-between ${isDark ? 'bg-gray-800' : 'bg-white'} p-3 rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${isDark ? 'text-purple-400' : 'text-university-purple'}`}>
                                {doc.filename || doc.nombre_original}
                              </p>
                              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Subido por {doc.uploaded_by} • {new Date(doc.uploaded_at || Date.now()).toLocaleDateString()}
                                • {((doc.tamaño || doc.size) / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className={`ml-4 px-3 py-1 rounded-lg text-xs transition-colors duration-200 ${isDark ? 'bg-red-900/30 hover:bg-red-600 text-red-400' : 'bg-red-50 hover:bg-red-600 text-red-600 hover:text-white'}`}
                            >
                              Eliminar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    className={`px-6 py-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loadingForm}
                    className={`px-6 py-2 rounded-lg text-white ${
                      loadingForm
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                    }`}
                  >
                    {loadingForm ? 'Preparando información...' : 'Revisar y Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* InfoModal para notificaciones */}
        <InfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          title={infoModalData.title}
          message={infoModalData.message}
          type={infoModalData.type}
        />
      </div>
    </div>
  )
}

export default MisControles