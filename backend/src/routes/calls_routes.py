# routes/calls_routes.py
from fastapi import APIRouter, Query, HTTPException
from datetime import date, datetime, timedelta
from controllers.calls_controller import calls_controller
from models.schemas import ApiResponse
from typing import Optional

router = APIRouter(prefix="/api/calls", tags=["Calls"])

@router.get("/statistics")
async def get_call_statistics(
    start_date: date = Query(..., description="Fecha de inicio (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Fecha de fin (YYYY-MM-DD)"),
    queue: Optional[str] = Query(None, description="Filtrar por cola específica")
):
    """
    Obtiene estadísticas generales de llamadas en un rango de fechas
    """
    try:
        stats = calls_controller.get_call_statistics(
            str(start_date), 
            str(end_date), 
            queue
        )
        return ApiResponse(success=True, data=stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def get_calls_list(
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin"),
    queue: Optional[str] = Query(None, description="Filtrar por cola"),
    limit: int = Query(100, ge=1, le=1000, description="Límite de resultados")
):
    """
    Obtiene lista de llamadas con filtros
    """
    try:
        calls = calls_controller.get_calls_by_date_range(
            str(start_date), 
            str(end_date), 
            queue
        )
        return ApiResponse(
            success=True, 
            data={
                'calls': calls[:limit],
                'total': len(calls),
                'showing': min(len(calls), limit)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/hourly-distribution")
async def get_hourly_distribution(
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin")
):
    """
    Distribución de llamadas por hora del día
    """
    try:
        distribution = calls_controller.get_hourly_distribution(
            str(start_date),
            str(end_date)
        )
        return ApiResponse(success=True, data={'data': distribution})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily-summary")
async def get_daily_summary(
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin")
):
    """
    Resumen diario de llamadas
    """
    try:
        summary = calls_controller.get_daily_summary(
            str(start_date),
            str(end_date)
        )
        return ApiResponse(success=True, data={'data': summary})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/disposition-summary")
async def get_disposition_summary(
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin")
):
    """
    Resumen por tipo de disposición (ANSWERED, NO ANSWER, etc.)
    """
    try:
        summary = calls_controller.get_disposition_summary(
            str(start_date),
            str(end_date)
        )
        return ApiResponse(success=True, data={'data': summary})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/today")
async def get_today_statistics():
    """
    Estadísticas del día actual (acceso rápido)
    """
    try:
        today = date.today()
        stats = calls_controller.get_call_statistics(str(today), str(today))
        return ApiResponse(success=True, data=stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/this-week")
async def get_this_week_statistics():
    """
    Estadísticas de la semana actual
    """
    try:
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())
        stats = calls_controller.get_call_statistics(
            str(start_of_week), 
            str(today)
        )
        return ApiResponse(success=True, data=stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/this-month")
async def get_this_month_statistics():
    """
    Estadísticas del mes actual
    """
    try:
        today = date.today()
        start_of_month = date(today.year, today.month, 1)
        stats = calls_controller.get_call_statistics(
            str(start_of_month),
            str(today)
        )
        return ApiResponse(success=True, data=stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/by-agent")
async def get_calls_by_agent(
    start_date: date = Query(..., description="Fecha de inicio (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Fecha de fin (YYYY-MM-DD)"),
    agent: Optional[str] = Query(None, description="Filtrar por agente específico")
):
    """
    Obtiene llamadas agrupadas por agente con detalles completos
    Incluye: total de llamadas, duración, tiempos de espera, y lista de llamadas individuales
    """
    try:
        data = calls_controller.get_calls_by_agent(
            str(start_date),
            str(end_date),
            agent
        )
        return ApiResponse(success=True, data=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
