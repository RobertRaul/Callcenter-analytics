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
    DB_PASSWORD: str = "issabel"
    DB_NAME_CDR: str = "asteriskcdrdb"
    DB_NAME_ASTERISK: str = "asterisk"
    
    # Configuración de servidor
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://192.168.11.3",
        "http://192.168.11.3:3000"
    ]
    
    # JWT Secret (cambiar en producción)
    SECRET_KEY: str = "tu-secret-key-muy-segura-cambiar-en-produccion"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 horas
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
