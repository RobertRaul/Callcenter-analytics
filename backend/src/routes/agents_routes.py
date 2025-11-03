# routes/agents_routes.py
from fastapi import APIRouter, Query, HTTPException
from datetime import date
from controllers.agents_controller import agents_controller
from models.schemas import ApiResponse
from typing import Optional

router = APIRouter(prefix="/api/agents", tags=["Agents"])

@router.get("/list")
async def get_available_agents():
    """
    Obtiene la lista de todos los agentes disponibles
    """
    try:
        agents = agents_controller.get_available_agents()
        return ApiResponse(success=True, data={'agents': agents, 'total': len(agents)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics")
async def get_agent_statistics(
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin"),
    agent: Optional[str] = Query(None, description="Extensión del agente")
):
    """
    Estadísticas detalladas de agentes
    """
    try:
        stats = agents_controller.get_agent_statistics(
            str(start_date),
            str(end_date),
            agent
        )
        return ApiResponse(success=True, data={'agents': stats, 'total': len(stats)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{agent}/performance-by-queue")
async def get_agent_performance_by_queue(
    agent: str,
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin")
):
    """
    Performance de un agente específico por cola
    """
    try:
        performance = agents_controller.get_agent_performance_by_queue(
            str(start_date),
            str(end_date),
            agent
        )
        return ApiResponse(success=True, data={'performance': performance, 'total': len(performance)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/hourly-performance")
async def get_agent_hourly_performance(
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin"),
    agent: Optional[str] = Query(None, description="Extensión del agente")
):
    """
    Performance de agentes por hora del día
    """
    try:
        performance = agents_controller.get_agent_hourly_performance(
            str(start_date),
            str(end_date),
            agent
        )
        return ApiResponse(success=True, data={'performance': performance, 'total': len(performance)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{agent}/call-history")
async def get_agent_call_history(
    agent: str,
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin"),
    limit: int = Query(100, ge=1, le=500, description="Límite de resultados")
):
    """
    Historial de llamadas de un agente específico
    """
    try:
        history = agents_controller.get_agent_call_history(
            str(start_date),
            str(end_date),
            agent,
            limit
        )
        return ApiResponse(success=True, data={'calls': history, 'total': len(history)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/realtime")
async def get_realtime_agent_status():
    """
    Estado en tiempo real de todos los agentes
    """
    try:
        status = agents_controller.get_realtime_agent_status()
        return ApiResponse(success=True, data={'agents': status, 'total': len(status)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/comparison")
async def get_agent_comparison(
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin")
):
    """
    Comparación de performance entre todos los agentes
    """
    try:
        comparison = agents_controller.get_agent_comparison(
            str(start_date),
            str(end_date)
        )
        return ApiResponse(success=True, data={'agents': comparison, 'total': len(comparison)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
