# main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config.settings import settings
from config.database import db
import logging
from datetime import datetime

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Crear aplicación FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API REST para estadísticas y reportes de Call Center Issabel",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Importar routers
from routes.calls_routes import router as calls_router
from routes.queues_routes import router as queues_router
from routes.agents_routes import router as agents_router
from routes.recordings_routes import router as recordings_router
from routes.reports_routes import router as reports_router
from routes.auth_routes import router as auth_router
from routes.users_routes import router as users_router

# Registrar routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(calls_router)
app.include_router(queues_router)
app.include_router(agents_router)
app.include_router(recordings_router)
app.include_router(reports_router)

# Middleware para logging de requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    
    # Log del request
    logger.info(f"Request: {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    # Log del response
    process_time = (datetime.now() - start_time).total_seconds()
    logger.info(
        f"Response: {request.method} {request.url.path} - "
        f"Status: {response.status_code} - Time: {process_time:.3f}s"
    )
    
    return response

# Manejador global de excepciones
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Error interno del servidor",
            "error": str(exc)
        }
    )

# Rutas básicas
@app.get("/")
async def root():
    """
    Ruta raíz - Información de la API
    """
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """
    Health check - Verifica el estado de la API y acceso al queue_log
    """
    import os
    from utils.queue_log_parser import queue_log_parser

    try:
        # Verificar acceso al queue_log
        queue_log_exists = os.path.exists(queue_log_parser.log_file_path)
        queue_log_readable = os.access(queue_log_parser.log_file_path, os.R_OK) if queue_log_exists else False

        # Verificar MySQL (opcional)
        db_status = db.test_connection()

        return {
            "status": "healthy" if queue_log_readable else "degraded",
            "timestamp": datetime.now().isoformat(),
            "queue_log": {
                "path": queue_log_parser.log_file_path,
                "exists": queue_log_exists,
                "readable": queue_log_readable
            },
            "database": {
                "mysql_connected": db_status,
                "host": settings.DB_HOST if db_status else "not configured"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }
        )

@app.get("/api/dashboard/summary")
async def get_dashboard_summary():
    """
    Resumen general para el dashboard principal
    """
    try:
        from datetime import date, timedelta
        from controllers.calls_controller import calls_controller
        from controllers.queues_controller import queues_controller
        from controllers.agents_controller import agents_controller
        
        today = date.today()
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=7)
        
        # Estadísticas de hoy
        today_stats = calls_controller.get_call_statistics(str(today), str(today))
        
        # Estadísticas de ayer para comparación
        yesterday_stats = calls_controller.get_call_statistics(str(yesterday), str(yesterday))
        
        # Estadísticas de la semana
        week_stats = calls_controller.get_call_statistics(str(week_ago), str(today))
        
        # Estado de colas
        queues_status = queues_controller.get_realtime_queue_status()
        
        # Estado de agentes
        agents_status = agents_controller.get_realtime_agent_status()
        
        return {
            "success": True,
            "data": {
                "today": today_stats,
                "yesterday": yesterday_stats,
                "week": week_stats,
                "queues": queues_status,
                "agents": agents_status,
                "timestamp": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Dashboard summary error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )

if __name__ == "__main__":
    import uvicorn
    import os
    from utils.queue_log_parser import queue_log_parser

    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Verificar acceso a queue_log
    if os.path.exists(queue_log_parser.log_file_path):
        logger.info(f"✓ Queue log encontrado: {queue_log_parser.log_file_path}")
        if os.access(queue_log_parser.log_file_path, os.R_OK):
            logger.info("✓ Queue log es accesible")
        else:
            logger.warning("⚠ Queue log no es accesible - verificar permisos")
    else:
        logger.warning(f"⚠ Queue log no encontrado: {queue_log_parser.log_file_path}")

    # Probar conexión MySQL (opcional)
    logger.info(f"Verificando MySQL en {settings.DB_HOST}...")
    if db.test_connection():
        logger.info("✓ MySQL disponible (opcional)")
    else:
        logger.warning("⚠ MySQL no disponible - usando solo queue_log")

    uvicorn.run(
        "main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
