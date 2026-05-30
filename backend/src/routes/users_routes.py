# routes/users_routes.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import sqlite3
from services.auth_service import pwd_context, DB_PATH, generate_temp_password, set_temp_password, get_user_by_id
from services import email_service
from services import settings_store
from dependencies import require_admin

router = APIRouter(prefix="/api/users", tags=["Users"])

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    is_admin: bool = False
    access_dashboard: bool = True
    access_calls: bool = True
    access_queues: bool = True
    access_agents: bool = True
    access_reports: bool = True

class ReportConfig(BaseModel):
    gerencia: str = ""
    administracion: str = ""

class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    access_dashboard: Optional[bool] = None
    access_calls: Optional[bool] = None
    access_queues: Optional[bool] = None
    access_agents: Optional[bool] = None
    access_reports: Optional[bool] = None

@router.get("/list")
async def list_users(admin: dict = Depends(require_admin)):
    """Listar todos los usuarios (solo admin)"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT id, username, email, full_name, is_active, is_admin, access_dashboard, access_calls, access_queues, access_agents, access_reports, must_change_password, created_at FROM users")

    # Convertir 0/1 a booleanos verdaderos
    users = []
    for row in c.fetchall():
        user_dict = dict(row)
        user_dict['is_active'] = bool(user_dict['is_active'])
        user_dict['is_admin'] = bool(user_dict.get('is_admin', 0))
        user_dict['access_dashboard'] = bool(user_dict['access_dashboard'])
        user_dict['access_calls'] = bool(user_dict['access_calls'])
        user_dict['access_queues'] = bool(user_dict['access_queues'])
        user_dict['access_agents'] = bool(user_dict['access_agents'])
        user_dict['access_reports'] = bool(user_dict['access_reports'])
        user_dict['must_change_password'] = bool(user_dict.get('must_change_password', 0))
        users.append(user_dict)

    conn.close()
    return {"success": True, "data": users}

@router.post("/create")
async def create_user(user: UserCreate, admin: dict = Depends(require_admin)):
    """Crear nuevo usuario. Genera una contraseña temporal y la envía por correo;
    el usuario deberá cambiarla en su primer ingreso (solo admin)."""
    temp_password = generate_temp_password()
    hashed_password = pwd_context.hash(temp_password)

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute('''
            INSERT INTO users (username, email, password, full_name, must_change_password, is_admin,
                               access_dashboard, access_calls, access_queues, access_agents, access_reports)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
        ''', (user.username, user.email, hashed_password, user.full_name, int(user.is_admin),
              int(user.access_dashboard), int(user.access_calls), int(user.access_queues),
              int(user.access_agents), int(user.access_reports)))
        conn.commit()
        user_id = c.lastrowid
        conn.close()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Usuario o email ya existe")

    # Enviar credenciales por correo
    email_sent = email_service.send_temp_password_email(
        to_email=user.email, full_name=user.full_name,
        username=user.username, temp_password=temp_password, is_new=True,
    )

    resp = {"success": True, "message": "Usuario creado", "id": user_id, "email_sent": email_sent}
    if not email_sent:
        # Fallback: el admin (autenticado) recibe la temporal para entregarla manualmente
        resp["temp_password"] = temp_password
        resp["message"] = "Usuario creado, pero no se pudo enviar el correo. Entrega la contraseña temporal manualmente."
    return resp

@router.get("/report-config")
async def get_report_config(admin: dict = Depends(require_admin)):
    """Destinatarios actuales de los reportes automáticos (solo admin)."""
    return {"success": True, "data": {
        "gerencia": settings_store.get_setting("report_recipients_gerencia", ""),
        "administracion": settings_store.get_setting("report_recipients_admin", ""),
    }}

@router.put("/report-config")
async def save_report_config(cfg: ReportConfig, admin: dict = Depends(require_admin)):
    """Guardar destinatarios de los reportes automáticos (solo admin)."""
    settings_store.set_setting("report_recipients_gerencia", cfg.gerencia.strip())
    settings_store.set_setting("report_recipients_admin", cfg.administracion.strip())
    return {"success": True, "message": "Configuración de envíos guardada"}

@router.post("/reset-password/{user_id}")
async def reset_password(user_id: int, admin: dict = Depends(require_admin)):
    """Restablecer la contraseña de un usuario: genera una temporal y la envía por correo (solo admin)."""
    target = get_user_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    temp_password = set_temp_password(user_id)
    email_sent = email_service.send_temp_password_email(
        to_email=target['email'], full_name=target['full_name'],
        username=target['username'], temp_password=temp_password, is_new=False,
    )

    resp = {"success": True, "message": "Contraseña restablecida", "email_sent": email_sent}
    if not email_sent:
        resp["temp_password"] = temp_password
        resp["message"] = "Contraseña restablecida, pero no se pudo enviar el correo. Entrega la temporal manualmente."
    return resp

@router.put("/update/{user_id}")
async def update_user(user_id: int, user: UserUpdate, admin: dict = Depends(require_admin)):
    """Actualizar usuario (solo admin)"""
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
    if user.is_admin is not None:
        updates.append("is_admin = ?")
        params.append(int(user.is_admin))
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
async def delete_user(user_id: int, admin: dict = Depends(require_admin)):
    """Eliminar usuario (solo admin)"""
    if user_id == 1:
        raise HTTPException(status_code=400, detail="No se puede eliminar el usuario admin")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

    return {"success": True, "message": "Usuario eliminado"}
