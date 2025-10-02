import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

const DashboardEstudianteSimple = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  
  console.log('🔍 Dashboard Estudiante - Renderizando...')
  console.log('📋 User:', user)
  console.log('🌓 IsDark:', isDark)

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-8`}>
      <div className="text-center">
        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Dashboard del Estudiante - PRUEBA
        </h1>
        <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          Usuario: {user?.nombres} {user?.apellidos}
        </p>
        <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Email: {user?.email}
        </p>
        <div className={`mt-8 p-4 rounded ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}>
          ✅ El componente está funcionando correctamente
        </div>
      </div>
    </div>
  )
}

export default DashboardEstudianteSimple