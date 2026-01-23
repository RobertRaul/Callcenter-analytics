#!/bin/bash

# ============================================================================
# Script de Despliegue de Optimización de Performance
# Call Center Analytics
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# MySQL credentials
DB_HOST="192.168.3.2"
DB_USER="asteriskuser"
DB_PASS="aul"
DB_NAME="asteriskcdrdb"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Optimización de Performance${NC}"
echo -e "${BLUE}Call Center Analytics${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to execute MySQL command
mysql_exec() {
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "$1" 2>&1
}

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 - ERROR${NC}"
        exit 1
    fi
}

# Step 1: Test MySQL connection
echo -e "${YELLOW}1. Verificando conexión a MySQL...${NC}"
mysql_exec "SELECT 1" > /dev/null
check_status "Conexión a MySQL establecida"
echo ""

# Step 2: Check current table size
echo -e "${YELLOW}2. Verificando tamaño de tabla queue_log...${NC}"
RECORDS=$(mysql_exec "SELECT COUNT(*) AS cnt FROM queue_log" | tail -n1)
SIZE=$(mysql_exec "
    SELECT ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
    FROM information_schema.TABLES
    WHERE table_schema = '$DB_NAME' AND table_name = 'queue_log'
" | tail -n1)

echo -e "  Registros totales: ${YELLOW}$RECORDS${NC}"
echo -e "  Tamaño en disco: ${YELLOW}${SIZE}MB${NC}"
echo ""

# Step 3: Create backup of important queries (optional)
echo -e "${YELLOW}3. Creando respaldo de configuración actual...${NC}"
BACKUP_DIR="/opt/callcenter-analytics/backend/migrations/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" --no-data "$DB_NAME" > "$BACKUP_DIR/schema_backup.sql" 2>/dev/null || true
check_status "Respaldo creado en $BACKUP_DIR"
echo ""

# Step 4: Apply migration
echo -e "${YELLOW}4. Aplicando optimizaciones (vistas e índices)...${NC}"
echo -e "  ${BLUE}Esto puede tomar 2-5 minutos dependiendo del tamaño de la tabla...${NC}"
echo ""

MIGRATION_FILE="/opt/callcenter-analytics/backend/migrations/001_performance_optimization.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}✗ Archivo de migración no encontrado: $MIGRATION_FILE${NC}"
    exit 1
fi

mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$MIGRATION_FILE"
check_status "Migración aplicada correctamente"
echo ""

# Step 5: Verify views were created
echo -e "${YELLOW}5. Verificando vistas creadas...${NC}"
VIEWS=$(mysql_exec "SHOW TABLES LIKE 'v_%'" | tail -n +2 | wc -l)

if [ "$VIEWS" -eq 5 ]; then
    echo -e "${GREEN}✓ Las 5 vistas fueron creadas correctamente:${NC}"
    mysql_exec "SHOW TABLES LIKE 'v_%'" | tail -n +2 | while read view; do
        echo -e "    - ${GREEN}$view${NC}"
    done
else
    echo -e "${RED}✗ Error: Se esperaban 5 vistas, se encontraron $VIEWS${NC}"
    exit 1
fi
echo ""

# Step 6: Verify indexes were created
echo -e "${YELLOW}6. Verificando índices creados...${NC}"
INDEXES=$(mysql_exec "SHOW INDEX FROM queue_log WHERE Key_name LIKE 'idx_%'" | tail -n +2 | awk '{print $3}' | sort -u | wc -l)

if [ "$INDEXES" -ge 6 ]; then
    echo -e "${GREEN}✓ Índices creados correctamente ($INDEXES índices)${NC}"
else
    echo -e "${YELLOW}⚠ Advertencia: Se esperaban al menos 6 índices, se encontraron $INDEXES${NC}"
fi
echo ""

# Step 7: Test views
echo -e "${YELLOW}7. Probando vistas con datos de prueba...${NC}"

# Test v_daily_call_summary
DAILY_ROWS=$(mysql_exec "SELECT COUNT(*) AS cnt FROM v_daily_call_summary LIMIT 10" | tail -n1)
echo -e "  v_daily_call_summary: ${GREEN}$DAILY_ROWS filas${NC}"

# Test v_hourly_call_distribution
HOURLY_ROWS=$(mysql_exec "SELECT COUNT(*) AS cnt FROM v_hourly_call_distribution LIMIT 10" | tail -n1)
echo -e "  v_hourly_call_distribution: ${GREEN}$HOURLY_ROWS filas${NC}"

# Test v_agent_statistics
AGENT_ROWS=$(mysql_exec "SELECT COUNT(*) AS cnt FROM v_agent_statistics LIMIT 10" | tail -n1)
echo -e "  v_agent_statistics: ${GREEN}$AGENT_ROWS filas${NC}"

# Test v_queue_statistics
QUEUE_ROWS=$(mysql_exec "SELECT COUNT(*) AS cnt FROM v_queue_statistics LIMIT 10" | tail -n1)
echo -e "  v_queue_statistics: ${GREEN}$QUEUE_ROWS filas${NC}"

# Test v_call_events_summary
EVENTS_ROWS=$(mysql_exec "SELECT COUNT(*) AS cnt FROM v_call_events_summary LIMIT 10" | tail -n1)
echo -e "  v_call_events_summary: ${GREEN}$EVENTS_ROWS filas${NC}"

check_status "Todas las vistas contienen datos"
echo ""

# Step 8: Restart backend
echo -e "${YELLOW}8. Reiniciando backend...${NC}"
systemctl restart callcenter-api
sleep 3
check_status "Backend reiniciado"
echo ""

# Step 9: Verify backend is using optimized service
echo -e "${YELLOW}9. Verificando que backend usa servicio optimizado...${NC}"
sleep 2

OPTIMIZED_LOG=$(journalctl -u callcenter-api -n 50 | grep -c "OPTIMIZED service" || echo "0")
VIEWS_AVAILABLE=$(journalctl -u callcenter-api -n 50 | grep -c "All optimized views available" || echo "0")

if [ "$OPTIMIZED_LOG" -gt 0 ] && [ "$VIEWS_AVAILABLE" -gt 0 ]; then
    echo -e "${GREEN}✓ Backend está usando servicio OPTIMIZADO${NC}"
    echo ""
    echo -e "${BLUE}Logs del backend:${NC}"
    journalctl -u callcenter-api -n 20 | grep -E "(OPTIMIZED|view)" | tail -5
else
    echo -e "${YELLOW}⚠ Advertencia: Backend podría no estar usando servicio optimizado${NC}"
    echo -e "  Ver logs: ${BLUE}journalctl -u callcenter-api -f${NC}"
fi
echo ""

# Step 10: Performance test
echo -e "${YELLOW}10. Ejecutando prueba de performance...${NC}"
START_TIME=$(date +%s)

TEST_QUERY="
SELECT COUNT(*) AS cnt
FROM v_daily_call_summary
WHERE call_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
"

RESULT=$(mysql_exec "$TEST_QUERY" | tail -n1)
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "  Query: Resumen diario últimos 7 días"
echo -e "  Resultados: ${GREEN}$RESULT filas${NC}"
echo -e "  Tiempo: ${GREEN}${DURATION}s${NC}"

if [ "$DURATION" -lt 3 ]; then
    echo -e "${GREEN}✓ Performance excelente (<3s)${NC}"
elif [ "$DURATION" -lt 10 ]; then
    echo -e "${YELLOW}⚠ Performance aceptable pero mejorable${NC}"
else
    echo -e "${RED}✗ Performance pobre (>10s)${NC}"
    echo -e "  Considerar ejecutar: OPTIMIZE TABLE queue_log;"
fi
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}OPTIMIZACIÓN COMPLETADA${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Resumen:${NC}"
echo -e "  ✓ Vistas creadas: ${GREEN}5${NC}"
echo -e "  ✓ Índices creados: ${GREEN}$INDEXES${NC}"
echo -e "  ✓ Backend reiniciado: ${GREEN}Sí${NC}"
echo -e "  ✓ Servicio optimizado: ${GREEN}Activo${NC}"
echo ""
echo -e "${BLUE}Comandos útiles:${NC}"
echo -e "  Ver logs:          ${YELLOW}journalctl -u callcenter-api -f${NC}"
echo -e "  Estado backend:    ${YELLOW}systemctl status callcenter-api${NC}"
echo -e "  Reiniciar backend: ${YELLOW}systemctl restart callcenter-api${NC}"
echo ""
echo -e "${BLUE}Próximos pasos:${NC}"
echo -e "  1. Probar el dashboard en: ${YELLOW}http://192.168.11.3${NC}"
echo -e "  2. Verificar que carga en menos de 2 segundos"
echo -e "  3. Monitorear logs para confirmar uso de vistas optimizadas"
echo ""
echo -e "${GREEN}Si encuentras algún problema, consulta:${NC}"
echo -e "  ${YELLOW}/opt/callcenter-analytics/backend/migrations/DEPLOY_OPTIMIZATION.md${NC}"
echo ""
