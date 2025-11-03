# controllers/calls_controller.py
from datetime import datetime, timedelta
from typing import List, Optional
import logging
from utils.queue_log_parser import queue_log_parser

logger = logging.getLogger(__name__)

class CallsController:

    def get_calls_by_date_range(self, start_date: str, end_date: str,
                                 queue: Optional[str] = None) -> List[dict]:
        """
        Obtiene todas las llamadas en un rango de fechas desde queue_log con información detallada
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            # Leer registros del queue_log
            records = queue_log_parser.read_log(start_dt, end_dt, queue)

            # Agrupar por callid para obtener información completa de cada llamada
            calls_dict = {}

            for record in records:
                callid = record['callid']
                event = record['event']
                queuename = record['queuename']
                agent = record['agent']

                if callid not in calls_dict:
                    calls_dict[callid] = {
                        'callid': callid,
                        'calldate': record['time'].isoformat(),
                        'queuename': queuename,
                        'agent': 'N/A',
                        'agent_full': 'N/A',
                        'phone_number': 'N/A',
                        'status': 'UNKNOWN',
                        'wait_time': 0,
                        'talk_time': 0,
                        'total_time': 0,
                        'enter_time': None,
                        'connect_time': None,
                        'complete_time': None,
                        'position_in_queue': 'N/A',
                        'has_recording': False
                    }

                # Actualizar información según el evento
                if event == 'ENTERQUEUE':
                    calls_dict[callid]['enter_time'] = record['time'].isoformat()
                    # Extraer número telefónico del data2
                    if record['data2']:
                        calls_dict[callid]['phone_number'] = record['data2']
                    # data3 es la posición en cola
                    if record['data3']:
                        calls_dict[callid]['position_in_queue'] = record['data3']
                    if calls_dict[callid]['status'] == 'UNKNOWN':
                        calls_dict[callid]['status'] = 'ENTERED'

                elif event == 'CONNECT':
                    calls_dict[callid]['connect_time'] = record['time'].isoformat()
                    calls_dict[callid]['agent'] = agent.split('/')[-1] if '/' in agent else agent
                    calls_dict[callid]['agent_full'] = agent
                    calls_dict[callid]['status'] = 'ANSWERED'
                    if record['data1'] and record['data1'].isdigit():
                        calls_dict[callid]['wait_time'] = int(record['data1'])

                elif event in ['COMPLETEAGENT', 'COMPLETECALLER']:
                    calls_dict[callid]['complete_time'] = record['time'].isoformat()
                    calls_dict[callid]['status'] = 'COMPLETED'
                    if record['data1'] and record['data1'].isdigit():
                        calls_dict[callid]['wait_time'] = int(record['data1'])
                    if record['data2'] and record['data2'].isdigit():
                        calls_dict[callid]['talk_time'] = int(record['data2'])

                elif event == 'ABANDON':
                    calls_dict[callid]['status'] = 'ABANDONED'
                    if record['data1'] and record['data1'].isdigit():
                        calls_dict[callid]['position_in_queue'] = record['data1']
                    if record['data2'] and record['data2'].isdigit():
                        calls_dict[callid]['wait_time'] = int(record['data2'])

                elif event == 'EXITWITHTIMEOUT':
                    calls_dict[callid]['status'] = 'TIMEOUT'
                    if record['data2'] and record['data2'].isdigit():
                        calls_dict[callid]['wait_time'] = int(record['data2'])

                elif event == 'EXITWITHKEY':
                    calls_dict[callid]['status'] = 'EXITED_WITH_KEY'

            # Calcular tiempo total
            for call in calls_dict.values():
                call['total_time'] = call['wait_time'] + call['talk_time']
                # Formatear tiempos
                call['wait_time_formatted'] = f"{call['wait_time'] // 60}m {call['wait_time'] % 60}s"
                call['talk_time_formatted'] = f"{call['talk_time'] // 60}m {call['talk_time'] % 60}s"
                call['total_time_formatted'] = f"{call['total_time'] // 60}m {call['total_time'] % 60}s"

            # Convertir a lista y ordenar por fecha descendente
            results = list(calls_dict.values())
            results.sort(key=lambda x: x['calldate'], reverse=True)

            return results[:1000]  # Limitar a 1000 llamadas
        except Exception as e:
            logger.error(f"Error getting calls by date range: {e}", exc_info=True)
            return []
    
    def get_call_statistics(self, start_date: str, end_date: str,
                           queue: Optional[str] = None) -> dict:
        """
        Obtiene estadísticas generales de llamadas desde queue_log
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            # Usar el método de estadísticas del parser
            queue_stats = queue_log_parser.get_queue_statistics(start_dt, end_dt, queue)

            # Consolidar estadísticas de todas las colas
            total_calls = 0
            answered_calls = 0
            abandoned_calls = 0
            all_wait_times = []
            all_talk_times = []

            for stat in queue_stats:
                total_calls += stat.get('total_calls', 0)
                answered_calls += stat.get('answered_calls', 0)
                abandoned_calls += stat.get('abandoned_calls', 0)

            # Leer registros para calcular tiempos
            records = queue_log_parser.read_log(start_dt, end_dt, queue)
            for record in records:
                if record['event'] == 'CONNECT' and record['data1'] and record['data1'].isdigit():
                    all_wait_times.append(int(record['data1']))
                if record['event'] in ['COMPLETEAGENT', 'COMPLETECALLER'] and record['data2'] and record['data2'].isdigit():
                    all_talk_times.append(int(record['data2']))

            # Calcular estadísticas
            avg_wait = sum(all_wait_times) / len(all_wait_times) if all_wait_times else 0
            max_wait = max(all_wait_times) if all_wait_times else 0
            min_wait = min(all_wait_times) if all_wait_times else 0
            avg_talk = sum(all_talk_times) / len(all_talk_times) if all_talk_times else 0
            max_talk = max(all_talk_times) if all_talk_times else 0
            total_duration = sum(all_talk_times)
            answer_rate = (answered_calls / total_calls * 100) if total_calls > 0 else 0

            return {
                'total_calls': total_calls,
                'answered_calls': answered_calls,
                'abandoned_calls': abandoned_calls,
                'total_duration': total_duration,
                'avg_duration': round(avg_talk, 2),
                'avg_wait_time': round(avg_wait, 2),
                'max_wait_time': max_wait,
                'min_wait_time': min_wait,
                'max_talk_time': max_talk,
                'answer_rate': round(answer_rate, 2)
            }
        except Exception as e:
            logger.error(f"Error getting call statistics: {e}", exc_info=True)
            return {
                'total_calls': 0,
                'answered_calls': 0,
                'abandoned_calls': 0,
                'total_duration': 0,
                'avg_duration': 0,
                'avg_wait_time': 0,
                'answer_rate': 0
            }
    
    def get_hourly_distribution(self, start_date: str, end_date: str) -> List[dict]:
        """
        Distribución de llamadas por hora del día desde queue_log
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            records = queue_log_parser.read_log(start_dt, end_dt)

            # Agrupar por hora
            hourly_stats = {}

            for record in records:
                hour = record['time'].hour
                event = record['event']

                if hour not in hourly_stats:
                    hourly_stats[hour] = {
                        'hour': hour,
                        'total_calls': 0,
                        'answered_calls': 0,
                        'missed_calls': 0,
                        'talk_times': [],
                        'wait_times': []
                    }

                if event == 'ENTERQUEUE':
                    hourly_stats[hour]['total_calls'] += 1
                elif event == 'CONNECT':
                    hourly_stats[hour]['answered_calls'] += 1
                    # data1 contiene el tiempo de espera
                    if record['data1'] and record['data1'].isdigit():
                        hourly_stats[hour]['wait_times'].append(int(record['data1']))
                elif event == 'ABANDON':
                    hourly_stats[hour]['missed_calls'] += 1
                elif event in ['COMPLETEAGENT', 'COMPLETECALLER']:
                    if record['data2'] and record['data2'].isdigit():
                        hourly_stats[hour]['talk_times'].append(int(record['data2']))

            # Calcular promedios
            results = []
            for hour, stats in hourly_stats.items():
                avg_duration = sum(stats['talk_times']) / len(stats['talk_times']) if stats['talk_times'] else 0
                avg_wait = sum(stats['wait_times']) / len(stats['wait_times']) if stats['wait_times'] else 0
                results.append({
                    'hour': hour,
                    'total_calls': stats['total_calls'],
                    'answered_calls': stats['answered_calls'],
                    'missed_calls': stats['missed_calls'],
                    'avg_duration': round(avg_duration, 2),
                    'avg_wait_time': round(avg_wait, 2)
                })

            return sorted(results, key=lambda x: x['hour'])
        except Exception as e:
            logger.error(f"Error getting hourly distribution: {e}", exc_info=True)
            return []
    
    def get_daily_summary(self, start_date: str, end_date: str) -> List[dict]:
        """
        Resumen diario de llamadas desde queue_log
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            records = queue_log_parser.read_log(start_dt, end_dt)

            # Agrupar por fecha
            daily_stats = {}

            for record in records:
                date = record['time'].date()
                event = record['event']

                if date not in daily_stats:
                    daily_stats[date] = {
                        'date': str(date),
                        'total_calls': 0,
                        'answered_calls': 0,
                        'missed_calls': 0,
                        'talk_times': []
                    }

                if event == 'ENTERQUEUE':
                    daily_stats[date]['total_calls'] += 1
                elif event == 'CONNECT':
                    daily_stats[date]['answered_calls'] += 1
                elif event == 'ABANDON':
                    daily_stats[date]['missed_calls'] += 1
                elif event in ['COMPLETEAGENT', 'COMPLETECALLER']:
                    if record['data2'] and record['data2'].isdigit():
                        daily_stats[date]['talk_times'].append(int(record['data2']))

            # Calcular estadísticas
            results = []
            for date, stats in daily_stats.items():
                total_duration = sum(stats['talk_times'])
                avg_duration = total_duration / len(stats['talk_times']) if stats['talk_times'] else 0
                results.append({
                    'date': stats['date'],
                    'total_calls': stats['total_calls'],
                    'answered_calls': stats['answered_calls'],
                    'missed_calls': stats['missed_calls'],
                    'avg_duration': round(avg_duration, 2),
                    'total_duration': total_duration
                })

            return sorted(results, key=lambda x: x['date'], reverse=True)
        except Exception as e:
            logger.error(f"Error getting daily summary: {e}", exc_info=True)
            return []
    
    def get_disposition_summary(self, start_date: str, end_date: str) -> List[dict]:
        """
        Resumen por tipo de evento desde queue_log
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            records = queue_log_parser.read_log(start_dt, end_dt)

            # Contar eventos
            event_counts = {}
            total_events = 0

            for record in records:
                event = record['event']
                if event not in event_counts:
                    event_counts[event] = 0
                event_counts[event] += 1
                total_events += 1

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
                'ATTENDEDTRANSFER': 'Transferencia Atendida',
                'DID': 'Número Marcado',
                'ADDMEMBER': 'Agente Agregado',
                'REMOVEMEMBER': 'Agente Removido',
                'PAUSE': 'Agente en Pausa',
                'UNPAUSE': 'Agente Activo',
                'AGENTDUMP': 'Agente Desconectado',
                'SYSCOMPAT': 'Compatibilidad Sistema',
                'CONFIGRELOAD': 'Recarga de Configuración',
                'QUEUESTART': 'Inicio de Cola'
            }

            # Calcular porcentajes
            results = []
            for event, count in event_counts.items():
                percentage = (count / total_events * 100) if total_events > 0 else 0
                results.append({
                    'disposition': event_translations.get(event, event),
                    'count': count,
                    'percentage': round(percentage, 2)
                })

            return sorted(results, key=lambda x: x['count'], reverse=True)
        except Exception as e:
            logger.error(f"Error getting disposition summary: {e}", exc_info=True)
            return []

    def get_calls_by_agent(self, start_date: str, end_date: str,
                           agent: Optional[str] = None) -> dict:
        """
        Obtiene llamadas agrupadas por agente con detalles completos
        """
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)

            records = queue_log_parser.read_log(start_dt, end_dt)

            # Agrupar llamadas por agente
            agents_calls = {}

            for record in records:
                if record['event'] not in ['CONNECT', 'COMPLETEAGENT', 'COMPLETECALLER']:
                    continue

                agent_name = record['agent']
                if not agent_name or agent_name == 'NONE':
                    continue

                agent_ext = agent_name.split('/')[-1] if '/' in agent_name else agent_name

                # Filtrar por agente si se especifica
                if agent and agent not in agent_ext:
                    continue

                if agent_ext not in agents_calls:
                    agents_calls[agent_ext] = {
                        'agent': agent_ext,
                        'agent_full': agent_name,
                        'total_calls': 0,
                        'completed_calls': 0,
                        'total_talk_time': 0,
                        'total_wait_time': 0,
                        'avg_talk_time': 0,
                        'avg_wait_time': 0,
                        'calls': []
                    }

                call_info = {
                    'callid': record['callid'],
                    'queuename': record['queuename'],
                    'time': record['time'].isoformat(),
                    'event': record['event'],
                    'wait_time': 0,
                    'talk_time': 0
                }

                if record['event'] == 'CONNECT':
                    agents_calls[agent_ext]['total_calls'] += 1
                    if record['data1'] and record['data1'].isdigit():
                        wait_time = int(record['data1'])
                        call_info['wait_time'] = wait_time
                        agents_calls[agent_ext]['total_wait_time'] += wait_time

                elif record['event'] in ['COMPLETEAGENT', 'COMPLETECALLER']:
                    agents_calls[agent_ext]['completed_calls'] += 1
                    if record['data1'] and record['data1'].isdigit():
                        wait_time = int(record['data1'])
                        call_info['wait_time'] = wait_time
                        agents_calls[agent_ext]['total_wait_time'] += wait_time
                    if record['data2'] and record['data2'].isdigit():
                        talk_time = int(record['data2'])
                        call_info['talk_time'] = talk_time
                        agents_calls[agent_ext]['total_talk_time'] += talk_time

                # Formatear tiempos
                call_info['wait_time_formatted'] = f"{call_info['wait_time'] // 60}m {call_info['wait_time'] % 60}s"
                call_info['talk_time_formatted'] = f"{call_info['talk_time'] // 60}m {call_info['talk_time'] % 60}s"

                agents_calls[agent_ext]['calls'].append(call_info)

            # Calcular promedios y formatear
            for agent_data in agents_calls.values():
                total_calls = agent_data['total_calls']
                if total_calls > 0:
                    agent_data['avg_wait_time'] = round(agent_data['total_wait_time'] / total_calls, 2)
                    agent_data['avg_talk_time'] = round(agent_data['total_talk_time'] / total_calls, 2)

                # Formatear tiempos totales
                hours = agent_data['total_talk_time'] // 3600
                minutes = (agent_data['total_talk_time'] % 3600) // 60
                seconds = agent_data['total_talk_time'] % 60
                agent_data['total_talk_time_formatted'] = f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}"

                # Ordenar llamadas por fecha descendente
                agent_data['calls'].sort(key=lambda x: x['time'], reverse=True)

            # Convertir a lista y ordenar por total de llamadas
            results = list(agents_calls.values())
            results.sort(key=lambda x: x['total_calls'], reverse=True)

            return {
                'total_agents': len(results),
                'agents': results
            }
        except Exception as e:
            logger.error(f"Error getting calls by agent: {e}", exc_info=True)
            return {
                'total_agents': 0,
                'agents': []
            }

calls_controller = CallsController()
