import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { 
  HomeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  ScaleIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  ArrowRightOnRectangleIcon,
  StarIcon,
  ChartBarIcon,
  TrophyIcon,
  UserIcon
} from '@heroicons/react/24/outline'

// Navegación específica por rol
const getNavigationByRole = (role) => {
  if (role === 'coordinador') {
    return [
      { 
        name: 'Dashboard', 
        shortName: 'Inicio',
        href: '/dashboard', 
        icon: HomeIcon 
      },
      { 
        name: 'Gestión de Usuarios', 
        shortName: 'Usuarios',
        href: '/gestion-usuarios', 
        icon: UserGroupIcon 
      },
      { 
        name: 'Control Operativo', 
        shortName: 'Controles',
        href: '/control-operativo', 
        icon: ClipboardDocumentListIcon 
      },
      { 
        name: 'Estadísticas', 
        shortName: 'Estadísticas',
        href: '/estadisticas', 
        icon: ChartBarIcon 
      },
      { 
        name: 'Calificaciones', 
        shortName: 'Calificaciones',
        href: '/calificaciones-coordinador', 
        icon: TrophyIcon 
      },
    ]
  } else if (role === 'estudiante') {
    return [
      { 
        name: 'Mi Dashboard', 
        shortName: 'Inicio',
        href: '/dashboard', 
        icon: HomeIcon 
      },
      { 
        name: 'Mis Controles', 
        shortName: 'Controles',
        href: '/mis-controles', 
        icon: ClipboardDocumentListIcon 
      },
      { 
        name: 'Mis Calificaciones', 
        shortName: 'Calificaciones',
        href: '/mis-calificaciones', 
        icon: TrophyIcon 
      },
      { 
        name: 'Mi Perfil', 
        shortName: 'Perfil',
        href: '/perfil-estudiante', 
        icon: AcademicCapIcon 
      },
    ]
  } else if (role === 'profesor') {
    return [
      { 
        name: 'Dashboard Profesor', 
        shortName: 'Inicio',
        href: '/dashboard', 
        icon: HomeIcon 
      },
      { 
        name: 'Controles Asignados', 
        shortName: 'Asignados',
        href: '/controles-asignados', 
        icon: ClipboardDocumentListIcon 
      },
      { 
        name: 'Mis Estudiantes', 
        shortName: 'Estudiantes',
        href: '/mis-estudiantes', 
        icon: UserGroupIcon 
      },
      { 
        name: 'Calificar', 
        shortName: 'Calificar',
        href: '/calificaciones', 
        icon: StarIcon 
      },
      { 
        name: 'Mi Perfil', 
        shortName: 'Perfil',
        href: '/perfil', 
        icon: AcademicCapIcon 
      },
    ]
  } else {
    // Rol por defecto
    return [
      { 
        name: 'Dashboard', 
        shortName: 'Inicio',
        href: '/dashboard', 
        icon: HomeIcon 
      },
    ]
  }
}

const Sidebar = ({ onClose }) => {
  const { user, logout } = useAuth()
  const { isDark } = useTheme()
  const navigation = getNavigationByRole(user?.role)

  const handleLogout = () => {
    logout()
  }

  return (
    <div className={`flex flex-col h-full transition-all duration-300 ${
      isDark 
        ? 'bg-theme-primary border-r border-theme' 
        : 'bg-gradient-to-b from-purple-800 to-purple-900 text-white'
    }`}>
      {/* Botón cerrar para mobile */}
      {onClose && (
        <div className="flex justify-end p-4 lg:hidden">
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isDark
                ? 'text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary'
                : 'text-purple-200 hover:text-white hover:bg-purple-700'
            }`}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Información del usuario */}
      <div className={`px-4 lg:px-6 py-3 lg:py-4 ${
        isDark 
          ? 'border-b border-theme bg-theme-tertiary' 
          : 'border-b border-purple-700 bg-purple-800 bg-opacity-50'
      }`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-university-gold flex items-center justify-center">
              <span className="text-xs lg:text-sm font-medium text-white">
                {user?.role === 'coordinador' ? 'LR' : `${user?.nombres?.split(' ')[0]?.charAt(0) || user?.nombre?.charAt(0)}${user?.apellidos?.split(' ')[0]?.charAt(0)}`}
              </span>
            </div>
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <p className={`text-xs lg:text-sm font-medium truncate ${
              isDark ? 'text-theme-primary' : 'text-white'
            }`}>
              {/* Mostrar solo primer nombre en móvil, primer nombre y primer apellido en desktop */}
              <span className="lg:hidden">
                {user?.role === 'coordinador' ? 'Luz Mary' : (user?.nombres?.split(' ')[0] || user?.nombre)}
              </span>
              <span className="hidden lg:inline">
                {user?.role === 'coordinador' ? 'Luz Mary Rincon' : `${user?.nombres?.split(' ')[0] || user?.nombre} ${user?.apellidos?.split(' ')[0]}`}
              </span>
            </p>
            <p className={`text-xs capitalize ${
              isDark ? 'text-theme-secondary' : 'text-purple-200'
            }`}>
              {user?.role}
            </p>
          </div>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-university-gold text-white shadow-lg'
                  : isDark
                    ? 'text-theme-secondary hover:bg-theme-tertiary hover:text-theme-primary'
                    : 'text-purple-100 hover:bg-purple-700 hover:text-white'
              }`
            }
          >
            <item.icon
              className="flex-shrink-0 h-5 w-5 mr-3"
              aria-hidden="true"
            />
            {/* Nombres responsivos para mejor uso del espacio */}
            <span className="hidden lg:inline">
              {item.name}
            </span>
            <span className="lg:hidden">
              {item.shortName || item.name}
            </span>
          </NavLink>
        ))}
        
        {/* Sección para Nuevas Funciones */}
        {(user?.role === 'profesor' || user?.role === 'coordinador' || user?.role === 'estudiante') && (
          <>
            <div className={`px-3 py-2 mt-4 mb-2 ${isDark ? 'text-theme-muted' : 'text-purple-300'}`}>
              <span className="text-xs font-semibold uppercase tracking-wider flex items-center">
                <StarIcon className="h-4 w-4 mr-2" />
                Nuevas Funciones
              </span>
            </div>
            
            {/* Enlace a la página de introducción */}
            <NavLink
              to="/calificaciones-intro"
              className={({ isActive }) =>
                `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 mb-3 ${
                  isActive
                    ? 'bg-university-gold text-white shadow-lg'
                    : isDark
                      ? 'text-theme-secondary hover:bg-theme-tertiary hover:text-theme-primary'
                      : 'text-purple-100 hover:bg-purple-700 hover:text-white'
                }`
              }
            >
              <TrophyIcon className="flex-shrink-0 h-5 w-5 mr-3" />
              <span className="flex-1">Información</span>
            </NavLink>
            
            <div className={`px-3 py-2 rounded-lg ${isDark ? 'bg-theme-tertiary' : 'bg-purple-800 bg-opacity-50'}`}>
              <p className={`text-xs text-center ${isDark ? 'text-theme-secondary' : 'text-purple-200'}`}>
                Más adelante se darán a conocer las nuevas funciones
              </p>
            </div>
          </>
        )}
      </nav>

      {/* Cerrar Sesión */}
      <div className="px-4 py-2">
        <button
          onClick={handleLogout}
          className={`group flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-red-600 hover:text-white ${
            isDark ? 'text-theme-secondary' : 'text-purple-100'
          }`}
        >
          <ArrowRightOnRectangleIcon
            className="flex-shrink-0 h-5 w-5 mr-3"
            aria-hidden="true"
          />
          Cerrar Sesión
        </button>
      </div>

      {/* Sección inferior optimizada para móviles */}
      <div className={`px-4 lg:px-6 py-3 lg:py-4 ${
        isDark ? 'border-t border-theme' : 'border-t border-purple-700'
      }`}>
        <div className={`rounded-lg p-2 lg:p-3 ${
          isDark ? 'bg-theme-tertiary' : 'bg-purple-800 bg-opacity-50'
        }`}>
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-4 w-4 lg:h-5 lg:w-5 text-university-gold flex-shrink-0" />
            <div className="ml-2 min-w-0 flex-1">
              <p className={`text-xs font-medium ${
                isDark ? 'text-theme-primary' : 'text-white'
              }`}>
                {/* Texto adaptativo */}
                <span className="lg:hidden">UCMC</span>
                <span className="hidden lg:inline">Universidad</span>
              </p>
              <p className={`text-xs ${
                isDark ? 'text-theme-secondary' : 'text-purple-200'
              }`}>
                <span className="lg:hidden">Derecho</span>
                <span className="hidden lg:inline">Facultad de Derecho</span>
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-2 lg:mt-3 text-center">
          <p className={`text-xs ${
            isDark ? 'text-theme-muted' : 'text-purple-300'
          }`}>
            <span className="lg:hidden">v2.0</span>
            <span className="hidden lg:inline">Sistema de Estudiantes v2.0</span>
          </p>
          <p className={`text-xs ${
            isDark ? 'text-theme-muted' : 'text-purple-400'
          }`}>
            © 2025 UCMC Derecho
          </p>
        </div>
      </div>
    </div>
  )
}

export default Sidebar