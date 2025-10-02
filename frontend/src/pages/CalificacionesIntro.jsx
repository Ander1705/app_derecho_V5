import { useTheme } from '../contexts/ThemeContext'
import { Link } from 'react-router-dom'
import {
  InformationCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

const CalificacionesIntro = () => {
  const { isDark } = useTheme()

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border p-8`}>
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full">
                <InformationCircleIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>
              Nuevas Funciones
            </h1>
            <p className={`text-xl ${isDark ? 'text-gray-300' : 'text-gray-600'} leading-relaxed max-w-2xl mx-auto`}>
              Más adelante se darán a conocer las nuevas funciones
            </p>
          </div>
        </div>

        {/* Return to Dashboard */}
        <div className="text-center mt-8">
          <Link
            to="/dashboard"
            className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
              isDark 
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CalificacionesIntro