# services/recordings_service.py
"""
Servicio para acceder a grabaciones de llamadas via SSH
Las grabaciones están en el servidor Issabel 192.168.3.2
Ruta: /var/spool/asterisk/monitor/YYYY/MM/DD/
Formato: exten-{extension}-{phone_number}-{date}-{time}-{callid}.wav
"""

import subprocess
import os
import logging
from typing import List, Dict, Optional
from datetime import datetime
import re

logger = logging.getLogger(__name__)

class RecordingsService:
    """
    Servicio para gestionar grabaciones de llamadas vía SSH
    """

    def __init__(self):
        self.ssh_host = "192.168.3.2"
        self.ssh_user = "root"
        self.ssh_password = "m4cs4l4d"
        self.recordings_base_path = "/var/spool/asterisk/monitor"
        self.local_cache_path = "/tmp/recordings_cache"

        # Crear directorio de caché si no existe
        os.makedirs(self.local_cache_path, exist_ok=True)

    def _execute_ssh_command(self, command: str) -> str:
        """
        Ejecuta un comando SSH en el servidor de grabaciones
        """
        try:
            ssh_command = [
                "/usr/bin/sshpass", "-p", self.ssh_password,
                "/usr/bin/ssh", "-o", "StrictHostKeyChecking=no",
                f"{self.ssh_user}@{self.ssh_host}",
                command
            ]

            result = subprocess.run(
                ssh_command,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                return result.stdout
            else:
                logger.error(f"SSH command failed: {result.stderr}")
                return ""

        except Exception as e:
            logger.error(f"Error executing SSH command: {e}")
            return ""

    def find_recording_by_callid(self, callid: str, date: str = None) -> Optional[str]:
        """
        Busca una grabación por callid

        Args:
            callid: ID de llamada (ej: 1761664631.6343)
            date: Fecha en formato YYYY-MM-DD (opcional, si no se proporciona busca en últimos 7 días)

        Returns:
            Ruta completa del archivo de grabación o None si no se encuentra
        """
        try:
            # Si se proporciona fecha, buscar solo en ese día
            if date:
                search_date = datetime.strptime(date, '%Y-%m-%d')
                year = search_date.strftime('%Y')
                month = search_date.strftime('%m')
                day = search_date.strftime('%d')

                search_path = f"{self.recordings_base_path}/{year}/{month}/{day}"

                # Buscar archivo que contenga el callid (wav, gsm, cualquier formato)
                command = f"find {search_path} -type f \\( -name '*{callid}*' \\) 2>/dev/null | head -1"
                result = self._execute_ssh_command(command)

                if result.strip():
                    return result.strip()
            else:
                # Buscar en los últimos 7 días
                command = f"find {self.recordings_base_path} -type f -name '*{callid}*' -mtime -7 2>/dev/null | head -1"
                result = self._execute_ssh_command(command)

                if result.strip():
                    return result.strip()

            return None

        except Exception as e:
            logger.error(f"Error finding recording for callid {callid}: {e}")
            return None

    def get_recording_file(self, callid: str, date: str = None) -> Optional[str]:
        """
        Descarga una grabación al caché local y retorna la ruta local
        Si es GSM, lo convierte a WAV para reproducción en navegador

        Args:
            callid: ID de llamada
            date: Fecha en formato YYYY-MM-DD (opcional)

        Returns:
            Ruta local del archivo descargado (WAV) o None si falla
        """
        try:
            # Buscar la grabación en el servidor remoto
            remote_path = self.find_recording_by_callid(callid, date)

            if not remote_path:
                logger.warning(f"Recording not found for callid {callid}")
                return None

            # Nombre del archivo local
            filename = os.path.basename(remote_path)
            local_path = os.path.join(self.local_cache_path, filename)

            # Si es GSM, preparar ruta WAV convertida
            is_gsm = filename.endswith('.gsm')
            wav_path = local_path.replace('.gsm', '.wav') if is_gsm else local_path

            # Si ya existe WAV en caché y es reciente (menos de 1 hora), usarlo
            if os.path.exists(wav_path):
                age = datetime.now().timestamp() - os.path.getmtime(wav_path)
                if age < 3600:  # 1 hora
                    logger.info(f"Using cached recording: {wav_path}")
                    return wav_path

            # Descargar el archivo via SCP
            scp_command = [
                "/usr/bin/sshpass", "-p", self.ssh_password,
                "/usr/bin/scp", "-o", "StrictHostKeyChecking=no",
                f"{self.ssh_user}@{self.ssh_host}:{remote_path}",
                local_path
            ]

            result = subprocess.run(
                scp_command,
                capture_output=True,
                timeout=60
            )

            if result.returncode != 0 or not os.path.exists(local_path):
                logger.error(f"Failed to download recording: {result.stderr}")
                return None

            logger.info(f"Recording downloaded successfully: {local_path}")

            # Si es GSM, convertir a WAV usando ffmpeg
            if is_gsm:
                try:
                    convert_command = [
                        "/usr/bin/ffmpeg", "-i", local_path,
                        "-ar", "8000", "-ac", "1",
                        "-y", wav_path
                    ]

                    convert_result = subprocess.run(
                        convert_command,
                        capture_output=True,
                        timeout=30
                    )

                    if convert_result.returncode == 0 and os.path.exists(wav_path):
                        logger.info(f"GSM converted to WAV: {wav_path}")
                        # Eliminar GSM original del caché
                        os.remove(local_path)
                        return wav_path
                    else:
                        logger.error(f"Failed to convert GSM to WAV: {convert_result.stderr}")
                        return None
                except Exception as e:
                    logger.error(f"Error converting GSM to WAV: {e}")
                    return None

            return local_path

        except Exception as e:
            logger.error(f"Error getting recording file: {e}")
            return None

    def list_recordings_by_date(self, date: str) -> List[Dict]:
        """
        Lista todas las grabaciones de una fecha específica

        Args:
            date: Fecha en formato YYYY-MM-DD

        Returns:
            Lista de diccionarios con información de las grabaciones
        """
        try:
            search_date = datetime.strptime(date, '%Y-%m-%d')
            year = search_date.strftime('%Y')
            month = search_date.strftime('%m')
            day = search_date.strftime('%d')

            search_path = f"{self.recordings_base_path}/{year}/{month}/{day}"

            # Listar archivos WAV en el directorio
            command = f"ls -1 {search_path}/*.wav 2>/dev/null"
            result = self._execute_ssh_command(command)

            if not result.strip():
                return []

            recordings = []
            for line in result.strip().split('\n'):
                if not line:
                    continue

                filename = os.path.basename(line)

                # Parsear el nombre del archivo
                # Formato: exten-100-904819355-20251029-080740-1761743250.39570.wav
                match = re.match(
                    r'exten-(\d+)-(\d+)-(\d{8})-(\d{6})-(.+)\.wav',
                    filename
                )

                if match:
                    extension, phone_number, file_date, file_time, callid_with_channel = match.groups()
                    callid = callid_with_channel.split('.')[0] + '.' + callid_with_channel.split('.')[1]

                    recordings.append({
                        'filename': filename,
                        'extension': extension,
                        'phone_number': phone_number,
                        'date': file_date,
                        'time': file_time,
                        'callid': callid,
                        'full_path': line
                    })

            return recordings

        except Exception as e:
            logger.error(f"Error listing recordings: {e}")
            return []

    def check_recording_exists(self, callid: str, date: str = None) -> bool:
        """
        Verifica si existe una grabación para un callid

        Args:
            callid: ID de llamada
            date: Fecha en formato YYYY-MM-DD (opcional)

        Returns:
            True si existe, False si no
        """
        return self.find_recording_by_callid(callid, date) is not None

    def cleanup_cache(self, max_age_hours: int = 24):
        """
        Limpia archivos antiguos del caché

        Args:
            max_age_hours: Edad máxima en horas
        """
        try:
            current_time = datetime.now().timestamp()
            max_age_seconds = max_age_hours * 3600

            for filename in os.listdir(self.local_cache_path):
                file_path = os.path.join(self.local_cache_path, filename)

                if os.path.isfile(file_path):
                    age = current_time - os.path.getmtime(file_path)

                    if age > max_age_seconds:
                        os.remove(file_path)
                        logger.info(f"Removed old cached file: {filename}")

        except Exception as e:
            logger.error(f"Error cleaning up cache: {e}")

# Instancia global
recordings_service = RecordingsService()
