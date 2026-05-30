# services/auth_service.py
import sqlite3
import secrets
import string
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from config.settings import settings

# Secreto unificado: se lee del .env (config.settings), ya no hardcodeado.
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DB_PATH = "/opt/callcenter-analytics/backend/users.db"

def init_db():
    """Inicializar base de datos SQLite"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            access_dashboard INTEGER DEFAULT 1,
            access_calls INTEGER DEFAULT 1,
            access_queues INTEGER DEFAULT 1,
            access_agents INTEGER DEFAULT 1,
            access_reports INTEGER DEFAULT 1,
            must_change_password INTEGER DEFAULT 0,
            is_admin INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Migraciones: agregar columnas nuevas si la tabla ya existía sin ellas
    c.execute("PRAGMA table_info(users)")
    existing_cols = [row[1] for row in c.fetchall()]
    if 'must_change_password' not in existing_cols:
        c.execute("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0")
    if 'is_admin' not in existing_cols:
        c.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0")

    # Crear usuario admin por defecto (password: admin123)
    admin_password = pwd_context.hash("admin123")
    try:
        c.execute('''
            INSERT INTO users (username, email, password, full_name,
                             access_dashboard, access_calls, access_queues, access_agents, access_reports)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('admin', 'admin@callcenter.local', admin_password, 'Administrador', 1, 1, 1, 1, 1))
    except sqlite3.IntegrityError:
        pass  # Usuario ya existe

    # Asegurar que el usuario 'admin' tenga el rol de administrador
    c.execute("UPDATE users SET is_admin = 1 WHERE username = 'admin'")
    # Correo real del admin (solo si sigue con el placeholder por defecto)
    c.execute("UPDATE users SET email = 'rarmejo@macsalud.com' WHERE username = 'admin' AND email = 'admin@callcenter.local'")

    conn.commit()
    conn.close()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verificar password"""
    return pwd_context.verify(plain_password, hashed_password)

def get_user(username: str):
    """Obtener usuario por username"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = ? AND is_active = 1", (username,))
    user = c.fetchone()
    conn.close()
    return dict(user) if user else None

def authenticate_user(username: str, password: str):
    """Autenticar usuario"""
    user = get_user(username)
    if not user:
        return False
    if not verify_password(password, user['password']):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crear token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    """Verificar token JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return get_user(username)
    except JWTError:
        return None

# ---------- Helpers para gestión de contraseñas / invitación ----------

def generate_temp_password(length: int = 12) -> str:
    """Genera una contraseña temporal legible y aleatoria."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def get_user_by_email(email: str):
    """Obtener usuario activo por email."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE email = ? AND is_active = 1", (email,))
    user = c.fetchone()
    conn.close()
    return dict(user) if user else None

def get_user_by_id(user_id: int):
    """Obtener usuario por id (sin filtrar por activo)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = c.fetchone()
    conn.close()
    return dict(user) if user else None

def set_temp_password(user_id: int) -> str:
    """Asigna una contraseña temporal (hasheada) y marca cambio obligatorio.
    Devuelve la temporal en claro para enviarla por correo."""
    temp = generate_temp_password()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "UPDATE users SET password = ?, must_change_password = 1 WHERE id = ?",
        (pwd_context.hash(temp), user_id),
    )
    conn.commit()
    conn.close()
    return temp

def set_password(user_id: int, new_password: str):
    """Define una contraseña definitiva y limpia el flag de cambio obligatorio."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?",
        (pwd_context.hash(new_password), user_id),
    )
    conn.commit()
    conn.close()

# Inicializar DB al importar
init_db()
