import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import DashboardCoordinador from './DashboardCoordinador'
import DashboardEstudiante from './DashboardEstudiante'

const Dashboard = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()

  // Renderizar dashboard específico según el rol
  if (user?.role === 'coordinador') {
    return <DashboardCoordinador />
  }
  
  if (user?.role === 'estudiante') {
    return <DashboardEstudiante />
  }

  // Fallback para roles no definidos
  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
      <div className="text-center">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>
          Bienvenido al Sistema
        </h1>
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Tu rol no está definido. Contacta al administrador.
        </p>
      </div>
    </div>
  )
}

export default Dashboard