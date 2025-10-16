const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔐 Probando login...');
    
    // Probar con diferentes usuarios
    const usuarios = [
      { email: 'estudiante@universidadmayor.edu.co', password: '123456', rol: 'estudiante' },
      { email: 'profesor@universidadmayor.edu.co', password: '123456', rol: 'profesor' },
      { email: 'coordinador@universidadmayor.edu.co', password: '123456', rol: 'coordinador' }
    ];
    
    for (const usuario of usuarios) {
      console.log(`\n🧪 Probando ${usuario.rol}: ${usuario.email}`);
      
      try {
        const response = await axios.post('http://localhost:8000/api/auth/login', {
          email: usuario.email,
          password: usuario.password
        });
        
        console.log(`✅ ${usuario.rol} - LOGIN EXITOSO`);
        console.log(`   Token: ${response.data.access_token?.substring(0, 20)}...`);
        console.log(`   Usuario: ${response.data.user?.nombres || response.data.user?.nombre_usuario}`);
        console.log(`   Rol: ${response.data.user?.role}`);
        
        // Probar un endpoint protegido
        const token = response.data.access_token;
        if (usuario.rol === 'estudiante') {
          try {
            const controlesResponse = await axios.get('http://localhost:8000/api/control-operativo/list', {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`   Estructura de respuesta:`, typeof controlesResponse.data);
            console.log(`   Controles del estudiante: ${Array.isArray(controlesResponse.data) ? controlesResponse.data.length : JSON.stringify(controlesResponse.data)}`);
          } catch (error) {
            console.log(`   Error en endpoint estudiante: ${error.response?.data?.error || error.message}`);
          }
        } else if (usuario.rol === 'profesor') {
          const controlesResponse = await axios.get('http://localhost:8000/api/profesor/controles-asignados', {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`   Controles asignados: ${controlesResponse.data.length}`);
        } else if (usuario.rol === 'coordinador') {
          const estadisticasResponse = await axios.get('http://localhost:8000/api/coordinador/estadisticas', {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`   Estadísticas disponibles: ${Object.keys(estadisticasResponse.data).length} métricas`);
        }
        
      } catch (error) {
        console.log(`❌ ${usuario.rol} - FALLO`);
        console.log(`   Error: ${error.response?.data?.error || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error general:', error.message);
  }
}

testLogin();