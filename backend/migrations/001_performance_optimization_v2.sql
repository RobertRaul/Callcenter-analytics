-- =============================================================================
-- MIGRATION: Performance Optimization for Call Center Analytics
-- Compatible con MariaDB 5.5
-- =============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS v_daily_call_summary;
DROP VIEW IF EXISTS v_hourly_call_distribution;
DROP VIEW IF EXISTS v_queue_statistics;
DROP VIEW IF EXISTS v_agent_statistics;
DROP VIEW IF EXISTS v_call_events_summary;

-- =============================================================================
-- INDEXES: Los creamos solo si no existen (se ignoran errores si ya existen)
-- =============================================================================

-- =============================================================================
-- VIEW 1: Daily Call Summary
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
WHERE CAST(time AS UNSIGNED) > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 180 DAY))
GROUP BY call_date, queuename
ORDER BY call_date DESC, queuename;

-- =============================================================================
-- VIEW 2: Hourly Call Distribution
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
WHERE CAST(time AS UNSIGNED) > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 90 DAY))
GROUP BY call_date, call_hour, queuename
ORDER BY call_date DESC, call_hour, queuename;

-- =============================================================================
-- VIEW 3: Queue Statistics
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
WHERE CAST(time AS UNSIGNED) > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 180 DAY))
  AND queuename IS NOT NULL
  AND queuename != 'NONE'
GROUP BY queuename, call_date
ORDER BY call_date DESC, queuename;

-- =============================================================================
-- VIEW 4: Agent Statistics
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
WHERE CAST(time AS UNSIGNED) > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 180 DAY))
  AND agent IS NOT NULL
  AND agent != 'NONE'
  AND event IN ('CONNECT', 'COMPLETEAGENT', 'COMPLETECALLER')
GROUP BY agent, call_date
ORDER BY call_date DESC, agent;

-- =============================================================================
-- VIEW 5: Call Events Summary
-- =============================================================================

CREATE VIEW v_call_events_summary AS
SELECT
    DATE(FROM_UNIXTIME(CAST(time AS UNSIGNED))) AS call_date,
    event,
    queuename,
    COUNT(*) AS event_count
FROM queue_log
WHERE CAST(time AS UNSIGNED) > UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 90 DAY))
  AND event IN (
    'ENTERQUEUE', 'CONNECT', 'COMPLETEAGENT', 'COMPLETECALLER',
    'ABANDON', 'EXITWITHTIMEOUT', 'EXITWITHKEY', 'RINGNOANSWER',
    'RINGCANCELED', 'TRANSFER', 'BLINDTRANSFER', 'ATTENDEDTRANSFER'
  )
GROUP BY call_date, event, queuename
ORDER BY call_date DESC, event;

-- =============================================================================
-- DONE: Views created successfully
-- =============================================================================
