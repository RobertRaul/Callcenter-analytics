# routes/reports_routes.py
from fastapi import APIRouter, Query, HTTPException, Body
from fastapi.responses import StreamingResponse
from datetime import date
from controllers.calls_controller import calls_controller
from controllers.agents_controller import agents_controller
from controllers.queues_controller import queues_controller
from services.reports_service import reports_service
from typing import Optional
from pydantic import BaseModel
import io

router = APIRouter(prefix="/api/reports", tags=["Reports"])

class ChartImageRequest(BaseModel):
    """Modelo para recibir imagen de gráficos"""
    chart_image: Optional[str] = None

@router.post("/export/general/{format}")
async def export_general_report(
    format: str,
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin"),
    request_body: ChartImageRequest = Body(default=None)
):
    """
    Exporta reporte general en Excel o PDF con gráficos opcionales
    """
    try:
        # Obtener datos
        stats = calls_controller.get_call_statistics(str(start_date), str(end_date))
        daily_summary = calls_controller.get_daily_summary(str(start_date), str(end_date))

        # Agregar resumen diario a stats
        stats['daily_summary'] = daily_summary

        # Preparar rango de fechas
        date_range = {
            'start_date': start_date.strftime('%d/%m/%Y'),
            'end_date': end_date.strftime('%d/%m/%Y')
        }

        # Obtener imagen de gráfico si está disponible
        chart_image = request_body.chart_image if request_body else None

        if format == "excel":
            content = reports_service.generate_excel_report(
                stats,
                "general",
                date_range=date_range,
                chart_image=chart_image
            )
            filename = f"reporte_general_{start_date}_{end_date}.xlsx"
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif format == "pdf":
            content = reports_service.generate_pdf_report(
                stats,
                "general",
                date_range=date_range,
                chart_image=chart_image
            )
            filename = f"reporte_general_{start_date}_{end_date}.pdf"
            media_type = "application/pdf"
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado")

        return StreamingResponse(
            io.BytesIO(content),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export/agents/{format}")
async def export_agents_report(
    format: str,
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin"),
    request_body: ChartImageRequest = Body(default=None)
):
    """
    Exporta reporte de agentes en Excel o PDF con gráficos opcionales
    """
    try:
        agents = agents_controller.get_agent_statistics(str(start_date), str(end_date))

        date_range = {
            'start_date': start_date.strftime('%d/%m/%Y'),
            'end_date': end_date.strftime('%d/%m/%Y')
        }

        chart_image = request_body.chart_image if request_body else None

        if format == "excel":
            content = reports_service.generate_excel_report(
                {'agents': agents},
                "agents",
                date_range=date_range,
                chart_image=chart_image
            )
            filename = f"reporte_agentes_{start_date}_{end_date}.xlsx"
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif format == "pdf":
            content = reports_service.generate_pdf_report(
                {'agents': agents},
                "agents",
                date_range=date_range,
                chart_image=chart_image
            )
            filename = f"reporte_agentes_{start_date}_{end_date}.pdf"
            media_type = "application/pdf"
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado")

        return StreamingResponse(
            io.BytesIO(content),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export/queues/{format}")
async def export_queues_report(
    format: str,
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin"),
    request_body: ChartImageRequest = Body(default=None)
):
    """
    Exporta reporte de colas en Excel o PDF con gráficos opcionales
    """
    try:
        queues = queues_controller.get_queue_statistics(str(start_date), str(end_date))

        date_range = {
            'start_date': start_date.strftime('%d/%m/%Y'),
            'end_date': end_date.strftime('%d/%m/%Y')
        }

        chart_image = request_body.chart_image if request_body else None

        if format == "excel":
            content = reports_service.generate_excel_report(
                {'queues': queues},
                "queues",
                date_range=date_range,
                chart_image=chart_image
            )
            filename = f"reporte_colas_{start_date}_{end_date}.xlsx"
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif format == "pdf":
            content = reports_service.generate_pdf_report(
                {'queues': queues},
                "queues",
                date_range=date_range,
                chart_image=chart_image
            )
            filename = f"reporte_colas_{start_date}_{end_date}.pdf"
            media_type = "application/pdf"
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado")

        return StreamingResponse(
            io.BytesIO(content),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export/calls/{format}")
async def export_calls_report(
    format: str,
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin"),
    limit: int = Query(500, description="Límite de registros"),
    request_body: ChartImageRequest = Body(default=None)
):
    """
    Exporta resumen diario de llamadas en Excel o PDF con gráficos opcionales
    """
    try:
        # Obtener resumen diario en lugar de detalle de llamadas
        daily_summary = calls_controller.get_daily_summary(str(start_date), str(end_date))

        date_range = {
            'start_date': start_date.strftime('%d/%m/%Y'),
            'end_date': end_date.strftime('%d/%m/%Y')
        }

        chart_image = request_body.chart_image if request_body else None

        if format == "excel":
            content = reports_service.generate_excel_report(
                {'daily_summary': daily_summary},
                "calls",
                date_range=date_range,
                chart_image=chart_image
            )
            filename = f"resumen_diario_{start_date}_{end_date}.xlsx"
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif format == "pdf":
            content = reports_service.generate_pdf_report(
                {'daily_summary': daily_summary},
                "calls",
                date_range=date_range,
                chart_image=chart_image
            )
            filename = f"resumen_diario_{start_date}_{end_date}.pdf"
            media_type = "application/pdf"
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado")

        return StreamingResponse(
            io.BytesIO(content),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
