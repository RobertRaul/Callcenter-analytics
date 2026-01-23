# services/optimized_stats_service.py
"""
Servicio optimizado para consultas de estadísticas usando vistas de MySQL
Este servicio reemplaza las consultas que leen millones de registros
"""

import pymysql
from datetime import datetime, date
from typing import List, Dict, Optional
import logging
from functools import lru_cache
import hashlib
import json

logger = logging.getLogger(__name__)

class OptimizedStatsService:
    """
    Servicio que usa vistas MySQL pre-agregadas para obtener estadísticas
    sin leer millones de registros en memoria Python
    """

    def __init__(self):
        self.cache_ttl = 300  # 5 minutos de cache

    def _get_connection(self):
        """Obtiene conexión a MySQL"""
        from config.settings import settings

        return pymysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER_QUEUELOG,
            password=settings.DB_PASSWORD_QUEUELOG,
            database=settings.DB_NAME_CDR,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )

    def _generate_cache_key(self, method_name: str, **kwargs) -> str:
        """Genera clave de cache basada en método y parámetros"""
        params_str = json.dumps(kwargs, sort_keys=True, default=str)
        return f"{method_name}:{hashlib.md5(params_str.encode()).hexdigest()}"

    def get_daily_summary_optimized(self, start_date: str, end_date: str,
                                    queue: Optional[str] = None) -> List[Dict]:
        """
        Obtiene resumen diario usando vista v_daily_call_summary
        MUCHO más rápido que leer todos los registros
        """
        try:
            connection = self._get_connection()

            query = """
                SELECT
                    call_date AS date,
                    COALESCE(SUM(total_calls), 0) AS total_calls,
                    COALESCE(SUM(answered_calls), 0) AS answered_calls,
                    COALESCE(SUM(abandoned_calls), 0) AS abandoned_calls,
                    COALESCE(AVG(avg_talk_time), 0) AS avg_duration,
                    COALESCE(SUM(total_talk_time), 0) AS total_duration
                FROM v_daily_call_summary
                WHERE call_date BETWEEN %s AND %s
            """
            params = [start_date, end_date]

            if queue:
                query += " AND queuename = %s"
                params.append(queue)

            query += " GROUP BY call_date ORDER BY call_date DESC"

            with connection.cursor() as cursor:
                cursor.execute(query, params)
                results = cursor.fetchall()

            connection.close()

            # Formatear resultados
            formatted_results = []
            for row in results:
                formatted_results.append({
                    'date': str(row['date']),
                    'total_calls': int(row['total_calls']),
                    'answered_calls': int(row['answered_calls']),
                    'missed_calls': int(row['total_calls'] - row['answered_calls']),
                    'avg_duration': round(float(row['avg_duration'] or 0), 2),
                    'total_duration': int(row['total_duration'] or 0)
                })

            logger.info(f"✓ Daily summary retrieved from view (fast query): {len(formatted_results)} days")
            return formatted_results

        except Exception as e:
            logger.error(f"Error getting optimized daily summary: {e}", exc_info=True)
            return []

    def get_hourly_distribution_optimized(self, start_date: str, end_date: str) -> List[Dict]:
        """
        Obtiene distribución horaria usando vista v_hourly_call_distribution
        """
        try:
            connection = self._get_connection()

            query = """
                SELECT
                    call_hour AS hour,
                    COALESCE(SUM(total_calls), 0) AS total_calls,
                    COALESCE(SUM(answered_calls), 0) AS answered_calls,
                    COALESCE(SUM(missed_calls), 0) AS missed_calls,
                    COALESCE(AVG(avg_duration), 0) AS avg_duration,
                    COALESCE(AVG(avg_wait_time), 0) AS avg_wait_time
                FROM v_hourly_call_distribution
                WHERE call_date BETWEEN %s AND %s
                GROUP BY call_hour
                ORDER BY call_hour
            """

            with connection.cursor() as cursor:
                cursor.execute(query, [start_date, end_date])
                results = cursor.fetchall()

            connection.close()

            # Formatear resultados
            formatted_results = []
            for row in results:
                formatted_results.append({
                    'hour': int(row['hour']),
                    'total_calls': int(row['total_calls']),
                    'answered_calls': int(row['answered_calls']),
                    'missed_calls': int(row['missed_calls']),
                    'avg_duration': round(float(row['avg_duration'] or 0), 2),
                    'avg_wait_time': round(float(row['avg_wait_time'] or 0), 2)
                })

            logger.info(f"✓ Hourly distribution retrieved from view: {len(formatted_results)} hours")
            return formatted_results

        except Exception as e:
            logger.error(f"Error getting optimized hourly distribution: {e}", exc_info=True)
            return []

    def get_call_statistics_optimized(self, start_date: str, end_date: str,
                                     queue: Optional[str] = None) -> Dict:
        """
        Obtiene estadísticas generales usando vistas
        Evita leer millones de registros
        """
        try:
            connection = self._get_connection()

            # Query 1: Totales desde daily summary view
            query_totals = """
                SELECT
                    COALESCE(SUM(total_calls), 0) AS total_calls,
                    COALESCE(SUM(answered_calls), 0) AS answered_calls,
                    COALESCE(SUM(abandoned_calls), 0) AS abandoned_calls,
                    COALESCE(SUM(total_talk_time), 0) AS total_duration,
                    COALESCE(AVG(avg_talk_time), 0) AS avg_duration
                FROM v_daily_call_summary
                WHERE call_date BETWEEN %s AND %s
            """
            params = [start_date, end_date]

            if queue:
                query_totals += " AND queuename = %s"
                params.append(queue)

            # Query 2: Wait times desde queue statistics view
            query_wait = """
                SELECT
                    COALESCE(AVG(avg_wait_time), 0) AS avg_wait_time,
                    COALESCE(MAX(max_wait_time), 0) AS max_wait_time,
                    COALESCE(MIN(min_wait_time), 0) AS min_wait_time
                FROM v_queue_statistics
                WHERE call_date BETWEEN %s AND %s
            """
            params_wait = [start_date, end_date]

            if queue:
                query_wait += " AND queuename = %s"
                params_wait.append(queue)

            # Query 3: Max talk time desde agent statistics
            query_max_talk = """
                SELECT COALESCE(MAX(max_talk_time), 0) AS max_talk_time
                FROM v_agent_statistics
                WHERE call_date BETWEEN %s AND %s
            """

            with connection.cursor() as cursor:
                # Ejecutar query de totales
                cursor.execute(query_totals, params)
                totals = cursor.fetchone()

                # Ejecutar query de wait times
                cursor.execute(query_wait, params_wait)
                wait_stats = cursor.fetchone()

                # Ejecutar query de max talk time
                cursor.execute(query_max_talk, [start_date, end_date])
                max_talk = cursor.fetchone()

            connection.close()

            # Calcular answer rate
            total_calls = int(totals['total_calls'])
            answered_calls = int(totals['answered_calls'])
            answer_rate = (answered_calls / total_calls * 100) if total_calls > 0 else 0

            result = {
                'total_calls': total_calls,
                'answered_calls': answered_calls,
                'abandoned_calls': int(totals['abandoned_calls']),
                'total_duration': int(totals['total_duration'] or 0),
                'avg_duration': round(float(totals['avg_duration'] or 0), 2),
                'avg_wait_time': round(float(wait_stats['avg_wait_time'] or 0), 2),
                'max_wait_time': int(wait_stats['max_wait_time'] or 0),
                'min_wait_time': int(wait_stats['min_wait_time'] or 0),
                'max_talk_time': int(max_talk['max_talk_time'] or 0),
                'answer_rate': round(answer_rate, 2)
            }

            logger.info(f"✓ Call statistics retrieved from views (ultra fast)")
            return result

        except Exception as e:
            logger.error(f"Error getting optimized call statistics: {e}", exc_info=True)
            return {
                'total_calls': 0,
                'answered_calls': 0,
                'abandoned_calls': 0,
                'total_duration': 0,
                'avg_duration': 0,
                'avg_wait_time': 0,
                'max_wait_time': 0,
                'min_wait_time': 0,
                'max_talk_time': 0,
                'answer_rate': 0
            }

    def get_queue_statistics_optimized(self, start_date: str, end_date: str,
                                      queue_name: Optional[str] = None) -> List[Dict]:
        """
        Obtiene estadísticas por cola usando vista v_queue_statistics
        """
        try:
            connection = self._get_connection()

            query = """
                SELECT
                    queuename AS queue_name,
                    COALESCE(SUM(total_calls), 0) AS total_calls,
                    COALESCE(SUM(answered_calls), 0) AS answered_calls,
                    COALESCE(SUM(abandoned_calls), 0) AS abandoned_calls,
                    COALESCE(AVG(avg_wait_time), 0) AS avg_wait_time,
                    COALESCE(MAX(max_wait_time), 0) AS max_wait_time,
                    COALESCE(MIN(min_wait_time), 0) AS min_wait_time,
                    COALESCE(AVG(avg_talk_time), 0) AS avg_talk_time,
                    COALESCE(SUM(answered_within_30s), 0) AS answered_within_30s
                FROM v_queue_statistics
                WHERE call_date BETWEEN %s AND %s
            """
            params = [start_date, end_date]

            if queue_name:
                query += " AND queuename = %s"
                params.append(queue_name)

            query += " GROUP BY queuename ORDER BY total_calls DESC"

            with connection.cursor() as cursor:
                cursor.execute(query, params)
                results = cursor.fetchall()

            connection.close()

            # Formatear resultados
            formatted_results = []
            for row in results:
                total = int(row['total_calls'])
                answered = int(row['answered_calls'])
                answered_fast = int(row['answered_within_30s'])

                answer_rate = (answered / total * 100) if total > 0 else 0
                abandon_rate = ((total - answered) / total * 100) if total > 0 else 0
                service_level = (answered_fast / answered * 100) if answered > 0 else 0

                formatted_results.append({
                    'queue_name': row['queue_name'],
                    'total_calls': total,
                    'answered_calls': answered,
                    'abandoned_calls': int(row['abandoned_calls']),
                    'avg_wait_time': round(float(row['avg_wait_time'] or 0), 2),
                    'max_wait_time': int(row['max_wait_time'] or 0),
                    'min_wait_time': int(row['min_wait_time'] or 0),
                    'avg_talk_time': round(float(row['avg_talk_time'] or 0), 2),
                    'service_level': round(service_level, 2),
                    'answer_rate': round(answer_rate, 2),
                    'abandon_rate': round(abandon_rate, 2)
                })

            logger.info(f"✓ Queue statistics retrieved from view: {len(formatted_results)} queues")
            return formatted_results

        except Exception as e:
            logger.error(f"Error getting optimized queue statistics: {e}", exc_info=True)
            return []

    def get_agent_statistics_optimized(self, start_date: str, end_date: str,
                                      agent: Optional[str] = None) -> List[Dict]:
        """
        Obtiene estadísticas por agente usando vista v_agent_statistics
        """
        try:
            connection = self._get_connection()

            query = """
                SELECT
                    agent,
                    COALESCE(SUM(total_calls), 0) AS total_calls,
                    COALESCE(SUM(completed_calls), 0) AS completed_calls,
                    COALESCE(SUM(total_talk_time), 0) AS total_talk_time,
                    COALESCE(AVG(avg_talk_time), 0) AS avg_talk_time,
                    COALESCE(MAX(max_talk_time), 0) AS max_talk_time,
                    COALESCE(MIN(min_talk_time), 0) AS min_talk_time,
                    COALESCE(AVG(avg_wait_before_answer), 0) AS avg_wait_before_answer
                FROM v_agent_statistics
                WHERE call_date BETWEEN %s AND %s
            """
            params = [start_date, end_date]

            if agent:
                query += " AND agent LIKE %s"
                params.append(f'%{agent}%')

            query += " GROUP BY agent ORDER BY total_calls DESC"

            with connection.cursor() as cursor:
                cursor.execute(query, params)
                results = cursor.fetchall()

            connection.close()

            # Formatear resultados
            formatted_results = []
            for row in results:
                agent_name = row['agent']
                agent_ext = agent_name.split('/')[-1] if '/' in agent_name else agent_name
                total_talk = int(row['total_talk_time'] or 0)

                # Formatear tiempo total
                hours = total_talk // 3600
                minutes = (total_talk % 3600) // 60
                seconds = total_talk % 60

                formatted_results.append({
                    'agent': agent_ext,
                    'agent_full': agent_name,
                    'total_calls': int(row['total_calls']),
                    'completed_calls': int(row['completed_calls']),
                    'total_talk_time': total_talk,
                    'total_talk_time_formatted': f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}",
                    'avg_talk_time': round(float(row['avg_talk_time'] or 0), 2),
                    'max_talk_time': int(row['max_talk_time'] or 0),
                    'min_talk_time': int(row['min_talk_time'] or 0),
                    'avg_wait_before_answer': round(float(row['avg_wait_before_answer'] or 0), 2)
                })

            logger.info(f"✓ Agent statistics retrieved from view: {len(formatted_results)} agents")
            return formatted_results

        except Exception as e:
            logger.error(f"Error getting optimized agent statistics: {e}", exc_info=True)
            return []

    def get_disposition_summary_optimized(self, start_date: str, end_date: str) -> List[Dict]:
        """
        Obtiene resumen de eventos usando vista v_call_events_summary
        """
        try:
            connection = self._get_connection()

            query = """
                SELECT
                    event,
                    COALESCE(SUM(event_count), 0) AS count
                FROM v_call_events_summary
                WHERE call_date BETWEEN %s AND %s
                GROUP BY event
                ORDER BY count DESC
            """

            with connection.cursor() as cursor:
                cursor.execute(query, [start_date, end_date])
                results = cursor.fetchall()

            connection.close()

            # Mapeo de eventos a español
            event_translations = {
                'ENTERQUEUE': 'Llamada Entrante',
                'CONNECT': 'Llamada Conectada',
                'COMPLETEAGENT': 'Finalizada por Agente',
                'COMPLETECALLER': 'Finalizada por Cliente',
                'RINGNOANSWER': 'Sin Respuesta',
                'RINGCANCELED': 'Llamada Cancelada',
                'ABANDON': 'Abandonada',
                'EXITWITHTIMEOUT': 'Timeout en Cola',
                'EXITWITHKEY': 'Salida por Teclado',
                'TRANSFER': 'Transferida',
                'BLINDTRANSFER': 'Transferencia Ciega',
                'ATTENDEDTRANSFER': 'Transferencia Atendida'
            }

            # Calcular porcentajes
            total_events = sum(int(row['count']) for row in results)
            formatted_results = []

            for row in results:
                count = int(row['count'])
                percentage = (count / total_events * 100) if total_events > 0 else 0

                formatted_results.append({
                    'disposition': event_translations.get(row['event'], row['event']),
                    'count': count,
                    'percentage': round(percentage, 2)
                })

            logger.info(f"✓ Disposition summary retrieved from view: {len(formatted_results)} event types")
            return formatted_results

        except Exception as e:
            logger.error(f"Error getting optimized disposition summary: {e}", exc_info=True)
            return []

    def check_views_available(self) -> bool:
        """
        Verifica si las vistas optimizadas están disponibles
        """
        try:
            connection = self._get_connection()

            required_views = [
                'v_daily_call_summary',
                'v_hourly_call_distribution',
                'v_queue_statistics',
                'v_agent_statistics',
                'v_call_events_summary'
            ]

            with connection.cursor() as cursor:
                cursor.execute("SHOW TABLES LIKE 'v_%'")
                existing_views = [row[list(row.keys())[0]] for row in cursor.fetchall()]

            connection.close()

            available_views = [v for v in required_views if v in existing_views]
            missing_views = [v for v in required_views if v not in existing_views]

            if missing_views:
                logger.warning(f"Missing optimized views: {missing_views}")
                logger.info("Run migration: mysql -h 192.168.3.2 -u asteriskuser -p asteriskcdrdb < migrations/001_performance_optimization.sql")
                return False

            logger.info(f"✓ All optimized views available: {len(available_views)}/{len(required_views)}")
            return True

        except Exception as e:
            logger.error(f"Error checking views availability: {e}")
            return False


# Instancia global
optimized_stats_service = OptimizedStatsService()
