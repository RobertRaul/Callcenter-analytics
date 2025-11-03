# routes/recordings_routes.py
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from typing import Optional
import logging
import os

from services.recordings_service import recordings_service
from models.schemas import ApiResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/recordings", tags=["recordings"])

@router.get("/check/{callid}")
async def check_recording(
    callid: str,
    date: Optional[str] = Query(None, description="Fecha en formato YYYY-MM-DD")
):
    """
    Verifica si existe una grabación para un callid
    """
    try:
        exists = recordings_service.check_recording_exists(callid, date)

        return ApiResponse(
            success=True,
            data={
                'callid': callid,
                'has_recording': exists,
                'date': date
            }
        )
    except Exception as e:
        logger.error(f"Error checking recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stream/{callid}")
async def stream_recording(
    callid: str,
    date: Optional[str] = Query(None, description="Fecha en formato YYYY-MM-DD")
):
    """
    Stream de una grabación de audio
    """
    try:
        # Obtener el archivo de grabación
        local_path = recordings_service.get_recording_file(callid, date)

        if not local_path or not os.path.exists(local_path):
            raise HTTPException(
                status_code=404,
                detail=f"Recording not found for callid: {callid}"
            )

        # El servicio ahora siempre devuelve WAV
        filename = os.path.basename(local_path)

        # Retornar el archivo como respuesta
        return FileResponse(
            path=local_path,
            media_type="audio/wav",
            filename=filename,
            headers={
                "Content-Disposition": f"inline; filename={filename}",
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=3600"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error streaming recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{callid}")
async def download_recording(
    callid: str,
    date: Optional[str] = Query(None, description="Fecha en formato YYYY-MM-DD")
):
    """
    Descarga una grabación de audio
    """
    try:
        # Obtener el archivo de grabación
        local_path = recordings_service.get_recording_file(callid, date)

        if not local_path or not os.path.exists(local_path):
            raise HTTPException(
                status_code=404,
                detail=f"Recording not found for callid: {callid}"
            )

        # El servicio ahora siempre devuelve WAV
        filename = os.path.basename(local_path)

        # Retornar el archivo para descarga
        return FileResponse(
            path=local_path,
            media_type="audio/wav",
            filename=filename,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_recordings(
    date: str = Query(..., description="Fecha en formato YYYY-MM-DD")
):
    """
    Lista todas las grabaciones de una fecha específica
    """
    try:
        recordings = recordings_service.list_recordings_by_date(date)

        return ApiResponse(
            success=True,
            data={
                'date': date,
                'total': len(recordings),
                'recordings': recordings
            }
        )

    except Exception as e:
        logger.error(f"Error listing recordings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cleanup-cache")
async def cleanup_cache(
    max_age_hours: int = Query(24, description="Edad máxima en horas")
):
    """
    Limpia archivos antiguos del caché
    """
    try:
        recordings_service.cleanup_cache(max_age_hours)

        return ApiResponse(
            success=True,
            data={'message': 'Cache cleaned successfully'}
        )

    except Exception as e:
        logger.error(f"Error cleaning cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))
