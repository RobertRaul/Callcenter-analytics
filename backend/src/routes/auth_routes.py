# routes/auth_routes.py
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from services.auth_service import (
    authenticate_user, create_access_token, verify_token,
    get_user_by_email, set_temp_password, set_password,
)
from services import email_service
from dependencies import get_current_user
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login endpoint"""
    user = authenticate_user(request.username, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    # Crear token
    access_token = create_access_token(data={"sub": user['username']})

    # Preparar datos de usuario (sin password)
    user_data = {
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'full_name': user['full_name'],
        'must_change_password': bool(user.get('must_change_password', 0)),
        'is_admin': bool(user.get('is_admin', 0)),
        'permissions': {
            'dashboard': bool(user['access_dashboard']),
            'calls': bool(user['access_calls']),
            'queues': bool(user['access_queues']),
            'agents': bool(user['access_agents']),
            'reports': bool(user['access_reports']),
            'admin': bool(user.get('is_admin', 0))
        }
    }

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

@router.get("/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Obtener usuario actual"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")

    token = authorization.replace("Bearer ", "")
    user = verify_token(token)

    if not user:
        raise HTTPException(status_code=401, detail="Token inválido")

    return {
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'full_name': user['full_name'],
        'must_change_password': bool(user.get('must_change_password', 0)),
        'is_admin': bool(user.get('is_admin', 0)),
        'permissions': {
            'dashboard': bool(user['access_dashboard']),
            'calls': bool(user['access_calls']),
            'queues': bool(user['access_queues']),
            'agents': bool(user['access_agents']),
            'reports': bool(user['access_reports']),
            'admin': bool(user.get('is_admin', 0))
        }
    }


@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    """Cambiar la propia contraseña (también usado para el cambio obligatorio)."""
    # Verificar la contraseña actual
    if not authenticate_user(user['username'], req.current_password):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")

    if not req.new_password or len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 8 caracteres")
    if req.new_password == req.current_password:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe ser distinta a la actual")

    set_password(user['id'], req.new_password)
    return {"success": True, "message": "Contraseña actualizada"}


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """Autoservicio: envía una contraseña temporal al correo si la cuenta existe.
    Respuesta genérica para no revelar si el correo está registrado."""
    generic = {"success": True, "message": "Si el correo está registrado, se enviaron instrucciones de acceso."}
    user = get_user_by_email(req.email.strip())
    if not user:
        return generic

    temp = set_temp_password(user['id'])
    email_service.send_temp_password_email(
        to_email=user['email'], full_name=user['full_name'],
        username=user['username'], temp_password=temp, is_new=False,
    )
    return generic
