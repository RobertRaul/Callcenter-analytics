# config/settings.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Configuración de la aplicación
    APP_NAME: str = "Call Center Analytics"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Configuración de base de datos Issabel
    DB_HOST: str = "192.168.3.2"
    DB_PORT: int = 3306
    DB_USER: str = "reportes"
    DB_PASSWORD: str = ""            # valor real en .env (no versionar)
    DB_NAME_CDR: str = "asteriskcdrdb"
    DB_NAME_ASTERISK: str = "asterisk"

    # Credenciales para acceso a tabla queue_log
    DB_USER_QUEUELOG: str = "asteriskuser"
    DB_PASSWORD_QUEUELOG: str = ""   # valor real en .env (no versionar)
    
    # Configuración de servidor
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    
    # CORS
    CORS_ORIGINS: list = [
	"http://metricas.macsalud.com",
	"http://www.metricas.macsalud.com",
        "http://localhost:3000",
        "http://192.168.11.3",
        "http://192.168.11.3:3000"
    ]
    
    # JWT Secret (cambiar en producción)
    SECRET_KEY: str = "tu-secret-key-muy-segura-cambiar-en-produccion"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 horas

    # --- Envío de correo (SMTP / Google Workspace) ---
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""               # cuenta remitente, ej. no-reply@macsalud.com
    SMTP_PASSWORD: str = ""           # App Password de 16 caracteres (en .env)
    SMTP_FROM: str = ""               # remitente visible; si vacío usa SMTP_USER
    SMTP_FROM_NAME: str = "Call Center Analytics - MACSA"

    # URL pública para construir enlaces de los correos
    APP_BASE_URL: str = "https://metricas.macsalud.com"

    # Destinatarios de reportes automáticos (correos separados por coma)
    REPORT_RECIPIENTS_GERENCIA: str = ""   # Gerencia General
    REPORT_RECIPIENTS_ADMIN: str = ""      # Administración

    class Config:
        # Ruta ABSOLUTA: el servicio corre desde backend/src, pero el .env vive en backend/
        env_file = "/opt/callcenter-analytics/backend/.env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
