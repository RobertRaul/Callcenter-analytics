#!/bin/bash
# Script para crear índices en MariaDB 5.5 ignorando errores si ya existen

DB_HOST="192.168.3.2"
DB_USER="asteriskuser"
DB_PASS="aul"
DB_NAME="asteriskcdrdb"

echo "Creando índices en queue_log..."
echo "Esto puede tomar 5-10 minutos con 8.5M registros..."
echo ""

# Función para crear índice ignorando error si ya existe
create_index() {
    local index_name=$1
    local columns=$2

    echo -n "Creando $index_name... "
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "CREATE INDEX $index_name ON queue_log($columns);" 2>/dev/null

    if [ $? -eq 0 ]; then
        echo "✓"
    else
        # Verificar si el error fue porque ya existe
        EXISTS=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW INDEX FROM queue_log WHERE Key_name='$index_name';" 2>/dev/null | wc -l)
        if [ $EXISTS -gt 1 ]; then
            echo "✓ (ya existía)"
        else
            echo "✗ ERROR"
            return 1
        fi
    fi
}

# Crear índices uno por uno
create_index "idx_queue_log_time" "time"
create_index "idx_queue_log_event" "event"
create_index "idx_queue_log_queuename" "queuename"
create_index "idx_queue_log_agent" "agent"
create_index "idx_queue_log_time_event" "time, event"
create_index "idx_queue_log_time_queue" "time, queuename"

echo ""
echo "Índices creados correctamente."
echo ""

# Mostrar índices
echo "Índices en queue_log:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW INDEX FROM queue_log;" 2>/dev/null | grep -E "idx_queue_log" | awk '{print "  - " $3}'

echo ""
echo "✓ Proceso completado"
