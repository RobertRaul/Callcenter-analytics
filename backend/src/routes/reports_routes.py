# routes/reports_routes.py
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from datetime import date
from controllers.calls_controller import calls_controller
from controllers.agents_controller import agents_controller
from controllers.queues_controller import queues_controller
from services.reports_service import reports_service
from typing import Optional
import io

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/export/general/{format}")
async def export_general_report(
    format: str,
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin")
):
    """
    Exporta reporte general en Excel o PDF
    """
    try:
        # Obtener datos
        stats = calls_controller.get_call_statistics(str(start_date), str(end_date))

        if format == "excel":
            content = reports_service.generate_excel_report(stats, "general")
            filename = f"reporte_general_{start_date}_{end_date}.xlsx"
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif format == "pdf":
            content = reports_service.generate_pdf_report(stats, "general")
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

@router.get("/export/agents/{format}")
async def export_agents_report(
    format: str,
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin")
):
    """
    Exporta reporte de agentes en Excel o PDF
    """
    try:
        agents = agents_controller.get_agent_statistics(str(start_date), str(end_date))

        if format == "excel":
            content = reports_service.generate_excel_report({'agents': agents}, "agents")
            filename = f"reporte_agentes_{start_date}_{end_date}.xlsx"
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif format == "pdf":
            content = reports_service.generate_pdf_report({'agents': agents}, "agents")
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

@router.get("/export/queues/{format}")
async def export_queues_report(
    format: str,
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin")
):
    """
    Exporta reporte de colas en Excel o PDF
    """
    try:
        queues = queues_controller.get_queue_statistics(str(start_date), str(end_date))

        if format == "excel":
            content = reports_service.generate_excel_report({'queues': queues}, "queues")
            filename = f"reporte_colas_{start_date}_{end_date}.xlsx"
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif format == "pdf":
            content = reports_service.generate_pdf_report({'queues': queues}, "queues")
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

@router.get("/export/calls/{format}")
async def export_calls_report(
    format: str,
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin"),
    limit: int = Query(500, description="Límite de registros")
):
    """
    Exporta reporte de llamadas en Excel o PDF
    """
    try:
        calls = calls_controller.get_calls_by_date_range(str(start_date), str(end_date))

        if format == "excel":
            content = reports_service.generate_excel_report({'calls': calls[:limit]}, "calls")
            filename = f"reporte_llamadas_{start_date}_{end_date}.xlsx"
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif format == "pdf":
            content = reports_service.generate_pdf_report({'calls': calls[:100]}, "calls")
            filename = f"reporte_llamadas_{start_date}_{end_date}.pdf"
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
