# routes/queues_routes.py
from fastapi import APIRouter, Query, HTTPException
from datetime import date
from controllers.queues_controller import queues_controller
from models.schemas import ApiResponse
from typing import Optional

router = APIRouter(prefix="/api/queues", tags=["Queues"])

@router.get("/list")
async def get_available_queues():
    """
    Obtiene la lista de todas las colas disponibles
    """
    try:
        queues = queues_controller.get_available_queues()
        return ApiResponse(success=True, data={'queues': queues, 'total': len(queues)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics")
async def get_queue_statistics(
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin"),
    queue_name: Optional[str] = Query(None, description="Nombre de cola específica")
):
    """
    Estadísticas detalladas de colas
    """
    try:
        stats = queues_controller.get_queue_statistics(
            str(start_date),
            str(end_date),
            queue_name
        )
        return ApiResponse(success=True, data={'queues': stats, 'total': len(stats)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events/{queue_name}")
async def get_queue_events(
    queue_name: str,
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin")
):
    """
    Timeline de eventos de una cola específica
    """
    try:
        events = queues_controller.get_queue_events_timeline(
            str(start_date),
            str(end_date),
            queue_name
        )
        return ApiResponse(success=True, data={'events': events, 'total': len(events)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance-by-hour")
async def get_queue_performance_by_hour(
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin"),
    queue_name: Optional[str] = Query(None, description="Nombre de cola")
):
    """
    Performance de colas por hora del día
    """
    try:
        performance = queues_controller.get_queue_performance_by_hour(
            str(start_date),
            str(end_date),
            queue_name
        )
        return ApiResponse(success=True, data={'performance': performance, 'total': len(performance)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/realtime")
async def get_realtime_queue_status():
    """
    Estado en tiempo real de todas las colas
    """
    try:
        status = queues_controller.get_realtime_queue_status()
        return ApiResponse(success=True, data={'queues': status, 'total': len(status)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
