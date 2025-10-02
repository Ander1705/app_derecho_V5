-- ==============================================================================
-- OPTIMIZACIONES DE BASE DE DATOS PARA CONSULTORIO JURÍDICO UCMC
-- Desarrollador Principal: Anderson Felipe Montaña Castelblanco
-- Optimizado para manejar 10000+ registros con alto rendimiento
-- ==============================================================================

-- Configurar parámetros de rendimiento para la sesión
SET work_mem = '256MB';
SET maintenance_work_mem = '1GB';
SET random_page_cost = 1.1;
SET effective_cache_size = '2GB';

-- ÍNDICES PARA TABLA USERS
-- ==============================================================================

-- Índice compuesto para login optimizado
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active_verified 
ON users(email, activo, email_verified) 
WHERE activo = true;

-- Índice para búsquedas por rol y estado
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active 
ON users(role, activo) 
WHERE activo = true;

-- Índice para ordenamiento por fecha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at_desc 
ON users(created_at DESC);

-- Índice para verificación de correos únicos
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_unique_active 
ON users(email) 
WHERE activo = true;

-- ÍNDICES PARA TABLA CONTROL_OPERATIVOS
-- ==============================================================================

-- Índice principal para consultas por usuario creador
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_control_created_by_active_date 
ON control_operativos(created_by_id, activo, created_at DESC) 
WHERE activo = true;

-- Índice para filtros por estado de flujo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_control_estado_flujo_active 
ON control_operativos(estado_flujo, activo, created_at DESC) 
WHERE activo = true;

-- Índice para estadísticas por área de consulta
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_control_area_consulta_active 
ON control_operativos(area_consulta, activo) 
WHERE activo = true AND area_consulta IS NOT NULL;

-- Índice compuesto para dashboard de coordinador
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_control_coordinator_dashboard 
ON control_operativos(estado_flujo, estado_resultado, activo, created_at DESC) 
WHERE activo = true;

-- Índice para búsquedas por profesor responsable
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_control_profesor_responsable 
ON control_operativos(nombre_docente_responsable, activo) 
WHERE activo = true AND nombre_docente_responsable IS NOT NULL;

-- Índice de texto completo para búsquedas (GIN)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_control_fulltext_search 
ON control_operativos USING gin(
    to_tsvector('spanish', 
        COALESCE(nombre_consultante, '') || ' ' ||
        COALESCE(numero_documento, '') || ' ' ||
        COALESCE(descripcion_caso, '') || ' ' ||
        COALESCE(area_consulta, '')
    )
) WHERE activo = true;

-- Índice para rangos de fecha (reportes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_control_date_range 
ON control_operativos(created_at, activo) 
WHERE activo = true;

-- ÍNDICES PARA TABLA ESTUDIANTES
-- ==============================================================================

-- Índice principal por user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estudiantes_user_id_active 
ON estudiantes(user_id, activo) 
WHERE activo = true;

-- Índice único para código estudiantil
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_estudiantes_codigo_unique 
ON estudiantes(codigo_estudiantil) 
WHERE activo = true;

-- Índice por número de documento
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estudiantes_documento 
ON estudiantes(numero_documento, activo) 
WHERE activo = true;

-- ÍNDICES PARA TABLA PROFESORS
-- ==============================================================================

-- Índice principal por user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profesors_user_id_active 
ON profesors(user_id, activo) 
WHERE activo = true;

-- Índice por número de documento
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profesors_documento 
ON profesors(numero_documento, activo) 
WHERE activo = true;

-- ÍNDICES PARA TABLA CALIFICACIONES (si existe)
-- ==============================================================================

-- Verificar si existe la tabla de calificaciones
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'calificaciones') THEN
        -- Índice por estudiante
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calificaciones_estudiante_date 
        ON calificaciones(estudiante_id, created_at DESC);
        
        -- Índice por profesor evaluador
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calificaciones_profesor_date 
        ON calificaciones(profesor_evaluador_id, created_at DESC) 
        WHERE profesor_evaluador_id IS NOT NULL;
        
        -- Índice compuesto para estadísticas
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calificaciones_stats 
        ON calificaciones(estudiante_id, promedio_general, created_at DESC);
    END IF;
END $$;

-- OPTIMIZACIONES DE CONSULTAS FRECUENTES
-- ==============================================================================

-- Actualizar estadísticas de tablas
ANALYZE users;
ANALYZE control_operativos;
ANALYZE estudiantes;
ANALYZE profesors;

-- Crear funciones optimizadas para estadísticas
CREATE OR REPLACE FUNCTION get_estadisticas_rapidas()
RETURNS TABLE(
    total_controles bigint,
    controles_pendientes bigint,
    controles_completos bigint,
    total_usuarios bigint,
    usuarios_activos bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM control_operativos WHERE activo = true),
        (SELECT COUNT(*) FROM control_operativos WHERE activo = true AND estado_flujo = 'pendiente_profesor'),
        (SELECT COUNT(*) FROM control_operativos WHERE activo = true AND estado_flujo = 'completo'),
        (SELECT COUNT(*) FROM users),
        (SELECT COUNT(*) FROM users WHERE activo = true);
END;
$$ LANGUAGE plpgsql;

-- Función para búsqueda optimizada
CREATE OR REPLACE FUNCTION busqueda_controles_optimizada(
    termino_busqueda text,
    limite integer DEFAULT 20,
    offset_val integer DEFAULT 0
)
RETURNS TABLE(
    id integer,
    nombre_consultante varchar,
    numero_documento varchar,
    area_consulta varchar,
    estado_flujo varchar,
    created_at timestamp
) AS $$
BEGIN
    IF LENGTH(termino_busqueda) < 3 THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        co.id,
        co.nombre_consultante,
        co.numero_documento,
        co.area_consulta,
        co.estado_flujo,
        co.created_at
    FROM control_operativos co
    WHERE co.activo = true
    AND (
        co.nombre_consultante ILIKE '%' || termino_busqueda || '%' OR
        co.numero_documento ILIKE '%' || termino_busqueda || '%' OR
        co.descripcion_caso ILIKE '%' || termino_busqueda || '%' OR
        to_tsvector('spanish', 
            COALESCE(co.nombre_consultante, '') || ' ' ||
            COALESCE(co.numero_documento, '') || ' ' ||
            COALESCE(co.descripcion_caso, '') || ' ' ||
            COALESCE(co.area_consulta, '')
        ) @@ plainto_tsquery('spanish', termino_busqueda)
    )
    ORDER BY co.created_at DESC
    LIMIT limite OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- CONFIGURACIONES DE RENDIMIENTO
-- ==============================================================================

-- Configurar autovacuum para tablas críticas
ALTER TABLE control_operativos SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE users SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1
);

-- VISTAS MATERIALIZADAS PARA REPORTES
-- ==============================================================================

-- Vista materializada para estadísticas por área
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_estadisticas_areas AS
SELECT 
    area_consulta,
    COUNT(*) as total_casos,
    COUNT(CASE WHEN estado_flujo = 'completo' THEN 1 END) as casos_completos,
    COUNT(CASE WHEN estado_flujo = 'pendiente_profesor' THEN 1 END) as casos_pendientes,
    AVG(EXTRACT(DAY FROM (CASE 
        WHEN estado_flujo = 'completo' 
        THEN updated_at - created_at 
        ELSE NULL 
    END))) as promedio_dias_resolucion
FROM control_operativos 
WHERE activo = true 
AND area_consulta IS NOT NULL
GROUP BY area_consulta
ORDER BY total_casos DESC;

-- Crear índice único para la vista materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_estadisticas_areas_area 
ON mv_estadisticas_areas(area_consulta);

-- Vista materializada para estadísticas mensuales
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_estadisticas_mensuales AS
SELECT 
    DATE_TRUNC('month', created_at) as mes,
    COUNT(*) as total_casos,
    COUNT(CASE WHEN estado_flujo = 'completo' THEN 1 END) as casos_completos,
    COUNT(DISTINCT created_by_id) as usuarios_activos
FROM control_operativos 
WHERE activo = true 
AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes DESC;

-- Crear índice único para la vista materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_estadisticas_mensuales_mes 
ON mv_estadisticas_mensuales(mes);

-- PROCEDIMIENTO PARA REFRESCAR VISTAS MATERIALIZADAS
-- ==============================================================================

CREATE OR REPLACE FUNCTION refresh_estadisticas_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_estadisticas_areas;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_estadisticas_mensuales;
    
    -- Actualizar estadísticas de tablas
    ANALYZE control_operativos;
    ANALYZE users;
    ANALYZE estudiantes;
    ANALYZE profesors;
END;
$$ LANGUAGE plpgsql;

-- Programar actualización automática (ejecutar manualmente según necesidad)
-- SELECT cron.schedule('refresh-stats', '0 1 * * *', 'SELECT refresh_estadisticas_views();');

-- VALIDACIONES FINALES
-- ==============================================================================

-- Verificar que todos los índices fueron creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'control_operativos', 'estudiantes', 'profesors')
ORDER BY tablename, indexname;

-- Mostrar estadísticas de tablas
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Commit final
COMMIT;

-- Mensaje de confirmación
SELECT 'Optimizaciones de base de datos aplicadas exitosamente!' as mensaje;