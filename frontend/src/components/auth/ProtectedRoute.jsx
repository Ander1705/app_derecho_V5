import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-university-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Verificar rol específico si es requerido
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 p-8 rounded-lg">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Acceso Denegado
            </h2>
            <p className="text-red-600">
              No tienes permisos para acceder a esta sección.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute