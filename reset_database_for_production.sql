-- ============================================================================
-- RESET DATABASE FOR PRODUCTION - Consultorio Jurídico UCMC
-- Script para limpiar toda la base de datos y dejar solo usuario coordinador
-- ============================================================================

-- Mensaje de inicio
\echo '🚀 INICIANDO LIMPIEZA DE BASE DE DATOS PARA PRODUCCIÓN...'

-- ============================================================================
-- PASO 1: ELIMINAR TODOS LOS DATOS EXISTENTES
-- ============================================================================

\echo '🗑️  ELIMINANDO TODOS LOS DATOS EXISTENTES...'

-- Deshabilitar restricciones de clave foránea temporalmente
SET session_replication_role = replica;

-- Limpiar tablas en orden para evitar conflictos de FK
TRUNCATE TABLE calificaciones CASCADE;
TRUNCATE TABLE notificaciones CASCADE; 
TRUNCATE TABLE documentos_adjuntos CASCADE;
TRUNCATE TABLE control_operativos CASCADE;
TRUNCATE TABLE estudiantes CASCADE;
TRUNCATE TABLE profesors CASCADE;
TRUNCATE TABLE users CASCADE;

-- Re-habilitar restricciones de clave foránea
SET session_replication_role = DEFAULT;

\echo '✅ TODOS LOS DATOS ELIMINADOS CORRECTAMENTE'

-- ============================================================================
-- PASO 2: RESETEAR SECUENCIAS
-- ============================================================================

\echo '🔄 RESETEANDO SECUENCIAS DE IDs...'

-- Resetear secuencias para que empiecen desde 1
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE estudiantes_id_seq RESTART WITH 1;
ALTER SEQUENCE profesors_id_seq RESTART WITH 1;
ALTER SEQUENCE control_operativos_id_seq RESTART WITH 1;
ALTER SEQUENCE documentos_adjuntos_id_seq RESTART WITH 1;
ALTER SEQUENCE notificaciones_id_seq RESTART WITH 1;

-- Resetear secuencia de calificaciones si existe
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'calificaciones_id_seq') THEN
        ALTER SEQUENCE calificaciones_id_seq RESTART WITH 1;
    END IF;
END $$;

\echo '✅ SECUENCIAS RESETEADAS CORRECTAMENTE'

-- ============================================================================
-- PASO 3: CREAR USUARIO COORDINADOR POR DEFECTO
-- ============================================================================

\echo '👨‍💼 CREANDO USUARIO COORDINADOR POR DEFECTO...'

-- Insertar usuario coordinador con contraseña hasheada
-- Contraseña: Umayor2025** (hasheada con bcrypt cost 12)
INSERT INTO users (
    nombre_usuario,
    email,
    password_hash,
    role,
    activo,
    email_verified,
    nombres,
    apellidos,
    numero_celular,
    sede,
    created_at,
    updated_at
) VALUES (
    'luz.rincon',
    'consultoriojuridico.kennedy@universidadmayor.edu.co',
    '$2a$12$P2D9Sxlie5WybKGkMWqzT.CNv71d/dIoH2tp9itt8Ykc0QlHGYyfm',  -- Umayor2025**
    'coordinador',
    true,
    true,
    'Luz Mary',
    'Rincon',
    '3001234567',
    'UPK Kennedy',
    NOW(),
    NOW()
);

\echo '✅ USUARIO COORDINADOR CREADO: Luz Mary Rincon'

-- ============================================================================
-- PASO 4: VERIFICAR ESTADO FINAL
-- ============================================================================

\echo '🔍 VERIFICANDO ESTADO FINAL DE LA BASE DE DATOS...'

-- Contar registros en cada tabla
SELECT 
    'users' as tabla,
    COUNT(*) as registros,
    string_agg(DISTINCT role, ', ') as roles
FROM users
UNION ALL
SELECT 
    'estudiantes' as tabla,
    COUNT(*) as registros,
    null as roles
FROM estudiantes
UNION ALL
SELECT 
    'profesors' as tabla,
    COUNT(*) as registros,
    null as roles
FROM profesors
UNION ALL
SELECT 
    'control_operativos' as tabla,
    COUNT(*) as registros,
    null as roles
FROM control_operativos
UNION ALL
SELECT 
    'documentos_adjuntos' as tabla,
    COUNT(*) as registros,
    null as roles
FROM documentos_adjuntos
UNION ALL
SELECT 
    'notificaciones' as tabla,
    COUNT(*) as registros,
    null as roles
FROM notificaciones;

-- Mostrar usuario creado
\echo '👤 USUARIO COORDINADOR CREADO:'
SELECT 
    id,
    nombre_usuario,
    email,
    nombres || ' ' || apellidos as nombre_completo,
    role,
    activo,
    email_verified,
    created_at
FROM users;

-- ============================================================================
-- CONFIRMACIÓN FINAL
-- ============================================================================

\echo ''
\echo '🎉 ============================================================================'
\echo '✅ BASE DE DATOS LIMPIA Y LISTA PARA PRODUCCIÓN'
\echo '============================================================================'
\echo ''
\echo '📋 RESUMEN:'
\echo '   • Todas las tablas limpiadas'
\echo '   • Secuencias reseteadas'
\echo '   • Usuario coordinador creado:'
\echo '     - Email: consultoriojuridico.kennedy@universidadmayor.edu.co'
\echo '     - Contraseña: Umayor2025**'
\echo '     - Nombre: Luz Mary Rincon'
\echo '     - Rol: coordinador'
\echo ''
\echo '🚀 LA BASE DE DATOS ESTÁ LISTA PARA DESPLIEGUE EN PRODUCCIÓN'
\echo '============================================================================'