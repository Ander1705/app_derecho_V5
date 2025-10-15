import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'

// Importaciones críticas - cargar inmediatamente
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Lazy loading para evitar errores de inicialización
const Login = lazy(() => import('./pages/auth/Login'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ValidacionEstudiante = lazy(() => import('./pages/auth/ValidacionEstudiante'))
const RegistroEstudiante = lazy(() => import('./pages/auth/RegistroEstudiante'))
const RegistroProfesor = lazy(() => import('./pages/auth/RegistroProfesor'))
const VerificarEmail = lazy(() => import('./pages/auth/VerificarEmail'))
const RegisterSelector = lazy(() => import('./components/auth/RegisterSelector'))

// Dashboards
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DashboardCoordinador = lazy(() => import('./pages/DashboardCoordinador'))
const DashboardEstudiante = lazy(() => import('./pages/estudiante/DashboardEstudiante'))
const DashboardProfesor = lazy(() => import('./pages/profesor/DashboardProfesor'))

// Páginas de coordinador
const ClientsPage = lazy(() => import('./pages/clients/ClientsPage'))
const FormsPage = lazy(() => import('./pages/forms/FormsPage'))
const GestionUsuarios = lazy(() => import('./pages/coordinador/GestionUsuarios'))
const ControlOperativoCoordinador = lazy(() => import('./pages/coordinador/ControlOperativoCoordinador'))
const Estadisticas = lazy(() => import('./pages/coordinador/Estadisticas'))
const CalificacionesCoordinador = lazy(() => import('./pages/coordinador/CalificacionesCoordinador'))

// Páginas de profesor
const ControlesAsignados = lazy(() => import('./pages/profesor/ControlesAsignados'))
const MisEstudiantes = lazy(() => import('./pages/profesor/MisEstudiantes'))
const Calificaciones = lazy(() => import('./pages/profesor/Calificaciones'))

// Páginas de estudiante
const MisControles = lazy(() => import('./pages/estudiante/MisControles'))
const MisCalificaciones = lazy(() => import('./pages/estudiante/MisCalificaciones'))
const PerfilEstudiante = lazy(() => import('./pages/estudiante/PerfilEstudiante'))

// Páginas compartidas
const Perfil = lazy(() => import('./pages/Perfil'))
const CalificacionesIntro = lazy(() => import('./pages/CalificacionesIntro'))

// Componente de carga
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Cargando...</p>
    </div>
  </div>
)

// Componente para mostrar el dashboard correcto según el rol
const DashboardRedirect = () => {
  const { user, loading } = useAuth()
  
  // Esperar a que termine la carga antes de redirigir
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  if (user?.role === 'estudiante') {
    return <DashboardEstudiante />
  }
  
  if (user?.role === 'profesor') {
    return <DashboardProfesor />
  }
  
  if (user?.role === 'coordinador') {
    return <DashboardCoordinador />
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
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Rutas públicas de autenticación */}
              <Route path="/login" element={<Login />} />
              <Route path="/auth" element={<Login />} />
              <Route path="/recuperar-contraseña" element={<ForgotPassword />} />
              <Route path="/registro" element={<RegisterSelector />} />
              <Route path="/registro-estudiante" element={<RegistroEstudiante />} />
              <Route path="/registro-profesor" element={<RegistroProfesor />} />
              <Route path="/verificar-email" element={<VerificarEmail />} />
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
              <Route path="estadisticas" element={<Estadisticas />} />
              <Route path="calificaciones-coordinador" element={<CalificacionesCoordinador />} />
              
              {/* Rutas compartidas */}
              <Route path="perfil" element={<Perfil />} />
              <Route path="calificaciones-intro" element={<CalificacionesIntro />} />
              
              {/* Rutas de estudiante */}
              <Route path="perfil-estudiante" element={<PerfilEstudiante />} />
              <Route path="estudiante/control-operativo" element={<MisControles />} />
              <Route path="mis-controles" element={<MisControles />} />
              <Route path="mis-calificaciones" element={<MisCalificaciones />} />
              <Route path="estudiante/mis-reportes" element={<div className="p-6"><h1 className="text-2xl font-bold">Mis Reportes - En desarrollo</h1></div>} />
              <Route path="mis-casos" element={<div className="p-6"><h1 className="text-2xl font-bold">Mis Casos - En desarrollo</h1></div>} />
              <Route path="control-operativo-estudiante" element={<MisControles />} />
              <Route path="consultas" element={<div className="p-6"><h1 className="text-2xl font-bold">Consultas Jurídicas - En desarrollo</h1></div>} />
              <Route path="documentos-estudiante" element={<div className="p-6"><h1 className="text-2xl font-bold">Mis Documentos - En desarrollo</h1></div>} />
              <Route path="guias" element={<div className="p-6"><h1 className="text-2xl font-bold">Guías de Ayuda - En desarrollo</h1></div>} />
              <Route path="soporte" element={<div className="p-6"><h1 className="text-2xl font-bold">Soporte - En desarrollo</h1></div>} />
              
              {/* Rutas de profesor */}
              <Route path="controles-asignados" element={<ControlesAsignados />} />
              <Route path="completar-secciones" element={<ControlesAsignados />} />
              <Route path="mis-estudiantes" element={<MisEstudiantes />} />
              <Route path="calificaciones" element={<Calificaciones />} />
              <Route path="historial-profesor" element={<div className="p-6"><h1 className="text-2xl font-bold">Historial Profesor - En desarrollo</h1></div>} />
              <Route path="estudiantes-profesor" element={<MisEstudiantes />} />
              <Route path="actividad-profesor" element={<div className="p-6"><h1 className="text-2xl font-bold">Actividad del Profesor - En desarrollo</h1></div>} />
            </Route>
            
              {/* Redirección por defecto */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
