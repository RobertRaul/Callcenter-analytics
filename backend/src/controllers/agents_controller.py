from datetime import datetime, timedelta
from config.database import db
from config.settings import settings
from typing import List, Optional
import logging
from utils.queue_log_parser import queue_log_parser

logger = logging.getLogger(__name__)


class AgentsController:

    def get_available_agents(self) -> List[dict]:
        """
        Obtiene la lista de agentes disponibles desde queue_log
        """
        try:
            # Obtener agentes de los últimos 7 días
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)

            records = queue_log_parser.read_log(start_date, end_date)

            agents_dict = {}
            for record in records:
                agent_name = record['agent']
                if not agent_name or agent_name == 'NONE':
                    continue

                agent_ext = agent_name.split('/')[-1] if '/' in agent_name else agent_name

                if agent_ext not in agents_dict:
                    agents_dict[agent_ext] = {
                        'agent': agent_ext,
                        'agent_full': agent_name,
                        'queues': set()
                    }

                queue = record['queuename']
                if queue and queue != 'NONE':
                    agents_dict[agent_ext]['queues'].add(queue)

            # Convertir a lista
            results = []
            for agent_ext, data in agents_dict.items():
                results.append({
                    'agent': agent_ext,
                    'agent_full': data['agent_full'],
                    'queues': list(data['queues'])
                })

            logger.info(f"Found {len(results)} agents")
            return sorted(results, key=lambda x: x['agent'])
        except Exception as e:
            logger.error(f"Error getting available agents: {e}", exc_info=True)
            return []

    def get_agent_statistics(self, start_date: str, end_date: str,
                             agent: Optional[str] = None) -> List[dict]:
        """
        Estadisticas detalladas por agente desde queue_log
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            stats = queue_log_parser.get_agent_statistics(start_dt, end_dt, agent)
            logger.info(f"Agent statistics: {len(stats)} results")
            return stats
        except Exception as e:
            logger.error(f"Error getting agent statistics: {e}", exc_info=True)
            return []

    def get_agent_performance_by_queue(self, agent: str, start_date: str, end_date: str) -> List[dict]:
        """
        Performance de un agente especifico por cola
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            records = queue_log_parser.read_log(start_dt, end_dt)

            # Filtrar por agente y agrupar por cola
            queue_stats = {}

            for record in records:
                agent_name = record['agent']
                if not agent_name or agent_name == 'NONE':
                    continue

                agent_ext = agent_name.split('/')[-1] if '/' in agent_name else agent_name
                if agent not in agent_ext:
                    continue

                queue = record['queuename']
                if not queue or queue == 'NONE':
                    continue

                if queue not in queue_stats:
                    queue_stats[queue] = {
                        'queue_name': queue,
                        'calls_answered': 0,
                        'talk_times': [],
                        'wait_times': []
                    }

                event = record['event']
                if event == 'CONNECT':
                    queue_stats[queue]['calls_answered'] += 1
                    if record['data1'] and str(record['data1']).isdigit():
                        queue_stats[queue]['wait_times'].append(int(record['data1']))
                elif event in ['COMPLETEAGENT', 'COMPLETECALLER']:
                    if record['data2'] and str(record['data2']).isdigit():
                        queue_stats[queue]['talk_times'].append(int(record['data2']))

            # Calcular estadísticas
            results = []
            for queue_name, stats in queue_stats.items():
                total_talk = sum(stats['talk_times'])
                avg_talk = total_talk / len(stats['talk_times']) if stats['talk_times'] else 0
                avg_wait = sum(stats['wait_times']) / len(stats['wait_times']) if stats['wait_times'] else 0

                results.append({
                    'queue_name': queue_name,
                    'calls_answered': stats['calls_answered'],
                    'total_talk_time': total_talk,
                    'avg_talk_time': round(avg_talk, 2),
                    'avg_wait_time': round(avg_wait, 2)
                })

            return sorted(results, key=lambda x: x['calls_answered'], reverse=True)
        except Exception as e:
            logger.error(f"Error getting agent performance by queue: {e}", exc_info=True)
            return []

    def get_agent_hourly_performance(self, start_date: str, end_date: str,
                                     agent: Optional[str] = None) -> List[dict]:
        """
        Performance por hora del dia
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            records = queue_log_parser.read_log(start_dt, end_dt)

            # Agrupar por agente y hora
            hourly_stats = {}

            for record in records:
                agent_name = record['agent']
                if not agent_name or agent_name == 'NONE':
                    continue

                agent_ext = agent_name.split('/')[-1] if '/' in agent_name else agent_name

                # Filtrar por agente si se especifica
                if agent and agent not in agent_ext:
                    continue

                hour = record['time'].hour
                key = (agent_ext, hour)

                if key not in hourly_stats:
                    hourly_stats[key] = {
                        'agent': agent_ext,
                        'hour': hour,
                        'calls_answered': 0,
                        'talk_times': []
                    }

                event = record['event']
                if event == 'CONNECT':
                    hourly_stats[key]['calls_answered'] += 1
                elif event in ['COMPLETEAGENT', 'COMPLETECALLER']:
                    if record['data2'] and str(record['data2']).isdigit():
                        hourly_stats[key]['talk_times'].append(int(record['data2']))

            # Calcular promedios
            results = []
            for (agent_ext, hour), stats in hourly_stats.items():
                avg_talk = sum(stats['talk_times']) / len(stats['talk_times']) if stats['talk_times'] else 0

                results.append({
                    'agent': agent_ext,
                    'hour': hour,
                    'calls_answered': stats['calls_answered'],
                    'avg_talk_time': round(avg_talk, 2)
                })

            return sorted(results, key=lambda x: (x['agent'], x['hour']))
        except Exception as e:
            logger.error(f"Error getting hourly performance: {e}", exc_info=True)
            return []

    def get_agent_call_history(self, start_date: str, end_date: str,
                               agent: str, limit: int = 100) -> List[dict]:
        """
        Historial de llamadas de un agente
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            records = queue_log_parser.read_log(start_dt, end_dt)

            # Filtrar eventos del agente
            agent_events = []
            for record in records:
                agent_name = record['agent']
                if not agent_name or agent_name == 'NONE':
                    continue

                agent_ext = agent_name.split('/')[-1] if '/' in agent_name else agent_name
                if agent not in agent_ext:
                    continue

                if record['event'] in ['CONNECT', 'COMPLETEAGENT', 'COMPLETECALLER', 'TRANSFER']:
                    agent_events.append({
                        'time': record['time'].isoformat(),  # Convertir a string
                        'callid': record['callid'],
                        'queuename': record['queuename'],
                        'event': record['event'],
                        'wait_time': record['data1'],
                        'talk_time': record['data2'],
                        'position': record['data3']
                    })

            # Ordenar por fecha descendente y limitar
            agent_events.sort(key=lambda x: x['time'], reverse=True)
            return agent_events[:limit]
        except Exception as e:
            logger.error(f"Error getting agent call history: {e}", exc_info=True)
            return []

    def get_realtime_agent_status(self) -> List[dict]:
        """
        Estado actual de los agentes (ultimos 30 minutos)
        """
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(minutes=30)

            records = queue_log_parser.read_log(start_date, end_date)

            # Obtener último estado de cada agente
            agents_status = {}

            for record in records:
                agent_name = record['agent']
                if not agent_name or agent_name == 'NONE':
                    continue

                agent_ext = agent_name.split('/')[-1] if '/' in agent_name else agent_name

                # Actualizar con el evento más reciente
                if agent_ext not in agents_status or record['time'] > agents_status[agent_ext]['last_activity']:
                    last_event = record['event']

                    # Determinar estado
                    if last_event == 'CONNECT':
                        status = 'IN_CALL'
                    elif last_event in ('COMPLETEAGENT', 'COMPLETECALLER'):
                        status = 'AVAILABLE'
                    elif last_event == 'PAUSE':
                        status = 'PAUSED'
                    elif last_event == 'ADDMEMBER':
                        status = 'AVAILABLE'
                    elif last_event == 'REMOVEMEMBER':
                        status = 'UNAVAILABLE'
                    else:
                        status = 'UNKNOWN'

                    agents_status[agent_ext] = {
                        'agent': agent_ext,
                        'status': status,
                        'queue': record['queuename'],
                        'last_activity': record['time'],
                        'last_event': last_event
                    }

            # Convertir datetime a string para JSON
            results = []
            for agent_ext, data in agents_status.items():
                results.append({
                    'agent': data['agent'],
                    'status': data['status'],
                    'queue': data['queue'],
                    'last_activity': data['last_activity'].isoformat(),
                    'last_event': data['last_event']
                })

            return sorted(results, key=lambda x: x['agent'])
        except Exception as e:
            logger.error(f"Error getting realtime agent status: {e}", exc_info=True)
            return []

    def get_agent_comparison(self, start_date: str, end_date: str) -> List[dict]:
        """
        Comparacion de performance entre agentes
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            stats = queue_log_parser.get_agent_statistics(start_dt, end_dt)

            # Calcular rankings y eficiencia
            if stats:
                max_calls = max([s.get('total_calls', 0) for s in stats]) if stats else 1

                for i, row in enumerate(stats, 1):
                    row['rank'] = i
                    calls = row.get('total_calls', 0) or 0
                    row['efficiency'] = round((calls / max_calls * 100) if max_calls > 0 else 0, 2)

            return stats
        except Exception as e:
            logger.error(f"Error getting agent comparison: {e}", exc_info=True)
            return []


agents_controller = AgentsController()