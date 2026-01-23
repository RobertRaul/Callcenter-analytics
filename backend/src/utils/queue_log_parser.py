# utils/queue_log_parser.py
"""
Parser para queue_log de Asterisk desde MySQL
Migrado de lectura de archivo a tabla MySQL asteriskcdrdb.queue_log
Mantiene fallback a archivo /var/log/asterisk/queue_log si MySQL no disponible
"""

import os
import pymysql
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class QueueLogParser:
    """
    Parser para queue_log de Asterisk
    Lee desde tabla MySQL asteriskcdrdb.queue_log (prioritario)
    Fallback a archivo /var/log/asterisk/queue_log si MySQL falla

    Formato MySQL:
    - time: varchar(26) - Unix timestamp
    - callid: varchar(32)
    - queuename: varchar(32)
    - agent: varchar(32)
    - event: varchar(32)
    - data1-data5: varchar(100)
    """

    def __init__(self, log_file_path: str = "/var/log/asterisk/queue_log"):
        self.log_file_path = log_file_path
        self.use_mysql = True
        self.mysql_available = self._test_mysql_connection()

        if self.mysql_available:
            logger.info("✓ Queue log parser usando MySQL asteriskcdrdb.queue_log")
        else:
            logger.warning(f"⚠ MySQL no disponible, usando archivo fallback: {log_file_path}")
            self.use_mysql = False

    def _test_mysql_connection(self) -> bool:
        """Prueba la conexión a MySQL y tabla queue_log"""
        try:
            from config.settings import settings

            connection = pymysql.connect(
                host=settings.DB_HOST,
                port=settings.DB_PORT,
                user=settings.DB_USER_QUEUELOG,
                password=settings.DB_PASSWORD_QUEUELOG,
                database=settings.DB_NAME_CDR,
                charset='utf8mb4',
                cursorclass=pymysql.cursors.DictCursor
            )

            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) as count FROM queue_log LIMIT 1")
                result = cursor.fetchone()
                logger.info(f"✓ Conexión exitosa a MySQL queue_log (registros disponibles)")

            connection.close()
            return True
        except Exception as e:
            logger.warning(f"MySQL queue_log no disponible: {e}")
            return False

    def _get_mysql_connection(self):
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

    def _parse_mysql_record(self, record: Dict) -> Optional[Dict]:
        """
        Parsea un registro de MySQL a formato estándar
        IMPORTANTE: La tabla MySQL de Issabel tiene estructura diferente al archivo:
        - Tiene campo extra 'data' con información crítica
        - CONNECT: data=wait_time, data1=callid, data2=???
        - COMPLETEAGENT: data=talk_time, data1=wait_time, data2=1
        - ABANDON: data=position, data1=position, data2=wait_time
        """
        try:
            # Convertir timestamp string a int
            timestamp = int(record['time'])
            event = record['event']

            # Mapear campos según el evento para compatibilidad con archivo queue_log
            # En archivo: timestamp|callid|queue|agent|event|data1|data2|data3|data4|data5
            # En MySQL Issabel: hay campo 'data' adicional con info importante

            if event == 'CONNECT':
                # MySQL: data=wait_time, data1=callid_extra, data2=???
                # Archivo espera: data1=wait_time
                data1 = record.get('data', '') or ''  # ← CORRECCIÓN: usar 'data' como wait_time
                data2 = record.get('data1', '') or ''
                data3 = record.get('data2', '') or ''
                data4 = record.get('data3', '') or ''
                data5 = record.get('data4', '') or ''

            elif event in ['COMPLETEAGENT', 'COMPLETECALLER']:
                # MySQL: data=talk_time, data1=wait_time, data2=1
                # Archivo espera: data1=wait_time, data2=talk_time
                data1 = record.get('data1', '') or ''  # wait_time OK
                data2 = record.get('data', '') or ''   # ← CORRECCIÓN: usar 'data' como talk_time
                data3 = record.get('data2', '') or ''
                data4 = record.get('data3', '') or ''
                data5 = record.get('data4', '') or ''

            elif event == 'ABANDON':
                # MySQL: data=position, data1=position, data2=wait_time
                # Archivo espera: data1=position, data2=wait_time, data3=holdtime
                data1 = record.get('data', '') or ''   # position
                data2 = record.get('data2', '') or ''  # wait_time OK
                data3 = record.get('data1', '') or ''
                data4 = record.get('data3', '') or ''
                data5 = record.get('data4', '') or ''

            elif event == 'ENTERQUEUE':
                # MySQL: data=???, data1=callerid, data2=???, data3=position
                # Archivo espera: data1=callerid_url, data2=callerid_num, data3=position
                data1 = record.get('data', '') or ''
                data2 = record.get('data1', '') or ''
                data3 = record.get('data2', '') or ''
                data4 = record.get('data3', '') or ''
                data5 = record.get('data4', '') or ''

            else:
                # Para otros eventos, mapeo directo
                data1 = record.get('data', '') or ''
                data2 = record.get('data1', '') or ''
                data3 = record.get('data2', '') or ''
                data4 = record.get('data3', '') or ''
                data5 = record.get('data4', '') or ''

            return {
                'time': datetime.fromtimestamp(timestamp),
                'timestamp': timestamp,
                'callid': record['callid'],
                'queuename': record['queuename'],
                'agent': record['agent'],
                'event': event,
                'data1': data1,
                'data2': data2,
                'data3': data3,
                'data4': data4,
                'data5': data5
            }
        except Exception as e:
            logger.error(f"Error parsing MySQL record: {record} - {e}")
            return None

    def parse_line(self, line: str) -> Optional[Dict]:
        """
        Parsea una línea del queue_log de archivo
        Formato: timestamp|callid|queue|agent|event|data1|data2|data3|data4|data5
        SOLO usado en fallback mode
        """
        try:
            parts = line.strip().split('|')
            if len(parts) < 5:
                return None

            # Extender parts para tener siempre 10 elementos
            while len(parts) < 10:
                parts.append('')

            timestamp = int(parts[0])

            return {
                'time': datetime.fromtimestamp(timestamp),
                'timestamp': timestamp,
                'callid': parts[1],
                'queuename': parts[2],
                'agent': parts[3],
                'event': parts[4],
                'data1': parts[5] if len(parts) > 5 else '',
                'data2': parts[6] if len(parts) > 6 else '',
                'data3': parts[7] if len(parts) > 7 else '',
                'data4': parts[8] if len(parts) > 8 else '',
                'data5': parts[9] if len(parts) > 9 else ''
            }
        except Exception as e:
            logger.error(f"Error parsing line: {line} - {e}")
            return None

    def read_log(self, start_date: Optional[datetime] = None,
                 end_date: Optional[datetime] = None,
                 queue_name: Optional[str] = None,
                 events: Optional[List[str]] = None) -> List[Dict]:
        """
        Lee registros de queue_log con filtros opcionales
        Usa MySQL si está disponible, sino usa archivo
        """
        if self.use_mysql and self.mysql_available:
            return self._read_from_mysql(start_date, end_date, queue_name, events)
        else:
            return self._read_from_file(start_date, end_date, queue_name, events)

    def _read_from_mysql(self, start_date: Optional[datetime] = None,
                         end_date: Optional[datetime] = None,
                         queue_name: Optional[str] = None,
                         events: Optional[List[str]] = None) -> List[Dict]:
        """
        Lee registros desde MySQL con filtros
        """
        try:
            connection = self._get_mysql_connection()
            records = []

            # Construir query con filtros
            # IMPORTANTE: Incluir campo 'data' de Issabel que contiene info crítica
            query = "SELECT time, callid, queuename, agent, event, data, data1, data2, data3, data4, data5 FROM queue_log WHERE 1=1"
            params = []

            # Filtro por fecha
            if start_date:
                start_ts = int(start_date.timestamp())
                query += " AND CAST(time AS UNSIGNED) >= %s"
                params.append(start_ts)

            if end_date:
                end_ts = int(end_date.timestamp())
                query += " AND CAST(time AS UNSIGNED) <= %s"
                params.append(end_ts)

            # Filtro por cola
            if queue_name:
                query += " AND queuename = %s"
                params.append(queue_name)

            # Filtro por eventos
            if events:
                placeholders = ','.join(['%s'] * len(events))
                query += f" AND event IN ({placeholders})"
                params.extend(events)

            # Ordenar por tiempo
            query += " ORDER BY CAST(time AS UNSIGNED) ASC"

            with connection.cursor() as cursor:
                cursor.execute(query, params)
                mysql_records = cursor.fetchall()

                for mysql_record in mysql_records:
                    record = self._parse_mysql_record(mysql_record)
                    if record:
                        records.append(record)

            connection.close()
            logger.info(f"✓ Read {len(records)} records from MySQL queue_log")
            return records

        except Exception as e:
            logger.error(f"Error reading from MySQL, switching to file fallback: {e}")
            self.use_mysql = False
            return self._read_from_file(start_date, end_date, queue_name, events)

    def _read_from_file(self, start_date: Optional[datetime] = None,
                        end_date: Optional[datetime] = None,
                        queue_name: Optional[str] = None,
                        events: Optional[List[str]] = None) -> List[Dict]:
        """
        Lee registros desde archivo (FALLBACK MODE)
        """
        if not os.path.exists(self.log_file_path):
            logger.error(f"Queue log file not found: {self.log_file_path}")
            return []

        records = []
        start_ts = start_date.timestamp() if start_date else 0
        end_ts = end_date.timestamp() if end_date else float('inf')

        try:
            with open(self.log_file_path, 'r') as f:
                for line in f:
                    record = self.parse_line(line)
                    if not record:
                        continue

                    # Filtrar por fecha
                    if record['timestamp'] < start_ts or record['timestamp'] > end_ts:
                        continue

                    # Filtrar por cola
                    if queue_name and record['queuename'] != queue_name:
                        continue

                    # Filtrar por eventos
                    if events and record['event'] not in events:
                        continue

                    records.append(record)

            logger.info(f"Read {len(records)} records from file queue_log (FALLBACK)")
            return records

        except Exception as e:
            logger.error(f"Error reading queue_log file: {e}")
            return []

    def get_available_queues(self) -> List[Dict]:
        """
        Obtiene lista de colas disponibles
        Lee solo los últimos 30 días para mejor performance
        """
        queues_dict = {}

        # Leer solo últimos 30 días en lugar de todo el historial
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        records = self.read_log(start_date, end_date)
        for record in records:
            queue = record['queuename']
            if queue and queue != 'NONE':
                if queue not in queues_dict:
                    queues_dict[queue] = {
                        'queue_name': queue,
                        'total_calls': 0,
                        'agents': set()
                    }

                if record['event'] == 'ENTERQUEUE':
                    queues_dict[queue]['total_calls'] += 1

                if record['agent'] and record['agent'] != 'NONE':
                    queues_dict[queue]['agents'].add(record['agent'])

        # Convertir sets a counts
        result = []
        for queue_name, data in queues_dict.items():
            result.append({
                'queue_name': queue_name,
                'total_agents': len(data['agents'])
            })

        return sorted(result, key=lambda x: x['queue_name'])

    def get_queue_statistics(self, start_date: datetime, end_date: datetime,
                            queue_name: Optional[str] = None) -> List[Dict]:
        """
        Calcula estadísticas por cola
        """
        records = self.read_log(start_date, end_date, queue_name)

        # Agrupar por cola
        queues_stats = {}
        call_waits = {}  # Para calcular tiempos de espera por call

        for record in records:
            queue = record['queuename']
            if not queue or queue == 'NONE':
                continue

            if queue not in queues_stats:
                queues_stats[queue] = {
                    'queue_name': queue,
                    'total_calls': 0,
                    'answered_calls': 0,
                    'abandoned_calls': 0,
                    'wait_times': [],
                    'talk_times': []
                }

            event = record['event']
            callid = record['callid']

            # Conteo de llamadas
            if event == 'ENTERQUEUE':
                queues_stats[queue]['total_calls'] += 1

            elif event == 'CONNECT':
                queues_stats[queue]['answered_calls'] += 1
                # data1 es el tiempo de espera en segundos
                if record['data1'] and record['data1'].isdigit():
                    wait_time = int(record['data1'])
                    queues_stats[queue]['wait_times'].append(wait_time)

            elif event == 'ABANDON':
                queues_stats[queue]['abandoned_calls'] += 1

            elif event in ['COMPLETEAGENT', 'COMPLETECALLER']:
                # data2 es el tiempo de conversación en segundos
                if record['data2'] and record['data2'].isdigit():
                    talk_time = int(record['data2'])
                    queues_stats[queue]['talk_times'].append(talk_time)

        # Calcular promedios
        results = []
        for queue_name, stats in queues_stats.items():
            total = stats['total_calls']
            answered = stats['answered_calls']

            avg_wait = sum(stats['wait_times']) / len(stats['wait_times']) if stats['wait_times'] else 0
            max_wait = max(stats['wait_times']) if stats['wait_times'] else 0
            min_wait = min(stats['wait_times']) if stats['wait_times'] else 0
            avg_talk = sum(stats['talk_times']) / len(stats['talk_times']) if stats['talk_times'] else 0

            # Service Level (< 30 segundos)
            answered_fast = sum(1 for w in stats['wait_times'] if w <= 30)
            service_level = (answered_fast / answered * 100) if answered > 0 else 0

            answer_rate = (answered / total * 100) if total > 0 else 0
            abandon_rate = (stats['abandoned_calls'] / total * 100) if total > 0 else 0

            results.append({
                'queue_name': queue_name,
                'total_calls': total,
                'answered_calls': answered,
                'abandoned_calls': stats['abandoned_calls'],
                'avg_wait_time': round(avg_wait, 2),
                'max_wait_time': max_wait,
                'min_wait_time': min_wait,
                'avg_talk_time': round(avg_talk, 2),
                'service_level': round(service_level, 2),
                'answer_rate': round(answer_rate, 2),
                'abandon_rate': round(abandon_rate, 2)
            })

        return results

    def get_agent_statistics(self, start_date: datetime, end_date: datetime,
                            agent: Optional[str] = None) -> List[Dict]:
        """
        Calcula estadísticas por agente
        """
        records = self.read_log(start_date, end_date)

        agents_stats = {}

        for record in records:
            agent_name = record['agent']
            if not agent_name or agent_name == 'NONE':
                continue

            # Filtrar por agente específico si se proporciona
            if agent and agent not in agent_name:
                continue

            # Extraer extensión del agente (ej: "SIP/201" -> "201")
            agent_ext = agent_name.split('/')[-1] if '/' in agent_name else agent_name

            if agent_ext not in agents_stats:
                agents_stats[agent_ext] = {
                    'agent': agent_ext,
                    'agent_full': agent_name,
                    'total_calls': 0,
                    'completed_calls': 0,
                    'talk_times': [],
                    'wait_times': []
                }

            event = record['event']

            if event == 'CONNECT':
                agents_stats[agent_ext]['total_calls'] += 1
                if record['data1'] and record['data1'].isdigit():
                    wait_time = int(record['data1'])
                    agents_stats[agent_ext]['wait_times'].append(wait_time)

            elif event in ['COMPLETEAGENT', 'COMPLETECALLER']:
                agents_stats[agent_ext]['completed_calls'] += 1
                if record['data2'] and record['data2'].isdigit():
                    talk_time = int(record['data2'])
                    agents_stats[agent_ext]['talk_times'].append(talk_time)

        # Calcular estadísticas
        results = []
        for agent_ext, stats in agents_stats.items():
            total_talk = sum(stats['talk_times'])
            avg_talk = total_talk / len(stats['talk_times']) if stats['talk_times'] else 0
            max_talk = max(stats['talk_times']) if stats['talk_times'] else 0
            min_talk = min(stats['talk_times']) if stats['talk_times'] else 0
            avg_wait = sum(stats['wait_times']) / len(stats['wait_times']) if stats['wait_times'] else 0

            # Formatear tiempo total
            hours = total_talk // 3600
            minutes = (total_talk % 3600) // 60
            seconds = total_talk % 60

            results.append({
                'agent': agent_ext,
                'agent_full': stats['agent_full'],
                'total_calls': stats['total_calls'],
                'completed_calls': stats['completed_calls'],
                'total_talk_time': total_talk,
                'total_talk_time_formatted': f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}",
                'avg_talk_time': round(avg_talk, 2),
                'max_talk_time': max_talk,
                'min_talk_time': min_talk,
                'avg_wait_before_answer': round(avg_wait, 2)
            })

        return sorted(results, key=lambda x: x['total_calls'], reverse=True)

    def get_realtime_queue_status(self, minutes: int = 5) -> List[Dict]:
        """
        Estado en tiempo real de las últimas X minutos
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(minutes=minutes)

        records = self.read_log(start_date, end_date)

        queues_status = {}

        for record in records:
            queue = record['queuename']
            if not queue or queue == 'NONE':
                continue

            if queue not in queues_status:
                queues_status[queue] = {
                    'queue_name': queue,
                    'calls_entered': 0,
                    'calls_answered': 0,
                    'calls_abandoned': 0,
                    'agents': set()
                }

            event = record['event']

            if event == 'ENTERQUEUE':
                queues_status[queue]['calls_entered'] += 1
            elif event == 'CONNECT':
                queues_status[queue]['calls_answered'] += 1
            elif event == 'ABANDON':
                queues_status[queue]['calls_abandoned'] += 1
            elif event in ['ADDMEMBER', 'CONNECT', 'COMPLETEAGENT', 'COMPLETECALLER']:
                if record['agent'] and record['agent'] != 'NONE':
                    queues_status[queue]['agents'].add(record['agent'])

        # Convertir a lista
        results = []
        for queue_name, stats in queues_status.items():
            entered = stats['calls_entered']
            answered = stats['calls_answered']
            service_level = (answered / entered * 100) if entered > 0 else 0

            results.append({
                'queue_name': queue_name,
                'calls_waiting': 0,  # No disponible desde archivo
                'available_agents': len(stats['agents']),
                'calls_completed_5min': answered,
                'calls_abandoned_5min': stats['calls_abandoned'],
                'service_level_5min': round(service_level, 2)
            })

        return results

# Instancia global
queue_log_parser = QueueLogParser()
