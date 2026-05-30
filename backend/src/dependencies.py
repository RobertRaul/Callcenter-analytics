# dependencies.py - Dependencias de autenticación reutilizables
from fastapi import Header, HTTPException, Depends
from typing import Optional
from services.auth_service import verify_token


async def get_current_user(authorization: Optional[str] = Header(None)):
    """Valida el JWT del header Authorization y devuelve el usuario."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")
    token = authorization.split(" ", 1)[1]
    user = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return user


async def require_admin(user: dict = Depends(get_current_user)):
    """Solo usuarios con rol administrador (is_admin) pueden continuar."""
    if not user.get("is_admin") and user.get("username") != "admin":
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador")
    return user
