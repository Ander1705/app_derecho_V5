import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import axios from 'axios'
import API_BASE_URL from '../../config/api'
import { 
  PencilSquareIcon, 
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline'

const ControlOperativoCoordinador = () => {
  // console.log('🔄 ControlOperativoCoordinador se está renderizando...')
  
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [searchParams] = useSearchParams()
  const [controles, setControles] = useState([])
  const [controlesOriginales, setControlesOriginales] = useState([]) // Mantener copia de controles originales
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedControl, setSelectedControl] = useState(null)
  const [estadoResultado, setEstadoResultado] = useState('')
  const [asignandoResultado, setAsignandoResultado] = useState(false)
  const [searchMode, setSearchMode] = useState(false) // Para saber si estamos en modo búsqueda
  
  // Estados para modal de confirmación
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [controlesFiltrados, setControlesFiltrados] = useState([])
  const [filtros, setFiltros] = useState({
    busqueda: '',
    mes: '',
    ano: '',
    area: ''
  })

  const estadosResultado = {
    'asesoria_consulta': 'Asesoría/Consulta',
    'auto_reparto': 'Auto Reparto',
    'reparto': 'Reparto',
    'solicitud_conciliacion': 'Solicitud de Conciliación'
  }

  // Solo cargar controles una vez cuando el usuario es coordinador
  useEffect(() => {
    if (user?.role === 'coordinador') {
      const estadoParam = searchParams.get('estado')
      cargarControlesCompletos(estadoParam)
    }
  }, [user?.role]) // Solo depende del rol, NO de searchParams

  // Aplicar filtro de área una sola vez al montar
  useEffect(() => {
    const areaParam = searchParams.get('area')
    
    if (areaParam) {
      console.log('🎯 Filtrando por área desde URL:', areaParam)
      setFiltros(prev => ({
        ...prev,
        area: areaParam
      }))
    }
  }, []) // Solo ejecutar una vez al montar

  // Ya no necesitamos useEffect para búsqueda - se maneja directamente en onChange

  // Aplicar filtros automáticamente cuando cambien los filtros locales
  useEffect(() => {
    if (controles.length > 0 && !searchMode) {
      aplicarFiltros()
    }
  }, [filtros.mes, filtros.ano, filtros.area, controles, searchMode, aplicarFiltros])

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

  const aplicarFiltros = useCallback(() => {
    // Esta función solo aplica filtros locales (mes, año, área)
    // NO maneja búsqueda por texto - eso se hace via API
    let controlesParaFiltrar = [...controles]

    // Filtro específico por área de consulta
    if (filtros.area.trim()) {
      const areaFiltro = filtros.area.toLowerCase().trim()
      controlesParaFiltrar = controlesParaFiltrar.filter(control => {
        const areaConsulta = control.area_consulta?.toLowerCase().trim() || ''
        return areaConsulta.includes(areaFiltro) || areaConsulta === areaFiltro
      })
      console.log('🔍 Filtrando por área:', areaFiltro, 'Resultados:', controlesParaFiltrar.length)
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
  }, [controles, filtros.area, filtros.mes, filtros.ano])

  const limpiarFiltros = () => {
    console.log('🧹 Limpiando filtros...')
    setFiltros({
      busqueda: '',
      mes: '',
      ano: '',
      area: ''
    })
    
    // Restaurar datos originales
    restaurarDatos()
  }

  const cargarControlesCompletos = async (estadoFiltro = null) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Construir URL con parámetros de filtro
      let url = '/api/coordinador/controles-completos'
      if (estadoFiltro === 'pendiente') {
        url += '?estado=pendiente'
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Ordenar por fecha de creación descendente (más recientes primero)
      const controlesOrdenados = (response.data || [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      
      console.log('📋 Controles cargados y ordenados:', controlesOrdenados.length)
      setControles(controlesOrdenados)
      setControlesOriginales(controlesOrdenados) // Guardar copia original
      setControlesFiltrados(controlesOrdenados) // También inicializar filtrados
    } catch (error) {
      console.error('Error cargando controles:', error)
      setError('Error al cargar controles completos')
    } finally {
      setLoading(false)
    }
  }


  // ⭐ BÚSQUEDA EN TIEMPO REAL - SIN DELAYS
  const [searchTerm, setSearchTerm] = useState('')
  
  // Buscar inmediatamente mientras escribe
  const handleInputChange = async (e) => {
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
  
  // Función para buscar en tiempo real
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
      console.log('🔍 URL de búsqueda completa:', url)
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      console.log('📡 Respuesta completa:', response.data)
      const resultados = response.data.controles || []
      console.log('🎯 Controles encontrados:', resultados.length, 'resultados')
      
      // Logear algunos de los resultados para debug
      if (resultados.length > 0) {
        console.log('✅ ÉXITO: Encontrados', resultados.length, 'resultados')
        console.log('📋 Primeros 2 resultados:', resultados.slice(0, 2).map(r => ({ id: r.id, nombre_consultante: r.nombre_consultante, numero_documento: r.numero_documento })))
        
        if (resultados.length === 1) {
          console.log('🎯 RESULTADO ÚNICO - Control ID:', resultados[0].id, 'Consultante:', resultados[0].nombre_consultante)
        }
      } else {
        console.log('❌ NO se encontraron resultados para la búsqueda:', busqueda)
      }
      
      console.log('🔄 Actualizando estados...')
      console.log('🔄 Antes - controles:', controles.length, 'controlesFiltrados:', controlesFiltrados.length)
      
      setControles(resultados)
      setControlesFiltrados(resultados)
      setSearchMode(true)
      
      console.log('🔄 Después de setear - resultados:', resultados.length)
      
      // Forzar re-render después de un pequeño delay para verificar
      setTimeout(() => {
        console.log('✅ Estados después de timeout - controles.length:', controles.length, 'controlesFiltrados.length:', controlesFiltrados.length)
        console.log('🎨 searchMode:', searchMode)
        console.log('🔄 FORZANDO RE-RENDER...')
      }, 100)
      
    } catch (error) {
      console.error('❌ Error completo en búsqueda:', error)
      console.error('❌ Status:', error.response?.status)
      console.error('❌ Data:', error.response?.data)
      setControles([])
      setControlesFiltrados([])
      setSearchMode(true)
    }
  }
  
  const restaurarDatos = () => {
    console.log('🔄 Restaurando datos...')
    setSearchMode(false)
    setSearchTerm('')
    if (controlesOriginales.length > 0) {
      setControles(controlesOriginales)
      setControlesFiltrados(controlesOriginales)
    } else {
      cargarControlesCompletos()
    }
  }

  const handleVerDetalle = (control) => {
    setSelectedControl(control)
    setEstadoResultado(control.estado_resultado || '')
  }

  const handleAsignarResultado = async () => {
    if (!estadoResultado) {
      alert('Por favor seleccione un resultado')
      return
    }

    const esActualizacion = selectedControl.estado_resultado
    const accion = esActualizacion ? 'actualizado' : 'asignado'


    try {
      setAsignandoResultado(true)
      const token = localStorage.getItem('token')
      
      const response = await axios.put(
        `/api/coordinador/control-operativo/${selectedControl.id}/resultado`,
        { estado_resultado: estadoResultado },
        { headers: { Authorization: `Bearer ${token}` } }
      )


      // Actualizar el estado local inmediatamente
      setControles(prev => prev.map(control => 
        control.id === selectedControl.id 
          ? { ...control, estado_resultado: estadoResultado, estado_flujo: 'con_resultado' }
          : control
      ))
      
      // Actualizar el control seleccionado para reflejar el cambio
      setSelectedControl(prev => ({
        ...prev,
        estado_resultado: estadoResultado,
        estado_flujo: 'con_resultado'
      }))
      
      // Mostrar modal de éxito
      setSuccessMessage(`Resultado ${accion} exitosamente`)
      setShowSuccessModal(true)
      
      // Auto-cerrar modal de éxito después de 3 segundos
      setTimeout(() => {
        setShowSuccessModal(false)
      }, 3000)
      
      // Cerrar el modal principal después de 2 segundos
      setTimeout(() => {
        setSelectedControl(null)
      }, 2000)
    } catch (error) {
      console.error('Error asignando resultado:', error)
      
      let mensajeError = `Error al ${esActualizacion ? 'actualizar' : 'asignar'} resultado`
      if (error.response?.data?.error) {
        mensajeError += `: ${error.response.data.error}`
      }
      
      alert(mensajeError)
    } finally {
      setAsignandoResultado(false)
    }
  }

  const descargarPDF = async (control) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `/api/control-operativo/${control.id}/pdf`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `control_operativo_${control.id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error descargando PDF:', error)
      alert('Error al descargar el PDF')
    }
  }

  const getEstadoBadge = (estadoFlujo, estadoResultado) => {
    if (estadoResultado) {
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
          {estadosResultado[estadoResultado]}
        </span>
      )
    }
    
    if (estadoFlujo === 'completo') {
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}>
          Listo para resultado
        </span>
      )
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
        {estadoFlujo}
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
              Cargando controles completos...
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
            onClick={cargarControlesCompletos}
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
            Control Operativo - Coordinador
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Gestiona controles operativos completos y asigna resultados finales
          </p>
          
          {/* Indicador de filtro por área */}
          {filtros.area && (
            <div className={`mt-4 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800'}`}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Filtrando por área: <span className="font-bold ml-1">{filtros.area}</span>
              <button 
                onClick={() => setFiltros(prev => ({ ...prev, area: '' }))}
                className={`ml-2 transition-colors ${isDark ? 'text-purple-300 hover:text-purple-100' : 'text-purple-600 hover:text-purple-800'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <svg className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Controles Completos
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {searchMode ? controles.length : controlesOriginales.length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-yellow-900/30' : 'bg-yellow-100'}`}>
                <svg className={`w-6 h-6 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Sin Resultado
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {controlesFiltrados.filter(c => !c.estado_resultado).length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <svg className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Con Resultado
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {controlesFiltrados.filter(c => c.estado_resultado).length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                <svg className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        {(controlesOriginales.length > 0 || searchMode) && (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-6 mb-6`}>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-purple-400' : 'text-university-purple'} mb-4 flex items-center`}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Filtros y Búsqueda
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Barra de Búsqueda */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Buscar
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ID, cédula o nombre - busca en tiempo real..."
                    value={searchTerm}
                    onChange={handleInputChange}
                    autoComplete="off"
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'}`}
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
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
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
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">Todos los años</option>
                  {anosDisponibles.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Área de Consulta */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Área de Consulta
                </label>
                <select
                  value={filtros.area}
                  onChange={(e) => setFiltros({...filtros, area: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="">Todas las áreas</option>
                  <option value="Laboral">Laboral</option>
                  <option value="Civil">Civil</option>
                  <option value="Penal">Penal</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Familia">Familia</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Constitucional">Constitucional</option>
                </select>
              </div>

              {/* Botón Limpiar Filtros */}
              <div className="flex items-end">
                <button
                  onClick={limpiarFiltros}
                  disabled={!searchTerm && !searchMode && !filtros.mes && !filtros.ano && !filtros.area}
                  className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Limpiar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de controles completos */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Controles Operativos Completos ({controlesFiltrados.length})
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              Solo se muestran controles con secciones I-V completadas por estudiantes y profesores
            </p>
          </div>

          {(() => {
            console.log('🎨 RENDERIZADO - controlesOriginales.length:', controlesOriginales.length, 'searchMode:', searchMode, 'controlesFiltrados.length:', controlesFiltrados.length)
            return controlesOriginales.length === 0 && !searchMode
          })() ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                No hay controles completos
              </p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Los controles aparecerán aquí cuando estudiantes y profesores los hayan completado
              </p>
            </div>
          ) : (() => {
            console.log('🎨 CHECKING controlesFiltrados.length:', controlesFiltrados.length, '=== 0?', controlesFiltrados.length === 0)
            return controlesFiltrados.length === 0
          })() ? (
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
                className="mt-4 px-4 py-2 bg-university-blue text-white rounded-lg hover:bg-blue-700"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              {/* Vista Desktop - Tabla */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 table-fixed">
                  <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th className={`w-24 px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Control
                      </th>
                      <th className={`w-48 px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Estudiante
                      </th>
                      <th className={`w-40 px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Profesor
                      </th>
                      <th className={`w-40 px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Consultante
                      </th>
                      <th className={`w-32 px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Área de Consulta
                      </th>
                      <th className={`w-28 px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Estado
                      </th>
                      <th className={`w-24 px-6 py-3 text-center text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`${isDark ? 'bg-gray-800' : 'bg-white'} divide-y divide-gray-200`}>
                    {(controlesFiltrados || []).map((control) => (
                      <tr key={control.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            #{control.id}
                          </span>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(control.created_at).toLocaleDateString('es-ES')}
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                          <div>
                            <div className="font-medium">
                              {control.created_by_user?.nombres && control.created_by_user?.apellidos 
                                ? `${control.created_by_user.nombres.split(' ')[0]} ${control.created_by_user.apellidos.split(' ')[0]}`
                                : control.nombre_estudiante?.split(' ').slice(0, 2).join(' ')
                              }
                            </div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {control.created_by_user?.numero_documento ? `Doc: ${control.created_by_user.numero_documento}` : 'Sin documento'}
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
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
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                          <div>
                            <div className="font-medium">
                              {control.nombre_consultante 
                                ? control.nombre_consultante.split(' ').length >= 2 
                                  ? `${control.nombre_consultante.split(' ')[0]} ${control.nombre_consultante.split(' ')[1]}`
                                  : control.nombre_consultante
                                : 'Sin datos'
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
                          {getEstadoBadge(control.estado_flujo, control.estado_resultado)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleVerDetalle(control)}
                              className={`p-2 rounded-lg transition-colors duration-200 ${isDark ? 'text-blue-400 hover:bg-blue-900/20 hover:text-blue-300' : 'text-university-blue hover:bg-blue-50 hover:text-blue-700'}`}
                              title={control.estado_resultado ? 'Editar estado' : 'Asignar resultado'}
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => descargarPDF(control)}
                              className={`p-2 rounded-lg transition-colors duration-200 ${isDark ? 'text-green-400 hover:bg-green-900/20 hover:text-green-300' : 'text-green-600 hover:bg-green-50 hover:text-green-700'}`}
                              title="Descargar PDF"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista Mobile - Cards */}
              <div className="lg:hidden space-y-4 p-4">
                {(controlesFiltrados || []).map((control) => (
                  <div key={control.id} className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    {/* Header del Card */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          #{control.id}
                        </span>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(control.created_at).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                      <div>
                        {getEstadoBadge(control.estado_flujo, control.estado_resultado)}
                      </div>
                    </div>

                    {/* Información Principal */}
                    <div className="space-y-2 mb-4">
                      <div>
                        <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Estudiante</span>
                        <div className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                          {control.created_by_user?.nombres && control.created_by_user?.apellidos 
                            ? `${control.created_by_user.nombres.split(' ')[0]} ${control.created_by_user.apellidos.split(' ')[0]}`
                            : control.nombre_estudiante?.split(' ').slice(0, 2).join(' ')
                          }
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {control.created_by_user?.numero_documento ? `Doc: ${control.created_by_user.numero_documento}` : 'Sin documento'}
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
                            {control.area_consulta}
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Consultante</span>
                        <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                          {control.nombre_consultante 
                            ? control.nombre_consultante.split(' ').length >= 2 
                              ? `${control.nombre_consultante.split(' ')[0]} ${control.nombre_consultante.split(' ')[1]}`
                              : control.nombre_consultante
                            : 'Sin datos'
                          }
                        </div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {control.numero_documento ? `Doc: ${control.numero_documento}` : 'Sin documento'}
                        </div>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className={`flex justify-center gap-4 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <button
                        onClick={() => handleVerDetalle(control)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-university-blue text-white hover:bg-blue-700'}`}
                        title={control.estado_resultado ? 'Editar estado' : 'Asignar resultado'}
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        <span className="text-sm">{control.estado_resultado ? 'Editar' : 'Asignar'}</span>
                      </button>
                      <button
                        onClick={() => descargarPDF(control)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${isDark ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-600 text-white hover:bg-green-700'}`}
                        title="Descargar PDF"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span className="text-sm">PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal para asignar resultado */}
        {selectedControl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto`}>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Estudiante
                  </label>
                  <p className={`${isDark ? 'text-gray-100' : 'text-gray-900'} font-medium`}>
                    {selectedControl.nombre_estudiante}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedControl.created_by_user?.numero_documento ? `Doc: ${selectedControl.created_by_user.numero_documento}` : 'Sin documento'}
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Profesor Responsable
                  </label>
                  <p className={`${isDark ? 'text-gray-100' : 'text-gray-900'} font-medium`}>
                    {selectedControl.nombre_docente_responsable}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Profesor
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Consultante
                  </label>
                  <p className={`${isDark ? 'text-gray-100' : 'text-gray-900'} font-medium`}>
                    {selectedControl.nombre_consultante}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedControl.numero_documento ? `Doc: ${selectedControl.numero_documento}` : 'Sin documento'}
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
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Concepto del Asesor Jurídico (Profesor)
                </label>
                <p className={`${isDark ? 'text-gray-100 bg-gray-700' : 'text-gray-900 bg-gray-50'} p-3 rounded-lg text-sm`}>
                  {selectedControl.concepto_asesor}
                </p>
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  {selectedControl.estado_resultado ? 'Editar Resultado Final' : 'Asignar Resultado Final'} *
                </label>
                <select
                  value={estadoResultado}
                  onChange={(e) => setEstadoResultado(e.target.value)}
                  className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-university-blue focus:border-transparent border`}
                >
                  <option value="">Seleccione un resultado</option>
                  {Object.entries(estadosResultado).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                {selectedControl.estado_resultado && (
                  <div className={`mt-2 p-2 rounded-lg ${isDark ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                    <span className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      Estado actual: <span className="font-medium">{estadosResultado[selectedControl.estado_resultado]}</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedControl(null)}
                  className={`px-4 py-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cerrar
                </button>
                <button
                  onClick={() => descargarPDF(selectedControl)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Descargar PDF
                </button>
                <button
                  onClick={handleAsignarResultado}
                  disabled={asignandoResultado || !estadoResultado}
                  className={`px-4 py-2 rounded-lg text-white ${
                    asignandoResultado || !estadoResultado
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-university-blue hover:bg-blue-700'
                  }`}
                >
                  {asignandoResultado 
                    ? 'Guardando...' 
                    : selectedControl.estado_resultado 
                      ? 'Actualizar Resultado' 
                      : 'Asignar Resultado'
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación de éxito */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full mx-4 transform transition-all duration-300 scale-100`}>
              <div className="flex items-center justify-center mb-4">
                <div className={`flex items-center justify-center w-16 h-16 rounded-full ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
                  <CheckCircleIcon className={`w-8 h-8 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                </div>
              </div>
              
              <div className="text-center">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                  ¡Éxito!
                </h3>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                  {successMessage}
                </p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${isDark ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ControlOperativoCoordinador