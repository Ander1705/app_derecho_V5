import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ValidacionEstudiante from './pages/auth/ValidacionEstudiante'
import RegistroEstudiante from './pages/auth/RegistroEstudiante'
import RegistroProfesor from './pages/auth/RegistroProfesor'
import RegisterSelector from './components/auth/RegisterSelector'
import Dashboard from './pages/Dashboard'
import DashboardEstudiante from './pages/estudiante/DashboardEstudiante'
import DashboardProfesor from './pages/profesor/DashboardProfesor'
import ControlesAsignados from './pages/profesor/ControlesAsignados'
import ClientsPage from './pages/clients/ClientsPage'
import FormsPage from './pages/forms/FormsPage'
import GestionUsuarios from './pages/coordinador/GestionUsuarios'
import ControlOperativo from './pages/coordinador/ControlOperativo'
import ControlOperativoCoordinador from './pages/coordinador/ControlOperativoCoordinador'
import ControlOperativoEstudiante from './pages/estudiante/ControlOperativo'
import MisControles from './pages/estudiante/MisControles'
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
  
  if (user?.role === 'profesor') {
    return <DashboardProfesor />
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
            <Route path="/registro" element={<RegisterSelector />} />
            <Route path="/registro-estudiante" element={<RegistroEstudiante />} />
            <Route path="/registro-profesor" element={<RegistroProfesor />} />
            <Route path="/validacion-estudiante" element={<ValidacionEstudiante />} />
            
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
              <Route path="gestion-usuarios" element={<GestionUsuarios />} />
              <Route path="control-operativo" element={<ControlOperativoCoordinador />} />
              <Route path="solicitudes-conciliacion" element={<SolicitudesConciliacion />} />
              
              {/* Rutas compartidas */}
              <Route path="perfil" element={<Perfil />} />
              
              {/* Rutas de estudiante */}
              <Route path="perfil-estudiante" element={<PerfilEstudiante />} />
              <Route path="estudiante/control-operativo" element={<ControlOperativoEstudiante />} />
              <Route path="mis-controles" element={<MisControles />} />
              <Route path="estudiante/mis-reportes" element={<div className="p-6"><h1 className="text-2xl font-bold">Mis Reportes - En desarrollo</h1></div>} />
              <Route path="mis-casos" element={<div className="p-6"><h1 className="text-2xl font-bold">Mis Casos - En desarrollo</h1></div>} />
              <Route path="control-operativo-estudiante" element={<ControlOperativoEstudiante />} />
              <Route path="consultas" element={<div className="p-6"><h1 className="text-2xl font-bold">Consultas Jurídicas - En desarrollo</h1></div>} />
              <Route path="documentos-estudiante" element={<div className="p-6"><h1 className="text-2xl font-bold">Mis Documentos - En desarrollo</h1></div>} />
              <Route path="guias" element={<div className="p-6"><h1 className="text-2xl font-bold">Guías de Ayuda - En desarrollo</h1></div>} />
              <Route path="soporte" element={<div className="p-6"><h1 className="text-2xl font-bold">Soporte - En desarrollo</h1></div>} />
              
              {/* Rutas de profesor */}
              <Route path="controles-asignados" element={<ControlesAsignados />} />
              <Route path="completar-secciones" element={<ControlesAsignados />} />
              <Route path="historial-profesor" element={<div className="p-6"><h1 className="text-2xl font-bold">Historial Profesor - En desarrollo</h1></div>} />
              <Route path="estudiantes-profesor" element={<div className="p-6"><h1 className="text-2xl font-bold">Estudiantes del Profesor - En desarrollo</h1></div>} />
              <Route path="actividad-profesor" element={<div className="p-6"><h1 className="text-2xl font-bold">Actividad del Profesor - En desarrollo</h1></div>} />
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
