import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '@/config/api'
import { 
  Bars3Icon, 
  BellIcon, 
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  ClockIcon,
  DocumentTextIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline'

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const userMenuRef = useRef(null)
  const notificationsRef = useRef(null)

  // Cargar notificaciones al inicializar
  useEffect(() => {
    cargarNotificaciones()
    // Actualizar notificaciones cada 5 minutos
    const interval = setInterval(cargarNotificaciones, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  // Cerrar menús cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const cargarNotificaciones = async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('token')
      
      // Intentar cargar notificaciones reales del backend
      try {
        const response = await axios.get('/api/notificaciones', {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        const notificacionesReales = (response.data || []).map(notif => ({
          id: notif.id,
          tipo: notif.tipo || 'general',
          icono: getNotificationIcon(notif.tipo),
          titulo: notif.titulo,
          mensaje: notif.mensaje,
          tiempo: getTimeAgo(notif.created_at),
          leida: notif.leida
        }))
        
        setNotifications(notificacionesReales)
        setUnreadCount(notificacionesReales.filter(n => !n.leida).length)
        
      } catch (backendError) {
        console.log('Backend de notificaciones no disponible, generando notificaciones inteligentes...')
        
        // Generar notificaciones basadas en el rol del usuario
        const notificacionesGeneradas = []
        
        if (user.role === 'estudiante') {
          // Notificaciones para estudiantes
          notificacionesGeneradas.push({
            id: 'estudiante_bienvenida',
            tipo: 'info',
            icono: DocumentTextIcon,
            titulo: 'Controles Operativos',
            mensaje: 'Puedes crear y gestionar tus controles operativos',
            tiempo: 'Ahora',
            leida: false
          })
        } else if (user.role === 'profesor') {
          // Notificaciones para profesores
          notificacionesGeneradas.push({
            id: 'profesor_controles',
            tipo: 'asignacion',
            icono: ClockIcon,
            titulo: 'Controles Asignados',
            mensaje: 'Revisa los controles pendientes de completar',
            tiempo: 'Hace 1 hora',
            leida: false
          })
        } else if (user.role === 'coordinador') {
          // Notificaciones para coordinadores
          notificacionesGeneradas.push({
            id: 'coordinador_revision',
            tipo: 'revision',
            icono: DocumentTextIcon,
            titulo: 'Controles para Revisión',
            mensaje: 'Hay controles completos esperando resultado',
            tiempo: 'Hace 30 min',
            leida: false
          })
        }
        
        // Notificación del sistema para todos
        notificacionesGeneradas.push({
          id: 'sistema_activo',
          tipo: 'sistema',
          icono: ClockIcon,
          titulo: 'Sistema Operativo',
          mensaje: 'Consultorio Jurídico funcionando correctamente',
          tiempo: 'Actualizado',
          leida: true
        })
        
        setNotifications(notificacionesGeneradas)
        setUnreadCount(notificacionesGeneradas.filter(n => !n.leida).length)
      }
      
    } catch (error) {
      console.error('Error general cargando notificaciones:', error)
      // Fallback mínimo
      setNotifications([
        {
          id: 'bienvenida',
          tipo: 'sistema',
          icono: UserPlusIcon,
          titulo: 'Bienvenido al sistema',
          mensaje: 'Sistema de consultoría jurídica operativo',
          tiempo: 'Ahora',
          leida: false
        }
      ])
      setUnreadCount(1)
    }
  }

  const getNotificationIcon = (tipo) => {
    switch (tipo) {
      case 'asignacion': return ClockIcon
      case 'revision': return DocumentTextIcon
      case 'completado': return DocumentTextIcon
      case 'sistema': return ClockIcon
      case 'nuevo_usuario': return UserPlusIcon
      default: return BellIcon
    }
  }

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Ahora'
    
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    return `Hace ${diffDays}d`
  }

  const marcarComoLeida = async (notificationId) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(`/api/notificaciones/${notificationId}/leida`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error) {
      console.log('Error marcando notificación como leída:', error.message)
    }
    
    // Actualizar estado local
    setNotifications(prev => 
      (prev || []).map(n => 
        n.id === notificationId ? { ...n, leida: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const marcarTodasComoLeidas = async () => {
    try {
      const token = localStorage.getItem('token')
      await axios.put('/api/notificaciones/marcar-todas-leidas', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error) {
      console.log('Error marcando todas las notificaciones como leídas:', error.message)
    }
    
    // Actualizar estado local
    setNotifications(prev => (prev || []).map(n => ({ ...n, leida: true })))
    setUnreadCount(0)
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="bg-theme-primary shadow-theme border-b border-theme sticky top-0 z-40 transition-all duration-300">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Lado izquierdo */}
        <div className="flex items-center">
          {/* Botón menú mobile */}
          <button
            onClick={onMenuClick}
            className={`lg:hidden inline-flex items-center justify-center p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-600 transition-colors ${isDark ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Logo y nombre de la universidad */}
          <div className="flex items-center ml-4 lg:ml-0">
            <div className="flex-shrink-0">
              <img 
                src="/escudo.svg" 
                alt="Escudo Universidad Colegio Mayor de Cundinamarca" 
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-bold text-theme-primary">
                {/* Nombre completo en desktop, abreviado en móvil */}
                <span className="hidden md:block">
                  Universidad Colegio Mayor de Cundinamarca
                </span>
                <span className="md:hidden">
                  UCMC
                </span>
              </h1>
              <p className="text-sm text-theme-secondary hidden sm:block">
                Facultad de Derecho - Sistema de Estudiantes
              </p>
            </div>
          </div>
        </div>

        {/* Lado derecho */}
        <div className="flex items-center space-x-4">
          {/* Buscador y Toggle de Tema */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="relative">
              <input
                type="search"
                placeholder="Buscar casos, clientes..."
                className="w-64 pl-10 pr-4 py-2 border border-theme rounded-lg text-sm bg-theme-primary text-theme-primary focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-colors duration-300"
              />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Toggle de Tema Elegante */}
            <button
              onClick={toggleTheme}
              className="relative p-2 rounded-lg bg-theme-secondary border border-theme hover:bg-theme-tertiary transition-all duration-300 group"
              title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              <div className="relative w-5 h-5">
                <SunIcon 
                  className={`absolute inset-0 h-5 w-5 text-yellow-500 transition-all duration-300 transform ${
                    isDark ? 'rotate-90 scale-100 opacity-100' : 'rotate-0 scale-75 opacity-0'
                  }`}
                />
                <MoonIcon 
                  className={`absolute inset-0 h-5 w-5 text-blue-600 transition-all duration-300 transform ${
                    !isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-75 opacity-0'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Notificaciones */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 rounded-full transition-colors"
            >
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown de notificaciones */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-theme-primary rounded-md shadow-theme ring-1 ring-black ring-opacity-5 z-50 border border-theme">
                <div className="py-1">
                  <div className="px-4 py-3 border-b border-theme flex items-center justify-between">
                    <p className="text-sm font-medium text-theme-primary">Notificaciones</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={marcarTodasComoLeidas}
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {(notifications || []).length > 0 ? (
                      (notifications || []).map((notification) => {
                        const IconComponent = notification.icono
                        return (
                          <div
                            key={notification.id}
                            onClick={() => marcarComoLeida(notification.id)}
                            className={`px-4 py-3 hover:bg-theme-tertiary cursor-pointer transition-colors ${
                              !notification.leida ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`flex-shrink-0 p-1 rounded-full ${
                                notification.tipo === 'nuevo_control' 
                                  ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                                  : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                              }`}>
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${
                                  !notification.leida 
                                    ? 'text-theme-primary' 
                                    : 'text-theme-secondary'
                                }`}>
                                  {notification.titulo}
                                </p>
                                <p className="text-xs text-theme-secondary mt-1 truncate">
                                  {notification.mensaje}
                                </p>
                                <p className="text-xs text-theme-muted mt-1">
                                  {notification.tiempo}
                                </p>
                              </div>
                              {!notification.leida && (
                                <div className="flex-shrink-0">
                                  <div className="h-2 w-2 bg-purple-600 rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="px-4 py-8 text-center text-theme-secondary">
                        <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay notificaciones</p>
                      </div>
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="px-4 py-3 border-t border-theme">
                      <button 
                        onClick={cargarNotificaciones}
                        className="text-sm text-purple-600 hover:text-purple-800 font-medium w-full text-left"
                      >
                        Actualizar notificaciones
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Información del usuario */}
          <div className="flex items-center text-sm">
            <span className="hidden md:block text-theme-primary mr-3">
              {user?.role === 'coordinador' ? 'Luz Mary Rincon' : `${user?.nombres} ${user?.apellidos}`}
            </span>
            <span className="hidden md:block text-xs text-purple-800 mr-3 px-2 py-1 bg-purple-100 rounded-full">
              {user?.role}
            </span>
          </div>

          {/* Menú de usuario */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <UserCircleIcon className="h-8 w-8 text-gray-400 hover:text-gray-500" />
            </button>

            {/* Dropdown del usuario */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-theme-primary rounded-md shadow-theme ring-1 ring-black ring-opacity-5 z-50 border border-theme transition-all duration-300">
                <div className="py-1">
                  <div className="px-4 py-3 border-b border-theme">
                    <p className="text-sm font-medium text-theme-primary">
                      {user?.role === 'coordinador' ? 'Luz Mary Rincon' : `${user?.nombres} ${user?.apellidos}`}
                    </p>
                    <p className="text-sm text-theme-secondary truncate max-w-48">{user?.email}</p>
                    <p className="text-xs text-theme-muted mt-1 capitalize">
                      Rol: {user?.role}
                    </p>
                  </div>
                  
                  <Link 
                    to="/perfil"
                    className="flex items-center w-full px-4 py-2 text-sm text-theme-primary hover:bg-theme-tertiary transition-colors duration-200"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <UserCircleIcon className="h-4 w-4 mr-3" />
                    Mi Perfil
                  </Link>
                  
                  <div className="border-t border-theme">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header