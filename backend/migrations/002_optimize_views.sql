-- =============================================================================
-- Optimización de vistas para mejor performance
-- Problema: CAST(time AS UNSIGNED) impide uso de índices
-- Solución: Usar comparación directa de strings con formato de timestamp
-- =============================================================================

DROP VIEW IF EXISTS v_daily_call_summary;
DROP VIEW IF EXISTS v_hourly_call_distribution;
DROP VIEW IF EXISTS v_queue_statistics;
DROP VIEW IF EXISTS v_agent_statistics;
DROP VIEW IF EXISTS v_call_events_summary;

-- Calcular timestamp de hace 180 días para usar en vistas
SET @cutoff_180 = UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 180 DAY));
SET @cutoff_90 = UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 90 DAY));

-- =============================================================================
-- VIEW 1: Daily Call Summary (últimos 30 días para mejor performance)
-- =============================================================================

CREATE VIEW v_daily_call_summary AS
SELECT
    DATE(FROM_UNIXTIME(CAST(time AS UNSIGNED))) AS call_date,
    queuename,
    SUM(CASE WHEN event = 'ENTERQUEUE' THEN 1 ELSE 0 END) AS total_calls,
    SUM(CASE WHEN event = 'CONNECT' THEN 1 ELSE 0 END) AS answered_calls,
    SUM(CASE WHEN event = 'ABANDON' THEN 1 ELSE 0 END) AS abandoned_calls,
    SUM(CASE WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') THEN 1 ELSE 0 END) AS completed_calls,
    AVG(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_talk_time,
    SUM(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE 0
    END) AS total_talk_time,
    AVG(CASE
        WHEN event = 'CONNECT' AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_wait_time,
    MAX(CASE
        WHEN event = 'CONNECT' AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE 0
    END) AS max_wait_time
FROM queue_log
WHERE time >= CAST(UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 DAY)) AS CHAR)
GROUP BY call_date, queuename;

-- =============================================================================
-- VIEW 2: Hourly Call Distribution (últimos 7 días)
-- =============================================================================

CREATE VIEW v_hourly_call_distribution AS
SELECT
    DATE(FROM_UNIXTIME(CAST(time AS UNSIGNED))) AS call_date,
    HOUR(FROM_UNIXTIME(CAST(time AS UNSIGNED))) AS call_hour,
    queuename,
    SUM(CASE WHEN event = 'ENTERQUEUE' THEN 1 ELSE 0 END) AS total_calls,
    SUM(CASE WHEN event = 'CONNECT' THEN 1 ELSE 0 END) AS answered_calls,
    SUM(CASE WHEN event IN ('ABANDON', 'EXITWITHTIMEOUT') THEN 1 ELSE 0 END) AS missed_calls,
    AVG(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_duration,
    AVG(CASE
        WHEN event = 'CONNECT' AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_wait_time
FROM queue_log
WHERE time >= CAST(UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 7 DAY)) AS CHAR)
GROUP BY call_date, call_hour, queuename;

-- =============================================================================
-- VIEW 3: Queue Statistics (últimos 30 días)
-- =============================================================================

CREATE VIEW v_queue_statistics AS
SELECT
    queuename,
    DATE(FROM_UNIXTIME(CAST(time AS UNSIGNED))) AS call_date,
    SUM(CASE WHEN event = 'ENTERQUEUE' THEN 1 ELSE 0 END) AS total_calls,
    SUM(CASE WHEN event = 'CONNECT' THEN 1 ELSE 0 END) AS answered_calls,
    SUM(CASE WHEN event = 'ABANDON' THEN 1 ELSE 0 END) AS abandoned_calls,
    AVG(CASE
        WHEN event = 'CONNECT' AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_wait_time,
    MAX(CASE
        WHEN event = 'CONNECT' AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE 0
    END) AS max_wait_time,
    MIN(CASE
        WHEN event = 'CONNECT' AND data REGEXP '^[0-9]+$' AND CAST(data AS UNSIGNED) > 0
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS min_wait_time,
    AVG(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_talk_time,
    SUM(CASE
        WHEN event = 'CONNECT' AND data REGEXP '^[0-9]+$' AND CAST(data AS UNSIGNED) <= 30
        THEN 1
        ELSE 0
    END) AS answered_within_30s
FROM queue_log
WHERE time >= CAST(UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 DAY)) AS CHAR)
  AND queuename IS NOT NULL
  AND queuename != 'NONE'
GROUP BY queuename, call_date;

-- =============================================================================
-- VIEW 4: Agent Statistics (últimos 30 días)
-- =============================================================================

CREATE VIEW v_agent_statistics AS
SELECT
    agent,
    DATE(FROM_UNIXTIME(CAST(time AS UNSIGNED))) AS call_date,
    SUM(CASE WHEN event = 'CONNECT' THEN 1 ELSE 0 END) AS total_calls,
    SUM(CASE WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') THEN 1 ELSE 0 END) AS completed_calls,
    SUM(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE 0
    END) AS total_talk_time,
    AVG(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_talk_time,
    MAX(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE 0
    END) AS max_talk_time,
    MIN(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$' AND CAST(data AS UNSIGNED) > 0
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS min_talk_time,
    AVG(CASE
        WHEN event = 'CONNECT' AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_wait_before_answer
FROM queue_log
WHERE time >= CAST(UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 DAY)) AS CHAR)
  AND agent IS NOT NULL
  AND agent != 'NONE'
  AND event IN ('CONNECT', 'COMPLETEAGENT', 'COMPLETECALLER')
GROUP BY agent, call_date;

-- =============================================================================
-- VIEW 5: Call Events Summary (últimos 7 días)
-- =============================================================================

CREATE VIEW v_call_events_summary AS
SELECT
    DATE(FROM_UNIXTIME(CAST(time AS UNSIGNED))) AS call_date,
    event,
    queuename,
    COUNT(*) AS event_count
FROM queue_log
WHERE time >= CAST(UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 7 DAY)) AS CHAR)
  AND event IN (
    'ENTERQUEUE', 'CONNECT', 'COMPLETEAGENT', 'COMPLETECALLER',
    'ABANDON', 'EXITWITHTIMEOUT', 'EXITWITHKEY', 'RINGNOANSWER',
    'RINGCANCELED', 'TRANSFER', 'BLINDTRANSFER', 'ATTENDEDTRANSFER'
  )
GROUP BY call_date, event, queuename;

-- =============================================================================
-- DONE: Vistas optimizadas creadas con filtros de fecha más agresivos
-- =============================================================================
