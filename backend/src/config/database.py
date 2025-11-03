# config/database.py
import pymysql
from contextlib import contextmanager
from .settings import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.connection_params = {
            'host': settings.DB_HOST,
            'port': settings.DB_PORT,
            'user': settings.DB_USER,
            'password': settings.DB_PASSWORD,
            'charset': 'utf8mb4',
            'cursorclass': pymysql.cursors.DictCursor
        }
    
    @contextmanager
    def get_connection(self, database: str = None):
        """Context manager para conexiones a la base de datos"""
        connection = None
        try:
            params = self.connection_params.copy()
            if database:
                params['database'] = database
            
            connection = pymysql.connect(**params)
            yield connection
            connection.commit()
        except pymysql.Error as e:
            if connection:
                connection.rollback()
            logger.error(f"Error de base de datos: {e}")
            raise
        finally:
            if connection:
                connection.close()
    
    def execute_query(self, query: str, params: tuple = None, database: str = None):
        """Ejecuta una query y retorna los resultados"""
        with self.get_connection(database) as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params or ())
                return cursor.fetchall()
    
    def execute_one(self, query: str, params: tuple = None, database: str = None):
        """Ejecuta una query y retorna un solo resultado"""
        with self.get_connection(database) as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params or ())
                return cursor.fetchone()
    
    def test_connection(self):
        """Prueba la conexión a ambas bases de datos (opcional)"""
        try:
            # Probar conexión a asteriskcdrdb
            with self.get_connection(settings.DB_NAME_CDR) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT COUNT(*) as count FROM cdr LIMIT 1")
                    result = cursor.fetchone()
                    logger.info(f"✓ Conexión exitosa a {settings.DB_NAME_CDR}")

            # Probar conexión a asterisk
            with self.get_connection(settings.DB_NAME_ASTERISK) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SHOW TABLES")
                    logger.info(f"✓ Conexión exitosa a {settings.DB_NAME_ASTERISK}")

            return True
        except Exception as e:
            logger.warning(f"MySQL no disponible: {e}")
            logger.info("La aplicación funcionará con queue_log únicamente")
            return False

# Instancia global
db = Database()
