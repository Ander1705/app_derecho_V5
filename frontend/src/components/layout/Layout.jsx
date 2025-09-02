import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import Sidebar from './Sidebar'
import Header from './Header'

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isDark } = useTheme()

  return (
    <div className={`h-screen flex flex-col ${
      isDark ? 'bg-theme-secondary' : 'bg-slate-50'
    }`}>
      {/* Header fijo en la parte superior */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header onMenuClick={() => setSidebarOpen(true)} />
      </div>

      {/* Contenedor principal con padding-top para el header fijo */}
      <div className="flex-1 flex pt-16">
        {/* Sidebar para mobile */}
        <div className={`fixed inset-y-16 left-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
          <div 
            className="fixed inset-0 bg-black bg-opacity-25"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className={`relative flex flex-col w-64 max-w-xs h-full shadow-xl ${
            isDark ? 'bg-theme-primary' : 'bg-white'
          }`}>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>

        {/* Sidebar para desktop - fijo y sticky */}
        <div className="hidden lg:flex lg:flex-shrink-0 lg:w-100">
          <div className={`fixed left-0 top-16 bottom-0 w-64 flex flex-col z-30 ${
            isDark ? 'bg-theme-primary border-r border-theme' : 'bg-white border-r border-gray-200'
          }`}>
            <Sidebar />
          </div>
        </div>

        {/* Contenido principal con margen izquierdo para el sidebar fijo */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">          
          <main className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default Layout