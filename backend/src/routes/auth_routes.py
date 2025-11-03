# routes/auth_routes.py
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from services.auth_service import authenticate_user, create_access_token, verify_token
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

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
        'permissions': {
            'dashboard': bool(user['access_dashboard']),
            'calls': bool(user['access_calls']),
            'queues': bool(user['access_queues']),
            'agents': bool(user['access_agents']),
            'reports': bool(user['access_reports'])
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
        'permissions': {
            'dashboard': bool(user['access_dashboard']),
            'calls': bool(user['access_calls']),
            'queues': bool(user['access_queues']),
            'agents': bool(user['access_agents']),
            'reports': bool(user['access_reports'])
        }
    }
