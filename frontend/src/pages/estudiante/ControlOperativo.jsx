import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import axios from 'axios'
import InfoModal from '../../components/ui/InfoModal'
import API_BASE_URL from '../../config/api'

const ControlOperativoEstudiante = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [controles, setControles] = useState([])
  const [controlesFiltrados, setControlesFiltrados] = useState([])
  const [filtros, setFiltros] = useState({
    busqueda: '',
    mes: '',
    ano: ''
  })
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [documentos, setDocumentos] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [infoModalData, setInfoModalData] = useState({})
  const [profesores, setProfesores] = useState([])
  const inicialNombreEstudiante = (user?.nombres && user?.apellidos) ? `${user.nombres} ${user.apellidos}` : ''

  const [formData, setFormData] = useState({
    ciudad: 'Bogotá D.C',
    fecha_dia: new Date().getDate(),
    fecha_mes: new Date().getMonth() + 1,
    fecha_ano: new Date().getFullYear(),
    nombre_docente_responsable: '',
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
    concepto_estudiante: '',
  })

  useEffect(() => {
    cargarControles()
    cargarProfesores()
  }, [])

  const cargarProfesores = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/profesores`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProfesores(response.data)
    } catch (error) {
      console.error('Error cargando profesores:', error)
    }
  }

  useEffect(() => {
    if (user?.nombres && user?.apellidos) {
      const nombreCompleto = `${user.nombres} ${user.apellidos}`
      setFormData(prev => ({
        ...prev,
        nombre_estudiante: nombreCompleto
      }))
    }
  }, [user])

  // Efecto para filtrar controles cuando cambian los filtros o los controles
  useEffect(() => {
    aplicarFiltros()
  }, [controles, filtros])

  const aplicarFiltros = () => {
    let controlesParaFiltrar = [...controles]

    // Filtro por búsqueda (nombre consultante, área consulta)
    if (filtros.busqueda.trim()) {
      const busqueda = filtros.busqueda.toLowerCase().trim()
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
        if (/^\d+$/.test(filtros.busqueda.trim()) && id.includes(busqueda)) {
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
              cumpleMes = fechaCreacion.getMonth() === parseInt(filtros.mes) - 1
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

    setControlesFiltrados(controlesParaFiltrar)
  }

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      mes: '',
      ano: ''
    })
  }

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

  // Función para obtener el estado dinámico del control
  const getEstadoDinamico = (control) => {
    // Si tiene estado_resultado, mostrar el resultado del coordinador
    if (control.estado_resultado) {
      const estadosResultado = {
        'asesoria_consulta': 'Asesoría/Consulta',
        'auto_reparto': 'Auto Reparto', 
        'reparto': 'Reparto',
        'solicitud_conciliacion': 'Solicitud de Conciliación'
      }
      return {
        text: estadosResultado[control.estado_resultado] || control.estado_resultado,
        color: 'bg-blue-100 text-blue-800',
        darkColor: 'bg-blue-900/30 text-blue-300'
      }
    }

    // Si el estado_flujo es 'completo', el profesor ya completó su parte
    if (control.estado_flujo === 'completo') {
      return {
        text: 'Completo - Esperando coordinador',
        color: 'bg-green-100 text-green-800', 
        darkColor: 'bg-green-900/30 text-green-300'
      }
    }

    // Si el estado_flujo es 'pendiente_profesor', esperando que el profesor complete
    if (control.estado_flujo === 'pendiente_profesor') {
      return {
        text: 'Pendiente - Esperando profesor',
        color: 'bg-yellow-100 text-yellow-800',
        darkColor: 'bg-yellow-900/30 text-yellow-300'
      }
    }

    // Estado por defecto
    return {
      text: control.estado_flujo || 'Sin estado',
      color: 'bg-gray-100 text-gray-800',
      darkColor: 'bg-gray-900/30 text-gray-300'
    }
  }

  const cargarControles = async (page = 1) => {
    try {
      setLoading(true)
      // Cargar controles del estudiante actual - el backend filtra automáticamente por created_by_id
      const response = await axios.get('/api/control-operativo/list')
      // Backend devuelve directamente el array de controles del estudiante
      setControles(response.data || [])
    } catch (error) {
      console.error('Error cargando controles:', error)
      setControles([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      setLoading(true)
      
      const camposObligatorios = [
        'ciudad', 
        'nombre_estudiante', 
        'nombre_consultante', 
        'numero_documento'
      ]
      const camposFaltantes = camposObligatorios.filter(campo => {
        const valor = formData[campo]
        if (typeof valor === 'string') {
          return !valor.trim()
        }
        return !valor
      })
      
      if (camposFaltantes.length > 0) {
        const camposTexto = camposFaltantes.map(campo => {
          switch(campo) {
            case 'ciudad': return 'Ciudad'
            case 'nombre_estudiante': return 'Nombre del estudiante responsable'
            case 'nombre_consultante': return 'Nombre del consultante'
            case 'numero_documento': return 'Número de documento del consultante'
            default: return campo
          }
        })
        setInfoModalData({
          title: "Campos Obligatorios Faltantes",
          message: "Por favor completa los siguientes campos obligatorios antes de guardar:",
          details: camposTexto,
          type: "error"
        })
        setShowInfoModal(true)
        setLoading(false)
        return
      }
      
      // Validar que hay archivos subidos
      if (documentos.length === 0) {
        setInfoModalData({
          title: "Archivos Obligatorios Faltantes",
          message: "Debes subir al menos un archivo para continuar. Los archivos son obligatorios para el control operativo.",
          details: [
            "Mínimo: 1 archivo requerido",
            "Máximo: 25 archivos permitidos",
            "Formatos: Todos los tipos de archivo aceptados",
            "Los archivos se integrarán automáticamente en el PDF final"
          ],
          type: "error",
          confirmText: "Entendido"
        })
        setShowInfoModal(true)
        setLoading(false)
        return
      }
      
      const dataToSend = {
        ...formData,
        // Campos obligatorios garantizados
        ciudad: formData.ciudad || 'Bogotá D.C',
        nombre_estudiante: formData.nombre_estudiante || user?.nombres + ' ' + user?.apellidos || 'Estudiante',
        nombre_consultante: formData.nombre_consultante || 'Consultante',
        area_consulta: formData.area_consulta || 'General',
        descripcion_caso: formData.descripcion_caso || 'Caso pendiente de descripción',
        concepto_estudiante: formData.concepto_estudiante || 'Análisis pendiente',
        // Fechas requeridas
        fecha_dia: parseInt(formData.fecha_dia) || new Date().getDate(),
        fecha_mes: parseInt(formData.fecha_mes) || (new Date().getMonth() + 1),
        fecha_ano: parseInt(formData.fecha_ano) || new Date().getFullYear(),
        // Campos opcionales con valores por defecto seguros
        fecha_nacimiento_dia: formData.fecha_nacimiento_dia ? parseInt(formData.fecha_nacimiento_dia) : 1,
        fecha_nacimiento_mes: formData.fecha_nacimiento_mes ? parseInt(formData.fecha_nacimiento_mes) : 1,
        fecha_nacimiento_ano: formData.fecha_nacimiento_ano ? parseInt(formData.fecha_nacimiento_ano) : 1990,
        edad: formData.edad ? parseInt(formData.edad) : 0,
        estrato: formData.estrato ? parseInt(formData.estrato) : 0
      }
      
      const response = await axios.post('/api/control-operativo', dataToSend)
      console.log('✅ Control operativo guardado con ID:', response.data.id)
      
      // Subir archivos al control operativo recién creado
      if (documentos.length > 0 && response.data.control) {
        console.log(`📎 Subiendo ${documentos.length} archivos al control ${response.data.control.id}`)
        
        for (const doc of documentos) {
          try {
            const formDataFiles = new FormData()
            formDataFiles.append('file', doc.file)
            
            await axios.post(`/api/control-operativo/${response.data.control.id}/archivo`, formDataFiles, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            })
          } catch (fileError) {
            console.error('❌ Error subiendo archivo:', doc.filename, fileError)
          }
        }
        console.log('✅ Archivos subidos exitosamente')
      }
      
      setInfoModalData({
        title: "Control Operativo Guardado Exitosamente",
        message: "El control operativo de consulta jurídica ha sido registrado correctamente en el sistema.",
        details: [
          `ID del control: ${response.data.id || 'Generado automáticamente'}`,
          `Ciudad: ${dataToSend.ciudad}`,
          `Fecha: ${dataToSend.fecha_dia}/${dataToSend.fecha_mes}/${dataToSend.fecha_ano}`,
          `Consultante: ${dataToSend.nombre_consultante || 'No especificado'}`,
          `Área de consulta: ${dataToSend.area_consulta || 'No especificado'}`,
          `Archivos adjuntos: ${documentos.length}`,
          `Fecha de registro: ${new Date().toLocaleString()}`
        ],
        type: "success"
      })
      setShowInfoModal(true)
      
      await cargarControles()
      cancelarFormulario()
    } catch (error) {
      console.error('❌ Error guardando control operativo:', error.response?.data || error.message)
      
      let errorMessage = 'Error guardando el control operativo'
      let errorDetails = []
      
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = 'Errores de validación encontrados'
          errorDetails = error.response.data.detail.map(err => {
            const field = err.loc?.join('.') || 'Campo desconocido'
            const message = err.msg || 'Error de validación'
            return `${field}: ${message}`
          })
        } else {
          errorMessage = error.response.data.detail
        }
      } else if (error.request) {
        errorMessage = 'Error de conexión con el servidor'
        errorDetails = ['Verifica tu conexión a internet', 'Asegúrate de que el servidor esté funcionando']
      } else {
        errorMessage = 'Error inesperado'
        errorDetails = [error.message || 'Error desconocido']
      }
      
      setInfoModalData({
        title: "Error al Guardar Control Operativo",
        message: errorMessage,
        details: errorDetails,
        type: "error"
      })
      setShowInfoModal(true)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async (id) => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/control-operativo/${id}/pdf`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `control_operativo_${id}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      
      // Mostrar modal informativo
      setInfoModalData({
        title: "PDF Descargado",
        message: "El control operativo se ha descargado correctamente.",
        details: [
          `Control Operativo #${id}`,
          "Archivo PDF generado exitosamente",
          "Revisa tu carpeta de descargas"
        ],
        type: "success"
      })
      setShowInfoModal(true)
    } catch (error) {
      console.error('Error generando PDF:', error)
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

  const resetFormData = () => {
    setFormData({
      ciudad: 'Bogotá D.C',
      fecha_dia: new Date().getDate(),
      fecha_mes: new Date().getMonth() + 1,
      fecha_ano: new Date().getFullYear(),
      nombre_docente_responsable: '',
      nombre_estudiante: (user?.nombres && user?.apellidos) ? `${user.nombres} ${user.apellidos}` : '',
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
      concepto_estudiante: '',
    })
    setDocumentos([])
  }

  const cancelarFormulario = () => {
    resetFormData()
    setShowForm(false)
    setEditingId(null)
  }

  const cargarDocumentos = async (controlId, page = 1) => {
    try {
      const response = await axios.get(`/api/control-operativo/${controlId}/documentos?page=${page}&limit=20`)
      
      // Convertir datos del servidor paginados al formato esperado por el frontend
      const documentosFormateados = response.data.items.map(doc => ({
        id: doc.id,
        filename: doc.nombre_original,
        size: doc.tamaño,
        type: doc.tipo_contenido,
        uploaded_by: doc.uploaded_by || 'Usuario',
        uploaded_at: doc.created_at
      }))
      
      setDocumentos(documentosFormateados)
      
      // Opcional: manejar información de paginación si es necesaria
      // setPaginationInfo(response.data.pagination)
      
    } catch (error) {
      console.error('Error cargando documentos:', error)
      setDocumentos([]) // Fallback en caso de error
    }
  }

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files)
    if (!files.length) return
    
    // Validar que todos los archivos sean PDFs
    const invalidFiles = files.filter(file => !file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))
    if (invalidFiles.length > 0) {
      setInfoModalData({
        title: "Tipo de Archivo No Válido",
        message: `Solo se permiten archivos PDF. Los siguientes archivos no son válidos: ${invalidFiles.map(f => f.name).join(', ')}`,
        type: "error"
      })
      setShowInfoModal(true)
      return
    }
    
    // Validar tamaño individual de archivos
    const maxSize = 5 * 1024 * 1024 // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      setInfoModalData({
        title: "Archivo Muy Grande",
        message: `Los siguientes archivos exceden el límite de 5MB: ${oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(', ')}`,
        type: "error"
      })
      setShowInfoModal(true)
      return
    }
    
    // Validar límite de archivos
    if (documentos.length + files.length > 30) {
      setInfoModalData({
        title: "Límite de Archivos Excedido",
        message: `Solo puedes subir hasta 30 archivos en total. Tienes ${documentos.length} archivos y estás intentando agregar ${files.length} más.`,
        type: "error"
      })
      setShowInfoModal(true)
      return
    }

    try {
      setUploadingFile(true)
      
      // Si no hay control guardado, almacena los archivos temporalmente
      if (!editingId) {
        const tempFiles = files.map((file, i) => ({
          id: Date.now() + i,
          filename: file.name,
          size: file.size,
          type: file.type,
          file: file, // Almacenar el objeto File real
          uploaded_by: (user?.nombres && user?.apellidos) ? `${user.nombres} ${user.apellidos}` : 'Usuario',
          uploaded_at: new Date().toISOString()
        }))
        
        // Agregar archivos a los existentes
        setDocumentos(prev => [...prev, ...tempFiles])
        
        setInfoModalData({
          title: "Archivos Cargados",
          message: `${files.length} archivo(s) han sido cargados correctamente. Se incluirán automáticamente en el PDF final cuando guardes el control operativo.`,
          details: [
            `Archivos agregados: ${files.length}`,
            `Total de archivos: ${documentos.length + files.length}`,
            `Tamaño total: ${((files.reduce((sum, f) => sum + f.size, 0)) / 1024 / 1024).toFixed(2)} MB`,
            "Estado: Listos para integrar en PDF"
          ],
          type: "success"
        })
        setShowInfoModal(true)
      } else {
        // Si hay control guardado, subir archivos directamente
        const formDataFiles = new FormData()
        files.forEach(file => {
          formDataFiles.append('files', file)
        })
        
        await axios.post(`/api/control-operativo/${editingId}/documentos/upload`, formDataFiles, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        await cargarDocumentos(editingId)
        
        setInfoModalData({
          title: "Archivos Subidos",
          message: `${files.length} archivo(s) han sido subidos correctamente al servidor.`,
          type: "success"
        })
        setShowInfoModal(true)
      }
      
      // NO limpiar el input para mantener la selección visible
      // event.target.value = ''
    } catch (error) {
      console.error('Error subiendo archivos:', error)
      setInfoModalData({
        title: "Error al Subir Archivos",
        message: "No se pudieron subir algunos archivos. Inténtalo nuevamente.",
        type: "error"
      })
      setShowInfoModal(true)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteDocument = async (documentoId) => {
    if (!confirm('¿Estás seguro de eliminar este archivo?')) return

    try {
      if (editingId) {
        await axios.delete(`/api/control-operativo/${editingId}/documentos/${documentoId}`)
        await cargarDocumentos(editingId)
      } else {
        // Eliminar archivo temporal específico
        setDocumentos(prev => prev.filter(doc => doc.id !== documentoId))
      }
    } catch (error) {
      console.error('Error eliminando documento:', error)
      alert('Error eliminando el archivo')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (showForm) {
    return (
      <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 to-blue-50'}`}>
        <div className="flex justify-center min-h-full">
          <div className="w-full max-w-4xl mx-auto px-4 py-8">
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border shadow-lg p-6 lg:p-8`}>
              <div className="flex justify-between items-center mb-8">
                <h1 className={`text-3xl font-bold ${isDark ? 'text-purple-400' : 'text-university-purple'}`}>
                  {editingId ? 'Editar' : 'Nuevo'} Control Operativo
                </h1>
                <button
                  onClick={cancelarFormulario}
                  className={`${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-500 hover:bg-gray-600 text-white'} px-4 py-2 rounded-lg transition-colors`}
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-6 rounded-lg`}>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-4`}>
                    I. DATOS DEL USUARIO
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Ciudad
                      </label>
                      <input
                        type="text"
                        name="ciudad"
                        value={formData.ciudad}
                        onChange={handleInputChange}
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
                        name="nombre_docente_responsable"
                        value={formData.nombre_docente_responsable}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                        required
                      >
                        <option value="">Seleccione un profesor</option>
                        {profesores.map((profesor) => (
                          <option key={profesor.id} value={profesor.nombre}>
                            {profesor.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Nombre del Estudiante
                      </label>
                      <input
                        type="text"
                        name="nombre_estudiante"
                        value={formData.nombre_estudiante}
                        onChange={handleInputChange}
                        readOnly
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
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                  </div>

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
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>

                    <div>
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

                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Sexo
                      </label>
                      <select
                        name="sexo"
                        value={formData.sexo}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      >
                        <option value="">Seleccionar</option>
                        <option value="Femenino">Femenino</option>
                        <option value="Masculino">Masculino</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Tipo de documento
                      </label>
                      <select
                        name="tipo_documento"
                        value={formData.tipo_documento}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      >
                        <option value="">Seleccionar</option>
                        <option value="T.I.">T.I.</option>
                        <option value="C.C.">C.C.</option>
                        <option value="NUIP">NUIP</option>
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
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
                      <input
                        type="number"
                        name="estrato"
                        value={formData.estrato}
                        onChange={handleInputChange}
                        min="1"
                        max="6"
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Número telefónico
                      </label>
                      <input
                        type="text"
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
                        type="text"
                        name="numero_celular"
                        value={formData.numero_celular}
                        onChange={handleInputChange}
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
                    </div>
                  </div>

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
                        <option value="Soltero(a)">Soltero(a)</option>
                        <option value="Casado(a)">Casado(a)</option>
                        <option value="Divorciado(a)">Divorciado(a)</option>
                        <option value="Viudo(a)">Viudo(a)</option>
                        <option value="Unión libre">Unión libre</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-1`}>
                        Escolaridad
                      </label>
                      <input
                        type="text"
                        name="escolaridad"
                        value={formData.escolaridad}
                        onChange={handleInputChange}
                        placeholder="Ej: Bachiller, Técnico, Universitario"
                        className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                      />
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

                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-6 rounded-lg`}>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-4`}>
                    III. BREVE DESCRIPCIÓN DEL CASO
                  </h2>
                  
                  <div>
                    <textarea
                      name="descripcion_caso"
                      value={formData.descripcion_caso}
                      onChange={handleInputChange}
                      rows={8}
                      placeholder="Describa brevemente el caso..."
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent ${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                  </div>
                </div>

                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-6 rounded-lg`}>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-4`}>
                    IV. CONCEPTO DEL ESTUDIANTE
                  </h2>
                  
                  <div>
                    <textarea
                      name="concepto_estudiante"
                      value={formData.concepto_estudiante}
                      onChange={handleInputChange}
                      rows={6}
                      placeholder="Escriba su análisis jurídico del caso..."
                      className={`${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                    />
                  </div>
                </div>


                {/* VII. ARCHIVO OBLIGATORIO */}
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-6 rounded-lg`}>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-4`}>
                    VII. ARCHIVO OBLIGATORIO *
                  </h2>
                  
                  <div className="mb-4">
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>
                      Subir archivos (hasta 30 archivos) *
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        multiple
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

                  {/* Archivo subido */}
                  {documentos.length > 0 && (
                    <div className="mt-4">
                      <h3 className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Archivos subidos ({documentos.length}/30):</h3>
                      <div className="space-y-2">
                        {documentos.map((doc) => (
                          <div key={doc.id} className={`flex items-center justify-between ${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-3 rounded-lg`}>
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${isDark ? 'text-purple-400' : 'text-university-purple'}`}>{doc.filename || doc.nombre_original}</p>
                              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Subido por {doc.uploaded_by || (user?.nombres && user?.apellidos ? `${user.nombres} ${user.apellidos}` : 'Usuario')} • {new Date(doc.uploaded_at || Date.now()).toLocaleDateString()}
                                • {((doc.tamaño || doc.size) / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className={`ml-4 px-3 py-1 rounded-lg text-xs transition-colors duration-200 ${isDark ? 'bg-red-900/30 hover:bg-red-600 text-red-400' : 'bg-red-50 hover:bg-red-600 text-red-600 hover:text-white'}`}
                              title="Eliminar archivo"
                            >
                              Eliminar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {documentos.length === 0 && (
                    <div className={`text-center py-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <p>No hay archivos subidos</p>
                      <p className="text-sm">El archivo subido se integrará automáticamente en el PDF generado</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4 pt-6">
                  <button
                    type="button"
                    onClick={cancelarFormulario}
                    className={`${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-500 hover:bg-gray-600 text-white'} px-6 py-3 rounded-lg font-medium transition-colors`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-university-purple hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm p-6 lg:p-8`}>
          <div className="flex justify-between items-center mb-8">
            <h1 className={`text-3xl font-bold ${isDark ? 'text-purple-400' : 'text-university-purple'}`}>
              Mis Controles Operativos
            </h1>
            <button
              onClick={() => setShowForm(true)}
              className="bg-university-purple hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Nuevo Control Operativo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} p-4 rounded-lg border shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} font-medium`}>Mis Reportes</div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-purple-400' : 'text-university-purple'} mt-1`}>{controles.length}</div>
                </div>
                <div className={`p-2 rounded-full ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                  <svg className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className={`${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} p-4 rounded-lg border shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} font-medium`}>Filtrados</div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'} mt-1`}>{controlesFiltrados.length}</div>
                </div>
                <div className={`p-2 rounded-full ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                  <svg className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className={`${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} p-4 rounded-lg border shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} font-medium`}>Activos</div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'} mt-1`}>{controles.filter(c => c.activo).length}</div>
                </div>
                <div className={`p-2 rounded-full ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
                  <svg className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9ZM19 21H5V3H13V9H19V21Z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className={`${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} p-4 rounded-lg border shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} font-medium`}>Último ID</div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'} mt-1`}>
                    {controles.length > 0 ? Math.max(...controles.map(c => c.id)) : 0}
                  </div>
                </div>
                <div className={`p-2 rounded-full ${isDark ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                  <svg className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z" />
                  </svg>
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Barra de Búsqueda */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Buscar
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Nombre, área, documento..."
                      value={filtros.busqueda}
                      onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
                      className={`w-full pl-10 pr-4 py-2 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'}`}
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
                    className={`w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
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
                    className={`w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="">Todos los años</option>
                    {anosDisponibles.map(ano => (
                      <option key={ano} value={ano}>{ano}</option>
                    ))}
                  </select>
                </div>

                {/* Botón Limpiar Filtros */}
                <div className="flex items-end sm:col-span-2 lg:col-span-1">
                  <button
                    onClick={limpiarFiltros}
                    disabled={!filtros.busqueda && !filtros.mes && !filtros.ano}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="hidden sm:inline">Limpiar</span>
                  </button>
                </div>
              </div>
              
              {/* Información de filtros aplicados */}
              {(filtros.busqueda || filtros.mes || filtros.ano) && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Filtros aplicados: 
                    {filtros.busqueda && <span className="ml-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs">Búsqueda: "{filtros.busqueda}"</span>}
                    {filtros.mes && <span className="ml-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs">Mes: {meses.find(m => m.value === filtros.mes)?.label}</span>}
                    {filtros.ano && <span className="ml-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs">Año: {filtros.ano}</span>}
                  </p>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300"></div>
            </div>
          )}

          {!loading && controles.length === 0 && (
            <div className="text-center py-12">
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-lg`}>No hay controles operativos creados</p>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>Haz clic en "Nuevo Control Operativo" para comenzar</p>
            </div>
          )}

          {!loading && controles.length > 0 && controlesFiltrados.length === 0 && (
            <div className={`text-center py-12 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border`}>
              <div className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-600' : 'text-gray-400'} mb-4`}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className={`${isDark ? 'text-gray-300' : 'text-gray-900'} text-lg font-medium mb-2`}>
                No se encontraron resultados
              </h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6 max-w-md mx-auto`}>
                {filtros.busqueda && filtros.mes
                  ? `No hay controles que coincidan con "${filtros.busqueda}" en ${meses.find(m => m.value === filtros.mes)?.label}${filtros.ano ? ` de ${filtros.ano}` : ''}`
                  : filtros.busqueda && filtros.ano
                  ? `No hay controles que coincidan con "${filtros.busqueda}" en ${filtros.ano}`
                  : filtros.busqueda
                  ? `No hay controles que coincidan con "${filtros.busqueda}"`
                  : filtros.mes && filtros.ano
                  ? `No hay controles operativos en ${meses.find(m => m.value === filtros.mes)?.label} de ${filtros.ano}`
                  : filtros.mes
                  ? `No hay controles operativos en ${meses.find(m => m.value === filtros.mes)?.label}`
                  : filtros.ano
                  ? `No hay controles operativos en ${filtros.ano}`
                  : 'No se encontraron controles con los filtros aplicados'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={limpiarFiltros}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${isDark 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Limpiar filtros</span>
                  </div>
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-2 bg-university-purple hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Crear nuevo control</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {controlesFiltrados.length > 0 && (
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-purple-400' : 'text-university-purple'}`}>Mis Controles Operativos ({controlesFiltrados.length})</h2>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm mt-1`}>
                  Consulta y gestiona tus controles operativos
                </p>
              </div>
              
              {/* Vista Desktop - Tabla */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                        ID
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                        Fecha
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                        Consultante
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                        Profesor
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                        Área de Consulta
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                        Estado
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {controlesFiltrados.map((control) => {
                      const estado = getEstadoDinamico(control)
                      return (
                        <tr key={control.id} className={`${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'hover:bg-purple-50/50'} transition-colors`}>
                          <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            #{control.id}
                          </td>
                          <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            {control.fecha_dia && control.fecha_mes && control.fecha_ano
                              ? `${String(control.fecha_dia).padStart(2, '0')}/${String(control.fecha_mes).padStart(2, '0')}/${control.fecha_ano}`
                              : control.created_at 
                                ? new Date(control.created_at).toLocaleDateString('es-CO', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric'
                                  })
                                : <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'} italic`}>No definida</span>
                            }
                          </td>
                          <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
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
                          <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            <div>
                              <div className="font-medium">
                                {control.nombre_docente_responsable 
                                  ? control.nombre_docente_responsable.split(' ').length >= 2 
                                    ? `${control.nombre_docente_responsable.split(' ')[0]} ${control.nombre_docente_responsable.split(' ')[1]}`
                                    : control.nombre_docente_responsable
                                  : 'Sin asignar'
                                }
                              </div>
                              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Profesor
                              </div>
                            </div>
                          </td>
                          <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            {control.area_consulta || 'Sin área'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                              isDark ? estado.darkColor : estado.color
                            }`}>
                              {estado.text}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-3 justify-center">
                              <button
                                onClick={() => handleGeneratePDF(control.id)}
                                disabled={control.estado_flujo === 'pendiente_profesor'}
                                className={`inline-flex items-center px-4 py-2 text-sm font-medium border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                                  control.estado_flujo === 'pendiente_profesor'
                                    ? 'text-gray-400 bg-gray-200 cursor-not-allowed'
                                    : 'text-white bg-university-blue hover:bg-gray-700 focus:ring-blue-500'
                                }`}
                                title={control.estado_flujo === 'pendiente_profesor' ? 'PDF disponible cuando el profesor complete su parte' : 'Generar PDF'}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {control.estado_flujo === 'pendiente_profesor' ? 'Pendiente' : 'Descargar PDF'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista Mobile - Cards */}
              <div className="lg:hidden space-y-4 p-4">
                {controlesFiltrados.map((control) => {
                  const estado = getEstadoDinamico(control)
                  return (
                    <div key={control.id} className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      {/* Header del Card */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className={`text-lg font-bold ${isDark ? 'text-purple-400' : 'text-university-purple'}`}>
                            #{control.id}
                          </span>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {control.fecha_dia && control.fecha_mes && control.fecha_ano
                              ? `${String(control.fecha_dia).padStart(2, '0')}/${String(control.fecha_mes).padStart(2, '0')}/${control.fecha_ano}`
                              : control.created_at 
                                ? new Date(control.created_at).toLocaleDateString('es-CO', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric'
                                  })
                                : 'No definida'
                            }
                          </div>
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                            isDark ? estado.darkColor : estado.color
                          }`}>
                            {estado.text}
                          </span>
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
                      <div className="pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleGeneratePDF(control.id)}
                          disabled={control.estado_flujo === 'pendiente_profesor'}
                          className={`w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                            control.estado_flujo === 'pendiente_profesor'
                              ? 'text-gray-400 bg-gray-200 cursor-not-allowed'
                              : 'text-white bg-university-blue hover:bg-gray-700 focus:ring-blue-500'
                          }`}
                          title={control.estado_flujo === 'pendiente_profesor' ? 'PDF disponible cuando el profesor complete su parte' : 'Generar PDF'}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {control.estado_flujo === 'pendiente_profesor' ? 'Pendiente' : 'Descargar PDF'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      
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

export default ControlOperativoEstudiante