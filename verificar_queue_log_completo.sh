#!/bin/bash
###############################################################################
# Script de Verificación de queue_log
# Para: Servidor 192.168.11.3 (svrmetrics)
###############################################################################

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║          VERIFICACIÓN DE QUEUE_LOG Y API                         ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

QLOG="/var/log/asterisk/queue_log"
API_URL="http://localhost:8000"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# 1. VERIFICAR ARCHIVO queue_log
# ============================================================================
echo -e "${BLUE}[1] VERIFICACIÓN DEL ARCHIVO queue_log${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "$QLOG" ]; then
    echo -e "${RED}✗ Archivo NO existe: $QLOG${NC}"
    echo ""
    echo "El archivo debe estar en: /var/log/asterisk/queue_log"
    echo "Verifica que lo hayas copiado desde Issabel."
    exit 1
fi

echo -e "${GREEN}✓ Archivo existe${NC}"
echo ""

# Información básica
SIZE=$(ls -lh $QLOG | awk '{print $5}')
LINES=$(wc -l < $QLOG)
PERMS=$(ls -l $QLOG | awk '{print $1}')

echo "Información:"
echo "  📁 Ruta:     $QLOG"
echo "  📊 Tamaño:   $SIZE"
echo "  📝 Líneas:   $LINES"
echo "  🔒 Permisos: $PERMS"

# Verificar permisos de lectura
if [ ! -r "$QLOG" ]; then
    echo -e "${RED}✗ El archivo NO es legible${NC}"
    echo "  Ejecuta: sudo chmod 644 $QLOG"
    exit 1
fi

echo ""

# ============================================================================
# 2. ANÁLISIS DE FECHAS
# ============================================================================
echo -e "${BLUE}[2] ANÁLISIS DE FECHAS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FIRST_TS=$(head -1 $QLOG | cut -d'|' -f1)
LAST_TS=$(tail -1 $QLOG | cut -d'|' -f1)

if [ -z "$FIRST_TS" ] || [ -z "$LAST_TS" ]; then
    echo -e "${RED}✗ No se pueden leer los timestamps${NC}"
    exit 1
fi

FIRST_DATE=$(date -d @$FIRST_TS '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r $FIRST_TS '+%Y-%m-%d %H:%M:%S')
LAST_DATE=$(date -d @$LAST_TS '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r $LAST_TS '+%Y-%m-%d %H:%M:%S')

echo "Rango de datos disponibles:"
echo "  📅 Primera entrada: $FIRST_DATE"
echo "  📅 Última entrada:  $LAST_DATE"
echo ""

# Calcular días desde última actividad
NOW=$(date +%s)
DAYS_AGO=$(( ($NOW - $LAST_TS) / 86400 ))

if [ $DAYS_AGO -gt 7 ]; then
    echo -e "${YELLOW}⚠️  Última actividad hace $DAYS_AGO días${NC}"
    echo "   Los datos pueden estar desactualizados"
elif [ $DAYS_AGO -gt 1 ]; then
    echo -e "${YELLOW}⚠️  Última actividad hace $DAYS_AGO días${NC}"
else
    echo -e "${GREEN}✓ Datos recientes (hace $DAYS_AGO día(s))${NC}"
fi

echo ""

# ============================================================================
# 3. ANÁLISIS DE EVENTOS
# ============================================================================
echo -e "${BLUE}[3] EVENTOS ENCONTRADOS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Top 10 eventos:"
cut -d'|' -f5 $QLOG | sort | uniq -c | sort -rn | head -10 | while read count event; do
    printf "  %-20s %'d\n" "$event" "$count"
done

echo ""

# Eventos importantes
ENTERQUEUE=$(cut -d'|' -f5 $QLOG | grep -c "ENTERQUEUE")
CONNECT=$(cut -d'|' -f5 $QLOG | grep -c "CONNECT")
ABANDON=$(cut -d'|' -f5 $QLOG | grep -c "ABANDON")
COMPLETE=$(cut -d'|' -f5 $QLOG | grep -c -E "COMPLETE")

echo "Resumen de llamadas:"
echo "  📞 Llamadas entrantes (ENTERQUEUE): $ENTERQUEUE"
echo "  ✅ Llamadas contestadas (CONNECT):  $CONNECT"
echo "  ❌ Llamadas abandonadas (ABANDON):  $ABANDON"
echo "  ✓  Llamadas completadas (COMPLETE): $COMPLETE"

if [ $ENTERQUEUE -gt 0 ]; then
    ANSWER_RATE=$(awk "BEGIN {printf \"%.2f\", ($CONNECT/$ENTERQUEUE)*100}")
    echo "  📊 Tasa de respuesta: $ANSWER_RATE%"
fi

echo ""

# ============================================================================
# 4. COLAS Y AGENTES
# ============================================================================
echo -e "${BLUE}[4] COLAS Y AGENTES${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

QUEUES=$(cut -d'|' -f3 $QLOG | sort -u | grep -v "^$" | grep -v NONE)
QUEUE_COUNT=$(echo "$QUEUES" | wc -l)

echo "Colas encontradas ($QUEUE_COUNT):"
echo "$QUEUES" | head -10 | sed 's/^/  🎯 /'

if [ $QUEUE_COUNT -gt 10 ]; then
    echo "  ... y $((QUEUE_COUNT - 10)) más"
fi

echo ""

AGENTS=$(cut -d'|' -f4 $QLOG | sort -u | grep -v "^$" | grep -v NONE)
AGENT_COUNT=$(echo "$AGENTS" | wc -l)

echo "Agentes encontrados ($AGENT_COUNT):"
echo "$AGENTS" | head -10 | sed 's/^/  👤 /'

if [ $AGENT_COUNT -gt 10 ]; then
    echo "  ... y $((AGENT_COUNT - 10)) más"
fi

echo ""

# ============================================================================
# 5. DATOS DE HOY
# ============================================================================
echo -e "${BLUE}[5] DATOS DE HOY${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TODAY_START=$(date -d "today 00:00" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$(date +%Y-%m-%d)" +%s)
TODAY_COUNT=$(awk -F'|' -v ts=$TODAY_START '$1 >= ts {print}' $QLOG | wc -l)

echo "Eventos registrados hoy: $TODAY_COUNT"

if [ $TODAY_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No hay eventos de hoy${NC}"
    echo "   Usa fechas entre: $(date -d @$FIRST_TS '+%Y-%m-%d') y $(date -d @$LAST_TS '+%Y-%m-%d')"
else
    echo -e "${GREEN}✓ Hay datos de hoy disponibles${NC}"
    
    # Eventos de hoy por tipo
    echo ""
    echo "Desglose de eventos de hoy:"
    awk -F'|' -v ts=$TODAY_START '$1 >= ts {print $5}' $QLOG | sort | uniq -c | sort -rn | while read count event; do
        printf "  %-20s %d\n" "$event" "$count"
    done
fi

echo ""

# ============================================================================
# 6. VERIFICAR API
# ============================================================================
echo -e "${BLUE}[6] VERIFICACIÓN DE LA API${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar si la API está corriendo
if ! pgrep -f "uvicorn" > /dev/null && ! pgrep -f "main:app" > /dev/null; then
    echo -e "${RED}✗ API no está corriendo${NC}"
    echo ""
    echo "Inicia la API con:"
    echo "  cd /opt/callcenter-analytics"
    echo "  uvicorn main:app --host 0.0.0.0 --port 8000"
    exit 1
fi

echo -e "${GREEN}✓ API está corriendo${NC}"
echo ""

# Probar endpoint de health
if command -v curl &> /dev/null; then
    echo "Probando endpoint /health..."
    HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health.json $API_URL/health 2>/dev/null)
    
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        echo -e "${GREEN}✓ API responde correctamente${NC}"
        cat /tmp/health.json | python3 -m json.tool 2>/dev/null | head -10
    else
        echo -e "${RED}✗ API no responde (código: $HEALTH_RESPONSE)${NC}"
    fi
    echo ""
fi

# ============================================================================
# 7. PROBAR ENDPOINTS CORRECTOS
# ============================================================================
echo -e "${BLUE}[7] PROBANDO ENDPOINTS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Calcular rango de fechas para la consulta
QUERY_END=$(date -d @$LAST_TS '+%Y-%m-%d' 2>/dev/null || date -r $LAST_TS '+%Y-%m-%d')
QUERY_START=$(date -d "$QUERY_END -7 days" '+%Y-%m-%d' 2>/dev/null || date -v-7d -j -f "%Y-%m-%d" "$QUERY_END" '+%Y-%m-%d')

echo "Usando rango de fechas: $QUERY_START a $QUERY_END"
echo ""

if command -v curl &> /dev/null; then
    # 1. Lista de colas
    echo "1. Probando /api/queues/list..."
    QUEUES_RESPONSE=$(curl -s "$API_URL/api/queues/list" 2>/dev/null)
    QUEUE_COUNT_API=$(echo "$QUEUES_RESPONSE" | python3 -c "import json,sys; data=json.load(sys.stdin); print(len(data.get('data', [])))" 2>/dev/null)
    
    if [ "$QUEUE_COUNT_API" = "0" ] || [ -z "$QUEUE_COUNT_API" ]; then
        echo -e "   ${RED}✗ No retorna datos${NC}"
    else
        echo -e "   ${GREEN}✓ Retorna $QUEUE_COUNT_API cola(s)${NC}"
    fi
    
    # 2. Lista de agentes
    echo "2. Probando /api/agents/list..."
    AGENTS_RESPONSE=$(curl -s "$API_URL/api/agents/list" 2>/dev/null)
    AGENT_COUNT_API=$(echo "$AGENTS_RESPONSE" | python3 -c "import json,sys; data=json.load(sys.stdin); print(len(data.get('data', [])))" 2>/dev/null)
    
    if [ "$AGENT_COUNT_API" = "0" ] || [ -z "$AGENT_COUNT_API" ]; then
        echo -e "   ${RED}✗ No retorna datos${NC}"
    else
        echo -e "   ${GREEN}✓ Retorna $AGENT_COUNT_API agente(s)${NC}"
    fi
    
    # 3. Estadísticas de colas
    echo "3. Probando /api/queues/statistics?start_date=$QUERY_START&end_date=$QUERY_END..."
    STATS_RESPONSE=$(curl -s "$API_URL/api/queues/statistics?start_date=$QUERY_START&end_date=$QUERY_END" 2>/dev/null)
    STATS_COUNT=$(echo "$STATS_RESPONSE" | python3 -c "import json,sys; data=json.load(sys.stdin); print(len(data.get('data', [])))" 2>/dev/null)
    
    if [ "$STATS_COUNT" = "0" ] || [ -z "$STATS_COUNT" ]; then
        echo -e "   ${RED}✗ No retorna datos${NC}"
    else
        echo -e "   ${GREEN}✓ Retorna estadísticas de $STATS_COUNT cola(s)${NC}"
    fi
fi

echo ""

# ============================================================================
# 8. RECOMENDACIONES
# ============================================================================
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                      RECOMENDACIONES                             ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

if [ $TODAY_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠️  NO uses fecha de hoy en tus consultas${NC}"
    echo "   Usa fechas entre: $QUERY_START y $QUERY_END"
    echo ""
fi

echo "✓ Endpoints que DEBES usar (funcionan con queue_log):"
echo "  • /api/queues/list"
echo "  • /api/queues/statistics?start_date=$QUERY_START&end_date=$QUERY_END"
echo "  • /api/agents/list"
echo "  • /api/agents/statistics?start_date=$QUERY_START&end_date=$QUERY_END"
echo ""

echo "✗ Endpoints que NO debes usar (necesitan MySQL CDR):"
echo "  • /api/calls/list ← Tu error estaba aquí"
echo "  • /api/calls/statistics"
echo "  • /api/calls/hourly"
echo ""

echo "📝 Comandos de ejemplo:"
echo "  curl '$API_URL/api/queues/list'"
echo "  curl '$API_URL/api/queues/statistics?start_date=$QUERY_START&end_date=$QUERY_END'"
echo "  curl '$API_URL/api/agents/list'"
echo ""

rm -f /tmp/health.json 2>/dev/null

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                    VERIFICACIÓN COMPLETADA                       ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
