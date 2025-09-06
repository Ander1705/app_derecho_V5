import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import axios from 'axios'

const ControlOperativoCoordinador = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [searchParams] = useSearchParams()
  const [controles, setControles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedControl, setSelectedControl] = useState(null)
  const [estadoResultado, setEstadoResultado] = useState('')
  const [asignandoResultado, setAsignandoResultado] = useState(false)
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

  useEffect(() => {
    if (user?.role === 'coordinador') {
      const estadoParam = searchParams.get('estado')
      cargarControlesCompletos(estadoParam)
    }
  }, [user, searchParams])

  // Efecto para aplicar filtros desde URL
  useEffect(() => {
    const areaParam = searchParams.get('area')
    const estadoParam = searchParams.get('estado')
    
    if (areaParam) {
      console.log('🎯 Filtrando por área desde URL:', areaParam)
      setFiltros(prev => ({
        ...prev,
        area: areaParam,
        busqueda: ''
      }))
    }
    
    if (estadoParam === 'pendiente') {
      console.log('🎯 Mostrando controles pendientes desde URL')
      // No necesitamos cambiar filtros, ya se carga directamente desde backend
    }
  }, [searchParams])

  // Efecto para filtrar controles cuando cambian los filtros o los controles
  useEffect(() => {
    aplicarFiltros()
  }, [controles, filtros])

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

    // Filtro por búsqueda (ID, cédula, nombre, área)
    if (filtros.busqueda.trim()) {
      const busqueda = filtros.busqueda.toLowerCase().trim()
      controlesParaFiltrar = controlesParaFiltrar.filter(control => {
        const nombreConsultante = control.nombre_consultante?.toLowerCase().trim() || ''
        const nombreEstudiante = control.nombre_estudiante?.toLowerCase().trim() || ''
        const nombreProfesor = control.nombre_docente_responsable?.toLowerCase().trim() || ''
        const areaConsulta = control.area_consulta?.toLowerCase().trim() || ''
        const numeroDocumento = control.numero_documento?.toString().toLowerCase() || ''
        const numeroDocumentoEstudiante = control.created_by_user?.numero_documento?.toString().toLowerCase() || ''
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
               nombreProfesor.includes(busqueda) ||
               areaConsulta.includes(busqueda) ||
               numeroDocumento.includes(busqueda) ||
               numeroDocumentoEstudiante.includes(busqueda)
      })
    }

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
  }

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      mes: '',
      ano: ''
    })
  }

  const cargarControlesCompletos = async (estadoFiltro = null) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Construir URL con parámetros de filtro
      let url = 'http://localhost:8000/api/coordinador/controles-completos'
      if (estadoFiltro === 'pendiente') {
        url += '?estado=pendiente'
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Ordenar por fecha de creación descendente (más recientes primero) y limitar a 50
      const controlesOrdenados = (response.data || [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50)
      
      console.log('📋 Controles cargados y ordenados:', controlesOrdenados.length)
      setControles(controlesOrdenados)
    } catch (error) {
      console.error('Error cargando controles:', error)
      setError('Error al cargar controles completos')
    } finally {
      setLoading(false)
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

    try {
      setAsignandoResultado(true)
      const token = localStorage.getItem('token')
      
      await axios.put(
        `http://localhost:8000/api/coordinador/control-operativo/${selectedControl.id}/resultado`,
        { estado_resultado: estadoResultado },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Actualizar el estado local inmediatamente
      setControles(prev => prev.map(control => 
        control.id === selectedControl.id 
          ? { ...control, estado_resultado: estadoResultado }
          : control
      ))
      
      alert('Resultado asignado exitosamente')
      setSelectedControl(null)
    } catch (error) {
      console.error('Error asignando resultado:', error)
      alert('Error al asignar resultado')
    } finally {
      setAsignandoResultado(false)
    }
  }

  const descargarPDF = async (control) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(
        `http://localhost:8000/api/control-operativo/${control.id}/pdf`,
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
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {estadosResultado[estadoResultado]}
        </span>
      )
    }
    
    if (estadoFlujo === 'completo') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Listo para resultado
        </span>
      )
    }

    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
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
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Controles Completos
                </p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {controles.length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Barra de Búsqueda */}
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Buscar
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ID, nombre, cédula, área..."
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
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

              {/* Botón Limpiar Filtros */}
              <div className="flex items-end">
                <button
                  onClick={limpiarFiltros}
                  disabled={!filtros.busqueda && !filtros.mes && !filtros.ano}
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

          {controles.length === 0 ? (
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
                      <th className={`w-36 px-6 py-3 text-left text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`${isDark ? 'bg-gray-800' : 'bg-white'} divide-y divide-gray-200`}>
                    {controlesFiltrados.map((control) => (
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
                          <button
                            onClick={() => handleVerDetalle(control)}
                            className="text-university-blue hover:text-blue-700 mr-3"
                          >
                            {control.estado_resultado ? 'Ver detalle' : 'Asignar resultado'}
                          </button>
                          <button
                            onClick={() => descargarPDF(control)}
                            className="text-green-600 hover:text-green-700"
                          >
                            Descargar PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista Mobile - Cards */}
              <div className="lg:hidden space-y-4 p-4">
                {controlesFiltrados.map((control) => (
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
                    <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleVerDetalle(control)}
                        className="flex-1 px-4 py-2 bg-university-blue text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {control.estado_resultado ? 'Ver detalle' : 'Asignar resultado'}
                      </button>
                      <button
                        onClick={() => descargarPDF(control)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Descargar PDF
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

              {!selectedControl.estado_resultado && (
                <div className="mb-6">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Asignar Resultado Final *
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
                </div>
              )}

              {selectedControl.estado_resultado && (
                <div className="mb-6">
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Resultado Asignado
                  </label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-blue-800 font-medium">
                      {estadosResultado[selectedControl.estado_resultado]}
                    </span>
                  </div>
                </div>
              )}

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
                {!selectedControl.estado_resultado && (
                  <button
                    onClick={handleAsignarResultado}
                    disabled={asignandoResultado || !estadoResultado}
                    className={`px-4 py-2 rounded-lg text-white ${
                      asignandoResultado || !estadoResultado
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-university-blue hover:bg-blue-700'
                    }`}
                  >
                    {asignandoResultado ? 'Asignando...' : 'Asignar Resultado'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ControlOperativoCoordinador