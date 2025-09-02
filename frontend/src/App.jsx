import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ValidacionEstudiante from './pages/auth/ValidacionEstudiante'
import Dashboard from './pages/Dashboard'
import DashboardEstudiante from './pages/estudiante/DashboardEstudiante'
import ClientsPage from './pages/clients/ClientsPage'
import FormsPage from './pages/forms/FormsPage'
import GestionEstudiantes from './pages/coordinador/GestionEstudiantes'
import ControlOperativo from './pages/coordinador/ControlOperativo'
import ControlOperativoEstudiante from './pages/estudiante/ControlOperativo'
import Perfil from './pages/Perfil'
import PerfilEstudiante from './pages/estudiante/PerfilEstudiante'
import SolicitudesConciliacion from './pages/coordinador/SolicitudesConciliacion'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Componente para mostrar el dashboard correcto según el rol
const DashboardRedirect = () => {
  const { user } = useAuth()
  
  if (user?.role === 'estudiante') {
    return <DashboardEstudiante />
  }
  
  return <Dashboard />
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router 
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
        <div className="min-h-screen bg-slate-50">
          <Routes>
            {/* Rutas públicas de autenticación */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth" element={<Login />} />
            <Route path="/recuperar-contraseña" element={<ForgotPassword />} />
            <Route path="/validacion-estudiante" element={<ValidacionEstudiante />} />
            <Route path="/registro-estudiante" element={<ValidacionEstudiante />} />
            
            {/* Rutas protegidas con layout para coordinadores y estudiantes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardRedirect />} />
              
              {/* Rutas de coordinador */}
              <Route path="clients/*" element={<ClientsPage />} />
              <Route path="forms/*" element={<FormsPage />} />
              <Route path="gestion-estudiantes" element={<GestionEstudiantes />} />
              <Route path="control-operativo" element={<ControlOperativo />} />
              <Route path="solicitudes-conciliacion" element={<SolicitudesConciliacion />} />
              
              {/* Rutas compartidas */}
              <Route path="perfil" element={<Perfil />} />
              
              {/* Rutas de estudiante */}
              <Route path="perfil-estudiante" element={<PerfilEstudiante />} />
              <Route path="estudiante/control-operativo" element={<ControlOperativoEstudiante />} />
              <Route path="estudiante/mis-reportes" element={<div className="p-6"><h1 className="text-2xl font-bold">Mis Reportes - En desarrollo</h1></div>} />
              <Route path="mis-casos" element={<div className="p-6"><h1 className="text-2xl font-bold">Mis Casos - En desarrollo</h1></div>} />
              <Route path="control-operativo-estudiante" element={<ControlOperativoEstudiante />} />
              <Route path="consultas" element={<div className="p-6"><h1 className="text-2xl font-bold">Consultas Jurídicas - En desarrollo</h1></div>} />
              <Route path="documentos-estudiante" element={<div className="p-6"><h1 className="text-2xl font-bold">Mis Documentos - En desarrollo</h1></div>} />
              <Route path="guias" element={<div className="p-6"><h1 className="text-2xl font-bold">Guías de Ayuda - En desarrollo</h1></div>} />
              <Route path="soporte" element={<div className="p-6"><h1 className="text-2xl font-bold">Soporte - En desarrollo</h1></div>} />
            </Route>
            
            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
