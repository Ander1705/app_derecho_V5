import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'

const ControlesAsignados = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [controles, setControles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedControl, setSelectedControl] = useState(null)
  const [conceptoAsesor, setConceptoAsesor] = useState('')
  const [saving, setSaving] = useState(false)
  const [controlesFiltrados, setControlesFiltrados] = useState([])
  const [searchParams] = useSearchParams()
  const [filtros, setFiltros] = useState({
    busqueda: '',
    mes: '',
    ano: '',
    estado: searchParams.get('estado') || 'todos'
  })

  useEffect(() => {
    cargarControlesAsignados()
  }, [])

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

    // Filtro por estado
    if (filtros.estado !== 'todos') {
      switch (filtros.estado) {
        case 'pendientes':
          controlesParaFiltrar = controlesParaFiltrar.filter(control => 
            control.estado_flujo === 'pendiente_profesor'
          )
          break
        case 'completados':
          controlesParaFiltrar = controlesParaFiltrar.filter(control => 
            control.estado_flujo === 'completo'
          )
          break
      }
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
  }

  const cargarControlesAsignados = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      try {
        const response = await axios.get('http://localhost:8000/api/profesor/controles-asignados', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setControles(response.data)
        console.log('✅ Controles cargados desde el backend:', response.data.length)
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
        console.log('📊 Usando datos mock - Total controles:', mockControles.length)
      }
    } catch (error) {
      console.error('❌ Error general cargando controles:', error)
      setError('Error al cargar los controles operativos')
      
      // Fallback con al menos un control de ejemplo
      setControles([
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
      ])
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
      alert('Por favor ingrese el concepto del asesor')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      await axios.put(
        `http://localhost:8000/api/profesor/control-operativo/${selectedControl.id}/concepto`,
        { concepto_asesor: conceptoAsesor },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      alert('Concepto guardado exitosamente. El estudiante será notificado.')
      setSelectedControl(null)
      cargarControlesAsignados() // Recargar la lista
    } catch (error) {
      console.error('Error guardando concepto:', error)
      alert('Error al guardar el concepto')
    } finally {
      setSaving(false)
    }
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
                  {controles.filter(c => c.estado_flujo === 'pendiente_profesor').length}
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
                  {controles.filter(c => c.estado_flujo === 'completo' || c.estado_flujo === 'con_resultado').length}
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
                  {controles.length}
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
                    placeholder="ID, nombre, cédula, área..."
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
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
                  <option value="completados">Completados ({controles.filter(c => c.estado_flujo === 'completo').length})</option>
                </select>
              </div>

              {/* Botón Limpiar Filtros */}
              <div className="flex items-end lg:col-span-1">
                <button
                  onClick={limpiarFiltros}
                  disabled={!filtros.busqueda && !filtros.mes && !filtros.ano && filtros.estado === 'todos'}
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
                  {controlesFiltrados.map((control) => (
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Mobile - Cards */}
            <div className="lg:hidden space-y-4 p-4">
              {controlesFiltrados.map((control) => (
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

                  {/* Botón de Acción */}
                  <div className={`pt-3 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                    <button
                      onClick={() => handleVerDetalle(control)}
                      className="w-full px-4 py-2 bg-university-purple text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      {control.estado_flujo === 'pendiente_profesor' ? 'Completar' : 'Ver detalle'}
                    </button>
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
      </div>
    </div>
  )
}

export default ControlesAsignados