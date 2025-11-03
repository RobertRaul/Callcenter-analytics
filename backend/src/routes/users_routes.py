# routes/users_routes.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sqlite3
from services.auth_service import pwd_context, DB_PATH

router = APIRouter(prefix="/api/users", tags=["Users"])

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    access_dashboard: bool = True
    access_calls: bool = True
    access_queues: bool = True
    access_agents: bool = True
    access_reports: bool = True

class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    access_dashboard: Optional[bool] = None
    access_calls: Optional[bool] = None
    access_queues: Optional[bool] = None
    access_agents: Optional[bool] = None
    access_reports: Optional[bool] = None

@router.get("/list")
async def list_users():
    """Listar todos los usuarios"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT id, username, email, full_name, is_active, access_dashboard, access_calls, access_queues, access_agents, access_reports, created_at FROM users")
    users = [dict(row) for row in c.fetchall()]
    conn.close()
    return {"success": True, "data": users}

@router.post("/create")
async def create_user(user: UserCreate):
    """Crear nuevo usuario"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    hashed_password = pwd_context.hash(user.password)

    try:
        c.execute('''
            INSERT INTO users (username, email, password, full_name, access_dashboard, access_calls, access_queues, access_agents, access_reports)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user.username, user.email, hashed_password, user.full_name,
              int(user.access_dashboard), int(user.access_calls), int(user.access_queues),
              int(user.access_agents), int(user.access_reports)))
        conn.commit()
        user_id = c.lastrowid
        conn.close()
        return {"success": True, "message": "Usuario creado", "id": user_id}
    except sqlite3.IntegrityError as e:
        conn.close()
        raise HTTPException(status_code=400, detail="Usuario o email ya existe")

@router.put("/update/{user_id}")
async def update_user(user_id: int, user: UserUpdate):
    """Actualizar usuario"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    updates = []
    params = []

    if user.email is not None:
        updates.append("email = ?")
        params.append(user.email)
    if user.password is not None:
        updates.append("password = ?")
        params.append(pwd_context.hash(user.password))
    if user.full_name is not None:
        updates.append("full_name = ?")
        params.append(user.full_name)
    if user.is_active is not None:
        updates.append("is_active = ?")
        params.append(int(user.is_active))
    if user.access_dashboard is not None:
        updates.append("access_dashboard = ?")
        params.append(int(user.access_dashboard))
    if user.access_calls is not None:
        updates.append("access_calls = ?")
        params.append(int(user.access_calls))
    if user.access_queues is not None:
        updates.append("access_queues = ?")
        params.append(int(user.access_queues))
    if user.access_agents is not None:
        updates.append("access_agents = ?")
        params.append(int(user.access_agents))
    if user.access_reports is not None:
        updates.append("access_reports = ?")
        params.append(int(user.access_reports))

    if not updates:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")

    params.append(user_id)
    query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"

    c.execute(query, params)
    conn.commit()
    conn.close()

    return {"success": True, "message": "Usuario actualizado"}

@router.delete("/delete/{user_id}")
async def delete_user(user_id: int):
    """Eliminar usuario"""
    if user_id == 1:
        raise HTTPException(status_code=400, detail="No se puede eliminar el usuario admin")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

    return {"success": True, "message": "Usuario eliminado"}
