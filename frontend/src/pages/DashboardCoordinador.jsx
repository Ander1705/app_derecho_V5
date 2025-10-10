import React, { useState, useEffect } from 'react'
import axios from 'axios'

const DashboardCoordinador = () => {
    const [estadisticas, setEstadisticas] = useState({
        estudiantes: 0,
        profesores: 0,
        pendientes: 0,
        total: 0
    })
    const [controles, setControles] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('auth_token')
               
                const [statsRes, controlesRes] = await Promise.all([
                    axios.get('/api/coordinador/estadisticas', {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get('/api/coordinador/controles-completos', {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ])
               
                setEstadisticas({
                    estudiantes: statsRes.data.estudiantes_registrados || 0,
                    profesores: statsRes.data.profesores_registrados || 0,
                    pendientes: statsRes.data.controles_pendientes || 0,
                    total: statsRes.data.total_controles || 0
                })
               
                setControles(controlesRes.data || [])
            } catch (error) {
                console.error('Error cargando datos:', error)
            } finally {
                setLoading(false)
            }
        }
       
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Dashboard Coordinador</h1>
           
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm">Estudiantes</h3>
                    <p className="text-3xl font-bold">{estadisticas.estudiantes}</p>
                </div>
               
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm">Profesores</h3>
                    <p className="text-3xl font-bold">{estadisticas.profesores}</p>
                </div>
               
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm">Pendientes</h3>
                    <p className="text-3xl font-bold">{estadisticas.pendientes}</p>
                </div>
               
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm">Total Controles</h3>
                    <p className="text-3xl font-bold">{estadisticas.total}</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Controles Recientes</h2>
                <div className="space-y-2">
                    {controles.length === 0 ? (
                        <p className="text-gray-500">No hay controles</p>
                    ) : (
                        controles.slice(0, 10).map(control => (
                            <div key={control.id} className="border-b pb-2">
                                <p className="font-medium">{control.created_by?.nombre_usuario}</p>
                                <p className="text-sm text-gray-500">{control.estado_flujo}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

export default DashboardCoordinador