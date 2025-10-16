# 🚀 INSTRUCCIONES PARA DESPLIEGUE EN PRODUCCIÓN

## 📋 DIAGNÓSTICO COMPLETADO

Basado en el diagnóstico ejecutado:
- ✅ Dominio servicioucmc.online responde correctamente
- ✅ Servidor web principal funcionando (status 200)
- ✅ SSL certificado válido hasta Dec 31 2025
- ⚠️ API endpoints responden pero con errores de configuración
- ❌ CORS no configurado correctamente

## 🔧 CAMBIOS REALIZADOS EN EL CÓDIGO

### 1. Frontend - Configuración de Producción

**Archivo: `frontend/.env`**
```env
VITE_API_URL=https://servicioucmc.online/api
VITE_APP_TITLE=Consultorio Jurídico UNICOLMAYOR
VITE_APP_VERSION=3.0.0
```

**Archivo: `frontend/src/config/api.js`**
- ✅ Configurado axios con interceptores
- ✅ Timeout de 15 segundos
- ✅ Manejo automático de tokens
- ✅ Redirecto automático en 401

### 2. Backend - Configuración CORS

**Archivo: `go-backend/internal/middleware/cors.go`**
- ✅ CORS específico para producción
- ✅ Dominios permitidos: servicioucmc.online
- ✅ Headers correctos para API
- ✅ Cache de preflight 12 horas

## 🎯 PASOS PARA APLICAR EN EL SERVIDOR

### Paso 1: Actualizar el código en el servidor
```bash
# En el servidor de producción
cd /ruta/del/proyecto
git pull origin main
```

### Paso 2: Rebuild y redeploy con Docker
```bash
# Detener contenedores actuales
docker-compose down

# Rebuild frontend con nueva configuración .env
docker-compose build frontend

# Rebuild backend con nuevos CORS
docker-compose build backend

# Reiniciar todo el stack
docker-compose up -d

# Verificar logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Paso 3: Verificar conectividad
```bash
# Ejecutar diagnóstico actualizado
./diagnostico_produccion.sh

# Probar endpoints específicos
curl -X OPTIONS -H "Origin: https://servicioucmc.online" https://servicioucmc.online/api/auth/login
curl https://servicioucmc.online/api/health
```

## 🐛 PROBLEMAS ESPECÍFICOS IDENTIFICADOS

### 1. Dashboard Profesor No Muestra Datos
**Causa:** Endpoint `/api/profesor/controles-asignados` devuelve 401
**Solución:** 
- Verificar que el backend esté ejecutándose correctamente
- Confirmar que la autenticación JWT funciona
- Verificar logs del backend para errores de DB

### 2. Mixing de Sesiones Entre Roles
**Estado:** ✅ YA CORREGIDO en AuthContext.jsx
- Limpieza agresiva de localStorage en logout
- Verificación de consistencia de roles

### 3. Errores JavaScript "lexical declaration"
**Estado:** ✅ YA CORREGIDO en vite.config.js
- Configuración manualChunks apropiada
- Separación de vendors

## 🔍 VERIFICACIONES POST-DESPLIEGUE

### Test 1: Login funcional
```bash
curl -X POST https://servicioucmc.online/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"coordinador@universidadmayor.edu.co","password":"123456"}'
```

### Test 2: Endpoint protegido
```bash
# Con token obtenido del login
curl -X GET https://servicioucmc.online/api/profesor/controles-asignados \
  -H "Authorization: Bearer TOKEN_AQUI"
```

### Test 3: CORS funcional
```bash
curl -X OPTIONS -H "Origin: https://servicioucmc.online" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  https://servicioucmc.online/api/auth/login
```

## 🔧 SI PERSISTEN PROBLEMAS

### Backend no responde:
```bash
# Verificar que el contenedor backend está ejecutándose
docker ps | grep backend

# Ver logs del backend
docker logs backend_container_name

# Verificar conexión a PostgreSQL
docker exec -it backend_container_name bash
# Dentro del contenedor, probar conexión DB
```

### Frontend no conecta:
```bash
# Verificar build del frontend
docker logs frontend_container_name

# Verificar que nginx esté sirviendo correctamente
curl -I https://servicioucmc.online/
```

### Base de datos:
```bash
# Verificar contenedor PostgreSQL
docker ps | grep postgres

# Conectar a la DB y verificar datos
docker exec -it postgres_container bash
psql -U app_derecho_user -d app_derecho_db
\dt  # listar tablas
SELECT COUNT(*) FROM users;
```

## 📞 PUNTOS DE VERIFICACIÓN CRÍTICOS

1. **✅ Archivo .env** → VITE_API_URL apunta a producción
2. **🔄 CORS Backend** → Debe rebuildearse y desplegarse
3. **🔄 Docker Rebuild** → Frontend y backend necesitan rebuild
4. **🔍 Logs Backend** → Verificar errores de conexión DB
5. **🔐 Autenticación** → Probar login con credenciales correctas

## 🎯 RESULTADO ESPERADO

Después de aplicar estos cambios:
- ✅ Login funcionará correctamente
- ✅ Dashboard profesor mostrará datos reales
- ✅ No habrá mixing entre sesiones de roles
- ✅ JavaScript cargará sin errores "lexical declaration"
- ✅ CORS permitirá las requests del frontend

**Password para testing:** 123456 (coordinador@universidadmayor.edu.co)