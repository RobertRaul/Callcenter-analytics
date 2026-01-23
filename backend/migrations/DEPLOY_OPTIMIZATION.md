# Despliegue de Optimización de Performance

## Resumen

Esta optimización resuelve el problema de que el backend se bloquea al leer 7+ millones de registros en memoria, causando timeouts de 12+ minutos y uso de 2.8GB+ de memoria.

**Solución:**
- Vistas MySQL con datos pre-agregados
- Índices en columnas frecuentemente consultadas
- Queries optimizados que usan agregaciones de base de datos
- Fallback automático al método legacy si las vistas no están disponibles

**Beneficios esperados:**
- Queries 100-1000x más rápidas (de 12 minutos a <1 segundo)
- Uso de memoria reducido (de 2.8GB a <100MB)
- Backend siempre responsive
- Sin necesidad de reiniciar constantemente

---

## Pasos de Despliegue

### 1. Crear Vistas e Índices en MySQL

Conectarse al servidor MySQL y ejecutar el script de migración:

```bash
# Opción 1: Desde el servidor (192.168.11.3)
mysql -h 192.168.3.2 -u asteriskuser -p asteriskcdrdb < /opt/callcenter-analytics/backend/migrations/001_performance_optimization.sql

# Opción 2: Desde cualquier máquina con acceso a MySQL
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb < 001_performance_optimization.sql
```

**Verificar que se crearon correctamente:**

```bash
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb -e "SHOW TABLES LIKE 'v_%';"
```

Deberías ver 5 vistas:
- v_agent_statistics
- v_call_events_summary
- v_daily_call_summary
- v_hourly_call_distribution
- v_queue_statistics

**Verificar índices:**

```bash
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb -e "SHOW INDEX FROM queue_log;"
```

Deberías ver los nuevos índices:
- idx_queue_log_time
- idx_queue_log_event
- idx_queue_log_queuename
- idx_queue_log_agent
- idx_queue_log_time_event
- idx_queue_log_time_queue

### 2. Reiniciar Backend

```bash
systemctl restart callcenter-api
```

### 3. Verificar Logs

```bash
journalctl -u callcenter-api -f
```

**Logs esperados al iniciar:**

```
✓ Queue log parser usando MySQL asteriskcdrdb.queue_log
✓ Conexión exitosa a MySQL queue_log (registros disponibles)
✓ All optimized views available: 5/5
✓ Using OPTIMIZED service with MySQL views (fast queries)
✓ AgentsController using OPTIMIZED service
✓ QueuesController using OPTIMIZED service
```

Si ves estos mensajes, la optimización está activa.

**Si no se encuentran las vistas:**

```
⚠ Optimized views not available, using legacy service (slow)
To enable fast queries, run: mysql -h 192.168.3.2 -u asteriskuser -p asteriskcdrdb < migrations/001_performance_optimization.sql
```

Esto significa que debes ejecutar el paso 1 nuevamente.

---

## Verificación de Funcionamiento

### Test 1: Dashboard debe cargar rápido

```bash
# Desde el servidor o cualquier cliente
time curl -s "http://192.168.11.3/api/dashboard/summary?start_date=2025-01-01&end_date=2025-01-02" > /dev/null
```

**Esperado:** <2 segundos (antes: >700 segundos)

### Test 2: Verificar que usa vistas optimizadas

```bash
# Ver logs en tiempo real
journalctl -u callcenter-api -f

# Luego acceder al dashboard desde el navegador
# Los logs deberían mostrar:
✓ Call statistics retrieved from views (ultra fast)
✓ Daily summary retrieved from view (fast query): 7 days
✓ Hourly distribution retrieved from view: 24 hours
```

### Test 3: Comparar uso de memoria

**Antes (legacy):**
```bash
# Durante query lenta
ps aux | grep uvicorn
# Uso de memoria: ~2.8GB
```

**Después (optimizado):**
```bash
# Durante query optimizada
ps aux | grep uvicorn
# Uso de memoria: <100MB
```

---

## Funcionamiento Técnico

### Sin Vistas (Método Legacy - LENTO)

```
1. Frontend hace request → GET /api/dashboard/summary?start_date=2025-01-01&end_date=2025-01-02
2. Backend ejecuta: SELECT * FROM queue_log WHERE time BETWEEN ... (7.4M registros)
3. Python lee 7.4M registros en memoria (2.8GB)
4. Python procesa en loops con diccionarios
5. Tiempo total: 726 segundos (12 minutos)
6. Backend bloqueado durante todo el proceso
```

### Con Vistas (Método Optimizado - RÁPIDO)

```
1. Frontend hace request → GET /api/dashboard/summary?start_date=2025-01-01&end_date=2025-01-02
2. Backend ejecuta: SELECT SUM(...), AVG(...) FROM v_daily_call_summary WHERE call_date BETWEEN ...
3. MySQL usa vista pre-agregada (ya calculada)
4. Retorna solo las filas necesarias (ej: 2 filas para 2 días)
5. Tiempo total: <1 segundo
6. Uso de memoria: <10MB
```

### Vistas Creadas

1. **v_daily_call_summary** - Resumen diario agregado por fecha y cola
2. **v_hourly_call_distribution** - Distribución horaria agregada
3. **v_queue_statistics** - Estadísticas por cola
4. **v_agent_statistics** - Estadísticas por agente
5. **v_call_events_summary** - Conteo de eventos por tipo

Todas las vistas filtran automáticamente a los últimos 90-180 días para mantener queries rápidas.

---

## Rollback (si hay problemas)

Si necesitas volver al método anterior por alguna razón:

```bash
# 1. Eliminar las vistas
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb <<EOF
DROP VIEW IF EXISTS v_daily_call_summary;
DROP VIEW IF EXISTS v_hourly_call_distribution;
DROP VIEW IF EXISTS v_queue_statistics;
DROP VIEW IF EXISTS v_agent_statistics;
DROP VIEW IF EXISTS v_call_events_summary;
EOF

# 2. Reiniciar backend
systemctl restart callcenter-api

# El sistema detectará automáticamente que no hay vistas y usará el método legacy
```

**NOTA:** Los índices pueden quedarse sin problema, mejoran el performance legacy.

Para eliminar índices también:

```bash
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb <<EOF
DROP INDEX idx_queue_log_time ON queue_log;
DROP INDEX idx_queue_log_event ON queue_log;
DROP INDEX idx_queue_log_queuename ON queue_log;
DROP INDEX idx_queue_log_agent ON queue_log;
DROP INDEX idx_queue_log_time_event ON queue_log;
DROP INDEX idx_queue_log_time_queue ON queue_log;
EOF
```

---

## Troubleshooting

### Problema: "Table 'asteriskcdrdb.v_daily_call_summary' doesn't exist"

**Solución:** Ejecutar el script de migración:

```bash
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb < /opt/callcenter-analytics/backend/migrations/001_performance_optimization.sql
systemctl restart callcenter-api
```

### Problema: Sistema sigue lento después de crear vistas

**Diagnóstico:**

```bash
# Ver logs para confirmar que usa vistas
journalctl -u callcenter-api -n 100 | grep -E "(OPTIMIZED|LEGACY|view)"

# Si ves "Using LEGACY service", las vistas no están disponibles
# Si ves "Using OPTIMIZED service", todo está OK
```

**Solución:** Reiniciar backend para que detecte las vistas:

```bash
systemctl restart callcenter-api
```

### Problema: "Access denied for user 'asteriskuser'"

**Solución:** El usuario necesita permisos para crear vistas/índices:

```bash
# Conectarse como root
mysql -h 192.168.3.2 -u root -p

# Otorgar permisos
GRANT CREATE, INDEX, CREATE VIEW ON asteriskcdrdb.* TO 'asteriskuser'@'%';
FLUSH PRIVILEGES;
```

### Problema: Queries lentas incluso con vistas

**Diagnóstico:**

```bash
# Verificar que las vistas tienen datos
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb -e "SELECT COUNT(*) FROM v_daily_call_summary;"

# Verificar índices
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb -e "SHOW INDEX FROM queue_log;"
```

**Solución:** Optimizar tabla queue_log:

```bash
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb -e "OPTIMIZE TABLE queue_log;"
```

---

## Mantenimiento

### Limpiar datos antiguos (opcional)

Las vistas filtran a 90-180 días automáticamente. Para datos más antiguos, considerar archivar:

```bash
# Crear tabla de archivo
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb <<EOF
CREATE TABLE IF NOT EXISTS queue_log_archive LIKE queue_log;

-- Mover datos >1 año a archivo
INSERT INTO queue_log_archive
SELECT * FROM queue_log
WHERE CAST(time AS UNSIGNED) < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 1 YEAR));

-- Eliminar de tabla principal
DELETE FROM queue_log
WHERE CAST(time AS UNSIGNED) < UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 1 YEAR));

-- Optimizar
OPTIMIZE TABLE queue_log;
EOF
```

### Monitorear tamaño de tabla

```bash
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb -e "
SELECT
    table_name AS 'Table',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
    table_rows AS 'Rows'
FROM information_schema.TABLES
WHERE table_schema = 'asteriskcdrdb'
  AND table_name LIKE 'queue_log%'
ORDER BY (data_length + index_length) DESC;
"
```

---

## Monitoreo de Performance

### Queries más lentas

```bash
# Activar slow query log (temporal)
mysql -h 192.168.3.2 -u root -p -e "
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
"

# Ver queries lentas después de un día
pt-query-digest /var/log/mysql/slow.log | less
```

### Verificar uso de índices

```bash
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb -e "
EXPLAIN SELECT * FROM v_daily_call_summary WHERE call_date = CURDATE();
"
```

---

## Resultados Esperados

| Métrica | Antes (Legacy) | Después (Optimizado) | Mejora |
|---------|----------------|----------------------|--------|
| Tiempo de query dashboard | 726s (12 min) | <1s | 700x más rápido |
| Tiempo de query reports | 300s (5 min) | <2s | 150x más rápido |
| Uso de memoria | 2.8GB | <100MB | 96% menos |
| Registros leídos | 7.4M | <1000 | 7400x menos |
| Backend responsive | No | Sí | ✓ |

---

## Contacto

Para soporte o preguntas sobre esta optimización, consultar los logs del sistema:

```bash
journalctl -u callcenter-api -f
```
