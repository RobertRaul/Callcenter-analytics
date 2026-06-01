# services/schedules_store.py
"""Programaciones de reportes automáticos (SQLite, users.db).

Cada fila es un "envío" configurable desde el panel /users: qué tipo de reporte,
con qué frecuencia/días/hora y a qué destinatarios. El despachador
(backend/dispatch_reports.py) lee estas filas cada minuto y dispara los que
correspondan. Reemplaza a las 4 líneas fijas de /etc/cron.d/callcenter-reports.
"""
import sqlite3
from services.auth_service import DB_PATH
from services import settings_store

# Tipos de reporte válidos (deben coincidir con report_mailer.REPORTS)
REPORT_TYPES = ("daily", "weekly-exec", "monthly", "weekly-agents")
FREQS = ("daily", "weekly", "monthly")

_COLUMNS = [
    "id", "name", "report_type", "freq", "days", "day_of_month",
    "time", "recipients", "enabled", "last_run", "created_at",
]


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS report_schedules (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            name         TEXT,
            report_type  TEXT NOT NULL,
            freq         TEXT NOT NULL,
            days         TEXT DEFAULT '',
            day_of_month INTEGER,
            time         TEXT NOT NULL,
            recipients   TEXT DEFAULT '',
            enabled      INTEGER DEFAULT 1,
            last_run     TEXT,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()

    # Sembrar las 4 programaciones por defecto (equivalentes al cron anterior)
    # solo si la tabla está vacía, para no perder el comportamiento actual.
    c.execute("SELECT COUNT(*) FROM report_schedules")
    if c.fetchone()[0] == 0:
        gerencia = settings_store.get_setting("report_recipients_gerencia", "")
        admin = settings_store.get_setting("report_recipients_admin", "")
        seeds = [
            # name, report_type, freq, days, day_of_month, time, recipients
            ("Digest diario operativo", "daily", "daily", "", None, "07:30", admin),
            ("Resumen ejecutivo semanal", "weekly-exec", "weekly", "0", None, "08:00", gerencia),
            ("Semanal de agentes y colas", "weekly-agents", "weekly", "0", None, "08:05", admin),
            ("Reporte mensual de desempeño", "monthly", "monthly", "", 1, "08:00", gerencia),
        ]
        c.executemany(
            "INSERT INTO report_schedules "
            "(name, report_type, freq, days, day_of_month, time, recipients, enabled) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
            seeds,
        )
        conn.commit()

    conn.close()


def _row_to_dict(row) -> dict:
    d = dict(row)
    d["enabled"] = bool(d.get("enabled", 0))
    # days como lista de enteros (0=Lun..6=Dom)
    raw_days = (d.get("days") or "").strip()
    d["days"] = [int(x) for x in raw_days.split(",") if x.strip().isdigit()] if raw_days else []
    return d


def list_schedules() -> list:
    conn = _connect()
    rows = conn.execute("SELECT * FROM report_schedules ORDER BY id").fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def get(schedule_id: int):
    conn = _connect()
    row = conn.execute("SELECT * FROM report_schedules WHERE id = ?", (schedule_id,)).fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


def _normalize(data: dict) -> dict:
    """Normaliza un payload de entrada a los tipos de columna."""
    days = data.get("days", [])
    if isinstance(days, (list, tuple)):
        days_str = ",".join(str(int(x)) for x in days)
    else:
        days_str = str(days or "")
    return {
        "name": (data.get("name") or "").strip(),
        "report_type": data.get("report_type"),
        "freq": data.get("freq"),
        "days": days_str,
        "day_of_month": data.get("day_of_month"),
        "time": (data.get("time") or "").strip(),
        "recipients": (data.get("recipients") or "").strip(),
        "enabled": 1 if data.get("enabled", True) else 0,
    }


def create(data: dict) -> int:
    d = _normalize(data)
    conn = _connect()
    cur = conn.execute(
        "INSERT INTO report_schedules "
        "(name, report_type, freq, days, day_of_month, time, recipients, enabled) "
        "VALUES (:name, :report_type, :freq, :days, :day_of_month, :time, :recipients, :enabled)",
        d,
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return new_id


def update(schedule_id: int, data: dict) -> bool:
    d = _normalize(data)
    d["id"] = schedule_id
    conn = _connect()
    cur = conn.execute(
        "UPDATE report_schedules SET "
        "name=:name, report_type=:report_type, freq=:freq, days=:days, "
        "day_of_month=:day_of_month, time=:time, recipients=:recipients, enabled=:enabled "
        "WHERE id=:id",
        d,
    )
    conn.commit()
    changed = cur.rowcount > 0
    conn.close()
    return changed


def delete(schedule_id: int) -> bool:
    conn = _connect()
    cur = conn.execute("DELETE FROM report_schedules WHERE id = ?", (schedule_id,))
    conn.commit()
    changed = cur.rowcount > 0
    conn.close()
    return changed


def mark_run(schedule_id: int, yyyy_mm_dd: str):
    conn = _connect()
    conn.execute("UPDATE report_schedules SET last_run = ? WHERE id = ?", (yyyy_mm_dd, schedule_id))
    conn.commit()
    conn.close()


_init()
