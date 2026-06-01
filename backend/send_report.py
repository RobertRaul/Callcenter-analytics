#!/usr/bin/env python3
"""Ejecuta el envío de un reporte automático por correo.

Uso:  send_report.py {daily|weekly-exec|monthly|weekly-agents}
Pensado para ejecutarse desde cron con el Python del venv.
"""
import sys
import logging

sys.path.insert(0, "/opt/callcenter-analytics/backend/src")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from services import report_mailer  # noqa: E402


def main():
    if len(sys.argv) < 2:
        print(f"Uso: {sys.argv[0]} {{{'|'.join(report_mailer.REPORTS)}}}")
        return 2
    key = sys.argv[1]
    try:
        ok = report_mailer.run(key)
    except Exception as e:  # noqa: BLE001
        logging.error("Fallo al ejecutar el reporte '%s': %s", key, e)
        return 1
    print(f"Reporte '{key}': {'enviado' if ok else 'NO enviado (revisa destinatarios/SMTP)'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
