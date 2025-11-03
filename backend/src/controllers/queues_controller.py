# controllers/queues_controller.py - VERSIÓN CORREGIDA v2
from datetime import datetime
from config.database import db
from config.settings import settings
from typing import List, Optional
import logging
from utils.queue_log_parser import queue_log_parser

logger = logging.getLogger(__name__)


class QueuesController:

    def get_available_queues(self) -> List[dict]:
        """
        Obtiene la lista de colas disponibles desde queue_log
        """
        try:
            queues = queue_log_parser.get_available_queues()
            logger.info(f"Found {len(queues)} queues")
            return queues
        except Exception as e:
            logger.error(f"Error getting available queues: {e}", exc_info=True)
            # Retornar lista vacía en caso de error
            return []

    def get_queue_statistics(self, start_date: str, end_date: str,
                             queue_name: Optional[str] = None) -> List[dict]:
        """
        Estadisticas detalladas por cola desde queue_log
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            stats = queue_log_parser.get_queue_statistics(start_dt, end_dt, queue_name)
            logger.info(f"Queue statistics: {len(stats)} results")
            return stats
        except Exception as e:
            logger.error(f"Error getting queue statistics: {e}", exc_info=True)
            return []

    def get_queue_events_timeline(self, start_date: str, end_date: str,
                                  queue_name: str) -> List[dict]:
        """
        Timeline de eventos de una cola especifica
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            records = queue_log_parser.read_log(start_dt, end_dt, queue_name)

            # Convertir datetime a string para JSON serialization
            results = []
            for record in records[:1000]:  # Limitar a 1000 registros
                results.append({
                    'time': record['time'].isoformat(),  # Convertir a string
                    'callid': record['callid'],
                    'queuename': record['queuename'],
                    'agent': record['agent'],
                    'event': record['event'],
                    'data1': record['data1'],
                    'data2': record['data2'],
                    'data3': record['data3']
                })

            return results
        except Exception as e:
            logger.error(f"Error getting queue events: {e}", exc_info=True)
            return []

    def get_queue_performance_by_hour(self, start_date: str, end_date: str,
                                      queue_name: Optional[str] = None) -> List[dict]:
        """
        Performance de colas por hora
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            records = queue_log_parser.read_log(start_dt, end_dt, queue_name)

            # Agrupar por cola y hora
            hourly_stats = {}

            for record in records:
                queue = record['queuename']
                if not queue or queue == 'NONE':
                    continue

                hour = record['time'].hour
                key = (queue, hour)

                if key not in hourly_stats:
                    hourly_stats[key] = {
                        'queuename': queue,
                        'hour': hour,
                        'calls_entered': 0,
                        'calls_answered': 0,
                        'calls_abandoned': 0,
                        'wait_times': []
                    }

                event = record['event']
                if event == 'ENTERQUEUE':
                    hourly_stats[key]['calls_entered'] += 1
                elif event == 'CONNECT':
                    hourly_stats[key]['calls_answered'] += 1
                    if record['data1'] and str(record['data1']).isdigit():
                        hourly_stats[key]['wait_times'].append(int(record['data1']))
                elif event == 'ABANDON':
                    hourly_stats[key]['calls_abandoned'] += 1

            # Calcular promedios
            results = []
            for (queue, hour), stats in hourly_stats.items():
                entered = stats['calls_entered']
                answered = stats['calls_answered']
                answer_rate = (answered / entered * 100) if entered > 0 else 0
                avg_wait = sum(stats['wait_times']) / len(stats['wait_times']) if stats['wait_times'] else 0

                results.append({
                    'queuename': queue,
                    'hour': hour,
                    'calls_entered': entered,
                    'calls_answered': answered,
                    'calls_abandoned': stats['calls_abandoned'],
                    'answer_rate': round(answer_rate, 2),
                    'avg_wait_time': round(avg_wait, 2)
                })

            return sorted(results, key=lambda x: (x['queuename'], x['hour']))
        except Exception as e:
            logger.error(f"Error getting hourly performance: {e}", exc_info=True)
            return []

    def get_realtime_queue_status(self) -> List[dict]:
        """
        Estado actual de las colas en tiempo real (ultimos 5 minutos)
        """
        try:
            status = queue_log_parser.get_realtime_queue_status(minutes=5)
            logger.info(f"Realtime queue status: {len(status)} queues")
            return status
        except Exception as e:
            logger.error(f"Error getting realtime status: {e}", exc_info=True)
            return []


queues_controller = QueuesController()