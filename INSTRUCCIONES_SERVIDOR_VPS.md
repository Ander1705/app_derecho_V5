# 🚀 INSTRUCCIONES PARA VPS PRODUCCIÓN - servicioucmc.online

## 🎯 OBJETIVO
Solucionar los errores de producción en el VPS y restablecer el funcionamiento completo del sistema.

## 📋 DIAGNÓSTICO ACTUAL
- ✅ Identificados errores de build en frontend (minificación)
- ✅ Configuración Docker optimizada para VPS
- ✅ Scripts de corrección automática creados
- 🔧 Pendiente: Ejecutar rebuild completo en servidor

---

## 🛠️ PASOS PARA EJECUTAR EN EL SERVIDOR

### 1. ACCESO AL SERVIDOR
```bash
# Conectar por SSH al VPS
ssh root@servicioucmc.online
# o el usuario configurado para el servidor
```

### 2. NAVEGAR AL DIRECTORIO DEL PROYECTO
```bash
cd /ruta/al/proyecto/app_derecho_V3-main
# Verificar que estemos en el directorio correcto
pwd
ls -la
```

### 3. BACKUP DE SEGURIDAD (OPCIONAL)
```bash
# Hacer backup de la base de datos actual
docker exec consultorio-postgres pg_dump -U app_derecho_user app_derecho_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup del volumen de uploads
docker cp consultorio-backend:/root/storage/uploads ./backup_uploads_$(date +%Y%m%d_%H%M%S)
```

### 4. EJECUTAR REBUILD SIMPLE
```bash
# Dar permisos de ejecución
chmod +x rebuild_simple.sh

# Ejecutar rebuild automático
./rebuild_simple.sh
```

### 5. MONITOREO DEL PROCESO
```bash
# Ver logs en tiempo real durante el rebuild
docker-compose -f docker-compose.simple.yml logs -f

# En otra terminal SSH, verificar estado
docker-compose -f docker-compose.simple.yml ps
```

---

## 🔍 VERIFICACIÓN DE FUNCIONAMIENTO

### A. Verificar Servicios
```bash
# Estado de contenedores
docker-compose -f docker-compose.simple.yml ps

# Health checks
curl http://localhost:8000/health
curl http://localhost:3000/health

# Logs específicos por servicio
docker-compose -f docker-compose.simple.yml logs frontend
docker-compose -f docker-compose.simple.yml logs backend
docker-compose -f docker-compose.simple.yml logs postgres
```

### B. Verificar Base de Datos
```bash
# Conectar a PostgreSQL
docker exec -it consultorio-postgres psql -U app_derecho_user -d app_derecho_db

# Verificar tablas y datos
\dt
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM control_operativos;
\q
```

### C. Verificar Frontend
```bash
# Acceder desde navegador
# https://servicioucmc.online
# Verificar que carga correctamente
```

---

## 🚨 SOLUCIÓN DE PROBLEMAS COMUNES

### Error: "Failed to build frontend"
```bash
# Aplicar corrección manual
./fix_frontend_error.sh

# Rebuild solo frontend
docker-compose -f docker-compose.simple.yml build --no-cache frontend
docker-compose -f docker-compose.simple.yml up -d frontend
```

### Error: "Database connection failed"
```bash
# Verificar PostgreSQL
docker logs consultorio-postgres

# Recrear contenedor de base de datos
docker-compose -f docker-compose.simple.yml stop postgres
docker-compose -f docker-compose.simple.yml rm -f postgres
docker-compose -f docker-compose.simple.yml up -d postgres

# Esperar a que inicie
sleep 30

# Recrear backend
docker-compose -f docker-compose.simple.yml restart backend
```

### Error: "Port already in use"
```bash
# Verificar puertos ocupados
netstat -tulpn | grep -E ":80|:443|:3000|:8000|:5432"

# Detener servicios conflictivos
docker-compose -f docker-compose.simple.yml down
sudo systemctl stop nginx  # si hay nginx instalado
sudo systemctl stop apache2  # si hay apache instalado

# Reiniciar servicios
docker-compose -f docker-compose.simple.yml up -d
```

---

## 📊 MONITOREO POST-DESPLIEGUE

### Comandos de Monitoreo
```bash
# Ver uso de recursos
docker stats

# Ver logs en tiempo real
docker-compose -f docker-compose.simple.yml logs -f

# Verificar espacio en disco
df -h

# Verificar memoria
free -h
```

### Verificación de Endpoints
```bash
# Backend health
curl -v http://localhost:8000/health

# Frontend health
curl -v http://localhost:3000/health

# API de autenticación
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@universidadmayor.edu.co","password":"123456"}'

# API de control operativos
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/control-operativos
```

---

## 🎯 PASOS FINALES

### 1. Configurar SSL (si no está configurado)
```bash
# Instalar Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d servicioucmc.online

# Configurar renovación automática
sudo crontab -e
# Añadir: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Configurar Backup Automático
```bash
# Crear script de backup
cat > backup_daily.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec consultorio-postgres pg_dump -U app_derecho_user app_derecho_db > /backups/db_backup_$DATE.sql
docker cp consultorio-backend:/root/storage/uploads /backups/uploads_backup_$DATE
find /backups -name "*.sql" -mtime +7 -delete
find /backups -name "uploads_backup_*" -mtime +7 -exec rm -rf {} \;
EOF

chmod +x backup_daily.sh

# Configurar cron para backup diario
sudo crontab -e
# Añadir: 0 2 * * * /ruta/al/proyecto/backup_daily.sh
```

### 3. Configurar Monitoreo
```bash
# Script de monitoreo
cat > monitor_health.sh << 'EOF'
#!/bin/bash
if ! curl -f -s http://localhost:8000/health > /dev/null; then
    echo "Backend down, restarting..."
    docker-compose -f docker-compose.simple.yml restart backend
fi

if ! curl -f -s http://localhost:3000/health > /dev/null; then
    echo "Frontend down, restarting..."
    docker-compose -f docker-compose.simple.yml restart frontend
fi
EOF

chmod +x monitor_health.sh

# Ejecutar cada 5 minutos
sudo crontab -e
# Añadir: */5 * * * * /ruta/al/proyecto/monitor_health.sh
```

---

## ✅ CHECKLIST DE VERIFICACIÓN FINAL

- [ ] Todos los contenedores están corriendo (`docker ps`)
- [ ] Health checks responden OK
- [ ] Frontend carga en https://servicioucmc.online
- [ ] Backend responde en los endpoints de API
- [ ] Base de datos tiene datos de prueba
- [ ] SSL configurado y funcionando
- [ ] Backups configurados
- [ ] Monitoreo configurado
- [ ] Logs se están generando correctamente

---

## 🆘 CONTACTO DE EMERGENCIA

Si hay problemas críticos, seguir este orden:

1. **Verificar logs**: `docker-compose logs -f`
2. **Restart suave**: `docker-compose restart`
3. **Rebuild completo**: `./rebuild_simple.sh`
4. **Restaurar backup**: Si es necesario restaurar estado anterior

**¡IMPORTANTE!** Guardar logs de error antes de hacer cambios para diagnóstico.