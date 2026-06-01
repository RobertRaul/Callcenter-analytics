#!/usr/bin/env python3
"""Despachador de reportes automáticos.

Pensado para ejecutarse CADA MINUTO desde cron. Lee las programaciones de
`report_schedules` (administradas desde el panel /users) y dispara las que
coinciden con el día/hora actuales. Evita duplicados con `last_run` (un envío
por día como máximo por cada programación).

Uso desde cron (un solo job reemplaza a las 4 líneas fijas):
    * * * * * root /opt/callcenter-analytics/backend/venv/bin/python \
        /opt/callcenter-analytics/backend/dispatch_reports.py >> /var/log/callcenter-reports.log 2>&1
"""
import sys
import logging
from datetime import datetime

sys.path.insert(0, "/opt/callcenter-analytics/backend/src")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("dispatch_reports")

from services import report_mailer        # noqa: E402
from services import schedules_store       # noqa: E402


def _should_run(sched: dict, now: datetime) -> bool:
    """¿Corresponde disparar esta programación en este minuto?"""
    if not sched.get("enabled"):
        return False

    # Hora exacta (HH:MM)
    if (sched.get("time") or "").strip() != now.strftime("%H:%M"):
        return False

    # Ya se ejecutó hoy
    today = now.strftime("%Y-%m-%d")
    if sched.get("last_run") == today:
        return False

    freq = sched.get("freq")
    if freq == "daily":
        return True
    if freq == "weekly":
        # weekday(): 0=Lunes .. 6=Domingo (coincide con nuestro modelo de days)
        return now.weekday() in (sched.get("days") or [])
    if freq == "monthly":
        return now.day == (sched.get("day_of_month") or 0)
    return False


def main() -> int:
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    schedules = schedules_store.list_schedules()

    fired = 0
    for sched in schedules:
        try:
            if not _should_run(sched, now):
                continue
        except Exception as e:  # noqa: BLE001
            logger.error("Error evaluando programación #%s: %s", sched.get("id"), e)
            continue

        sid = sched.get("id")
        rtype = sched.get("report_type")
        recipients = sched.get("recipients") or ""
        logger.info("Disparando programación #%s (%s) -> %s", sid, rtype, recipients)
        # Marcar antes de enviar para evitar doble disparo si el envío tarda
        # y el cron se solapa en el siguiente minuto.
        schedules_store.mark_run(sid, today)
        try:
            ok = report_mailer.run(rtype, recipients)
            logger.info("Programación #%s (%s): %s", sid, rtype,
                        "enviado" if ok else "NO enviado (revisa destinatarios/SMTP)")
            fired += 1
        except Exception as e:  # noqa: BLE001
            logger.error("Fallo al ejecutar programación #%s (%s): %s", sid, rtype, e)

    if fired == 0:
        logger.debug("Sin programaciones para %s", now.strftime("%Y-%m-%d %H:%M"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
