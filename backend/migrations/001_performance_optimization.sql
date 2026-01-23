-- =============================================================================
-- MIGRATION: Performance Optimization for Call Center Analytics
-- Purpose: Create indexed views for common queries to avoid reading 7M+ records
-- Database: asteriskcdrdb (192.168.3.2)
-- =============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS v_daily_call_summary;
DROP VIEW IF EXISTS v_hourly_call_distribution;
DROP VIEW IF EXISTS v_queue_statistics;
DROP VIEW IF EXISTS v_agent_statistics;
DROP VIEW IF EXISTS v_call_events_summary;

-- =============================================================================
-- 1. INDEXES on queue_log table for better query performance
-- =============================================================================
-- MariaDB compatible: Drop if exists, then create

-- Index on time column (most frequently filtered)
DROP INDEX IF EXISTS idx_queue_log_time ON queue_log;
CREATE INDEX idx_queue_log_time ON queue_log(time);

-- Index on event column (frequently filtered)
DROP INDEX IF EXISTS idx_queue_log_event ON queue_log;
CREATE INDEX idx_queue_log_event ON queue_log(event);

-- Index on queuename (frequently grouped)
DROP INDEX IF EXISTS idx_queue_log_queuename ON queue_log;
CREATE INDEX idx_queue_log_queuename ON queue_log(queuename);

-- Index on agent (frequently grouped)
DROP INDEX IF EXISTS idx_queue_log_agent ON queue_log;
CREATE INDEX idx_queue_log_agent ON queue_log(agent);

-- Composite index for date range queries with event filtering
DROP INDEX IF EXISTS idx_queue_log_time_event ON queue_log;
CREATE INDEX idx_queue_log_time_event ON queue_log(time, event);

-- Composite index for queue-specific queries
DROP INDEX IF EXISTS idx_queue_log_time_queue ON queue_log;
CREATE INDEX idx_queue_log_time_queue ON queue_log(time, queuename);

-- =============================================================================
-- 2. VIEW: Daily Call Summary
-- Purpose: Pre-aggregate daily statistics to avoid reading all records
-- =============================================================================

CREATE VIEW v_daily_call_summary AS
SELECT
    DATE(FROM_UNIXTIME(CAST(time AS UNSIGNED))) AS call_date,
    queuename,
    -- Total calls entered
    SUM(CASE WHEN event = 'ENTERQUEUE' THEN 1 ELSE 0 END) AS total_calls,
    -- Answered calls
    SUM(CASE WHEN event = 'CONNECT' THEN 1 ELSE 0 END) AS answered_calls,
    -- Abandoned calls
    SUM(CASE WHEN event = 'ABANDON' THEN 1 ELSE 0 END) AS abandoned_calls,
    -- Completed calls
    SUM(CASE WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') THEN 1 ELSE 0 END) AS completed_calls,
    -- Average talk time (from COMPLETEAGENT/COMPLETECALLER data field)
    AVG(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_talk_time,
    -- Total talk time
    SUM(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE 0
    END) AS total_talk_time,
    -- Average wait time (from CONNECT data field)
    AVG(CASE
        WHEN event = 'CONNECT' AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_wait_time,
    -- Max wait time
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
-- 3. VIEW: Hourly Call Distribution
-- Purpose: Pre-aggregate hourly statistics for trend analysis
-- =============================================================================

CREATE VIEW v_hourly_call_distribution AS
SELECT
    DATE(FROM_UNIXTIME(CAST(time AS UNSIGNED))) AS call_date,
    HOUR(FROM_UNIXTIME(CAST(time AS UNSIGNED))) AS call_hour,
    queuename,
    -- Total calls entered
    SUM(CASE WHEN event = 'ENTERQUEUE' THEN 1 ELSE 0 END) AS total_calls,
    -- Answered calls
    SUM(CASE WHEN event = 'CONNECT' THEN 1 ELSE 0 END) AS answered_calls,
    -- Missed calls (abandoned + timeout)
    SUM(CASE WHEN event IN ('ABANDON', 'EXITWITHTIMEOUT') THEN 1 ELSE 0 END) AS missed_calls,
    -- Average talk time
    AVG(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_duration,
    -- Average wait time
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
-- 4. VIEW: Queue Statistics
-- Purpose: Pre-aggregate queue-level statistics
-- =============================================================================

CREATE VIEW v_queue_statistics AS
SELECT
    queuename,
    DATE(FROM_UNIXTIME(CAST(time AS UNSIGNED))) AS call_date,
    -- Total calls
    SUM(CASE WHEN event = 'ENTERQUEUE' THEN 1 ELSE 0 END) AS total_calls,
    -- Answered calls
    SUM(CASE WHEN event = 'CONNECT' THEN 1 ELSE 0 END) AS answered_calls,
    -- Abandoned calls
    SUM(CASE WHEN event = 'ABANDON' THEN 1 ELSE 0 END) AS abandoned_calls,
    -- Average wait time
    AVG(CASE
        WHEN event = 'CONNECT' AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_wait_time,
    -- Max wait time
    MAX(CASE
        WHEN event = 'CONNECT' AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE 0
    END) AS max_wait_time,
    -- Min wait time (excluding 0)
    MIN(CASE
        WHEN event = 'CONNECT' AND data REGEXP '^[0-9]+$' AND CAST(data AS UNSIGNED) > 0
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS min_wait_time,
    -- Average talk time
    AVG(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_talk_time,
    -- Service Level (calls answered within 30 seconds)
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
-- 5. VIEW: Agent Statistics
-- Purpose: Pre-aggregate agent-level statistics
-- =============================================================================

CREATE VIEW v_agent_statistics AS
SELECT
    agent,
    DATE(FROM_UNIXTIME(CAST(time AS UNSIGNED))) AS call_date,
    -- Total calls connected
    SUM(CASE WHEN event = 'CONNECT' THEN 1 ELSE 0 END) AS total_calls,
    -- Completed calls
    SUM(CASE WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') THEN 1 ELSE 0 END) AS completed_calls,
    -- Total talk time
    SUM(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE 0
    END) AS total_talk_time,
    -- Average talk time
    AVG(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS avg_talk_time,
    -- Max talk time
    MAX(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$'
        THEN CAST(data AS UNSIGNED)
        ELSE 0
    END) AS max_talk_time,
    -- Min talk time (excluding 0)
    MIN(CASE
        WHEN event IN ('COMPLETEAGENT', 'COMPLETECALLER') AND data REGEXP '^[0-9]+$' AND CAST(data AS UNSIGNED) > 0
        THEN CAST(data AS UNSIGNED)
        ELSE NULL
    END) AS min_talk_time,
    -- Average wait before answer
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
-- 6. VIEW: Call Events Summary
-- Purpose: Pre-aggregate event type statistics for disposition reports
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
-- VERIFICATION QUERIES (Run after migration to verify)
-- =============================================================================

-- Test daily summary view
-- SELECT * FROM v_daily_call_summary WHERE call_date >= CURDATE() - INTERVAL 7 DAY;

-- Test hourly distribution view
-- SELECT * FROM v_hourly_call_distribution WHERE call_date = CURDATE();

-- Test queue statistics view
-- SELECT * FROM v_queue_statistics WHERE call_date >= CURDATE() - INTERVAL 7 DAY ORDER BY queuename, call_date DESC;

-- Test agent statistics view
-- SELECT * FROM v_agent_statistics WHERE call_date = CURDATE() ORDER BY total_calls DESC LIMIT 10;

-- Test events summary view
-- SELECT * FROM v_call_events_summary WHERE call_date = CURDATE();

-- Check index usage
-- SHOW INDEX FROM queue_log;

-- =============================================================================
-- NOTES:
-- 1. All views filter data to last 90-180 days to keep view queries fast
-- 2. For historical data beyond 180 days, use archived reports or fallback to original queries
-- 3. Views are automatically updated as new data arrives in queue_log
-- 4. Indexes will speed up both view queries and original queries
-- 5. Consider running OPTIMIZE TABLE queue_log after creating indexes
-- =============================================================================
