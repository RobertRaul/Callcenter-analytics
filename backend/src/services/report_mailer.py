# services/report_mailer.py
"""Genera y envía por correo los reportes automáticos a gerencia/administración.

Reutiliza los controllers (datos) y reports_service (PDF/Excel), y email_service
para el envío con adjuntos. Los destinatarios salen del .env
(REPORT_RECIPIENTS_GERENCIA / REPORT_RECIPIENTS_ADMIN).
"""
import logging
from datetime import date, timedelta

from controllers.calls_controller import calls_controller
from controllers.agents_controller import agents_controller
from controllers.queues_controller import queues_controller
from services.reports_service import reports_service
from services import email_service
from services import settings_store
from config.settings import settings

logger = logging.getLogger(__name__)

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


# ---------- helpers de fechas ----------
def _yesterday():
    d = date.today() - timedelta(days=1)
    return d, d

def _last_7_days():
    end = date.today() - timedelta(days=1)
    return end - timedelta(days=6), end

def _prev_month():
    first_this = date.today().replace(day=1)
    end = first_this - timedelta(days=1)
    return end.replace(day=1), end


def _recipients(group: str):
    # Prioridad: config editable del panel (BD); respaldo: .env
    key = "report_recipients_gerencia" if group == "gerencia" else "report_recipients_admin"
    raw = settings_store.get_setting(key, "")
    if not raw:
        raw = settings.REPORT_RECIPIENTS_GERENCIA if group == "gerencia" else settings.REPORT_RECIPIENTS_ADMIN
    return [e.strip() for e in (raw or "").split(",") if e.strip()]


def _date_range(start, end):
    return {"start_date": start.strftime("%d/%m/%Y"), "end_date": end.strftime("%d/%m/%Y")}


def _files(report_type, data, date_range, base):
    pdf = reports_service.generate_pdf_report(data, report_type, date_range=date_range)
    xls = reports_service.generate_excel_report(data, report_type, date_range=date_range)
    return [
        {"filename": f"{base}.pdf", "content": pdf, "mime": "application/pdf"},
        {"filename": f"{base}.xlsx", "content": xls, "mime": XLSX_MIME},
    ]


def _kpi_table(stats):
    def g(k, default="—"):
        v = stats.get(k)
        return v if v is not None else default
    rows = [
        ("Total de llamadas", g("total_calls")),
        ("Contestadas", f"{g('answered_calls')} ({g('answer_rate', 0)}%)"),
        ("Abandonadas", g("abandoned_calls")),
        ("Duración promedio", f"{round(stats.get('avg_duration', 0) or 0)} s"),
    ]
    trs = "".join(
        f'<tr><td style="padding:6px 14px;color:#9E9E9E;">{k}</td>'
        f'<td style="padding:6px 14px;font-weight:bold;">{v}</td></tr>'
        for k, v in rows
    )
    return f'<table style="border-collapse:collapse;margin:12px 0;">{trs}</table>'


def _body(title, periodo, stats, extra_html=""):
    inner = (
        f"<p>Periodo: <strong>{periodo}</strong></p>"
        f"{_kpi_table(stats)}"
        f"{extra_html}"
        f"<p style='color:#9E9E9E;font-size:13px;'>Reporte completo en los adjuntos (PDF y Excel).</p>"
    )
    return email_service._layout(title, inner)


def _general_stats(start, end):
    s, e = str(start), str(end)
    stats = calls_controller.get_call_statistics(s, e)
    stats["daily_summary"] = calls_controller.get_daily_summary(s, e)
    return stats


# ---------- reportes ----------
def daily_digest():
    """Digest diario operativo (día anterior) -> Administración."""
    start, end = _yesterday()
    recipients = _recipients("admin")
    if not recipients:
        logger.warning("Digest diario: sin destinatarios (REPORT_RECIPIENTS_ADMIN vacío)")
        return False
    stats = _general_stats(start, end)
    dr = _date_range(start, end)
    files = _files("general", stats, dr, f"digest_diario_{start}")
    html = _body("Digest Diario Operativo", dr["start_date"], stats)
    return email_service.send_with_attachments(
        recipients, f"[MACSA] Digest diario operativo — {dr['start_date']}", html, files)


def weekly_executive():
    """Resumen ejecutivo semanal -> Gerencia General."""
    start, end = _last_7_days()
    recipients = _recipients("gerencia")
    if not recipients:
        logger.warning("Resumen semanal: sin destinatarios (REPORT_RECIPIENTS_GERENCIA vacío)")
        return False
    stats = _general_stats(start, end)
    dr = _date_range(start, end)
    files = _files("general", stats, dr, f"resumen_ejecutivo_{start}_{end}")
    html = _body("Resumen Ejecutivo Semanal", f"{dr['start_date']} a {dr['end_date']}", stats)
    return email_service.send_with_attachments(
        recipients, f"[MACSA] Resumen ejecutivo semanal — {dr['start_date']} a {dr['end_date']}", html, files)


def monthly():
    """Reporte mensual de desempeño -> Gerencia General."""
    start, end = _prev_month()
    recipients = _recipients("gerencia")
    if not recipients:
        logger.warning("Reporte mensual: sin destinatarios (REPORT_RECIPIENTS_GERENCIA vacío)")
        return False
    stats = _general_stats(start, end)
    dr = _date_range(start, end)
    files = _files("general", stats, dr, f"reporte_mensual_{start}_{end}")
    html = _body("Reporte Mensual de Desempeño", f"{dr['start_date']} a {dr['end_date']}", stats)
    return email_service.send_with_attachments(
        recipients, f"[MACSA] Reporte mensual de desempeño — {dr['start_date']} a {dr['end_date']}", html, files)


def weekly_agents():
    """Semanal de agentes + colas (abandono/SLA) -> Administración."""
    start, end = _last_7_days()
    recipients = _recipients("admin")
    if not recipients:
        logger.warning("Semanal de agentes: sin destinatarios (REPORT_RECIPIENTS_ADMIN vacío)")
        return False
    s, e = str(start), str(end)
    agents = agents_controller.get_agent_statistics(s, e)
    queues = queues_controller.get_queue_statistics(s, e)
    stats = _general_stats(start, end)
    dr = _date_range(start, end)
    files = _files("agents", {"agents": agents}, dr, f"agentes_{start}_{end}")
    files += _files("queues", {"queues": queues}, dr, f"colas_sla_{start}_{end}")
    html = _body("Reporte Semanal de Agentes + Colas (SLA/Abandono)",
                 f"{dr['start_date']} a {dr['end_date']}", stats)
    return email_service.send_with_attachments(
        recipients, f"[MACSA] Semanal de agentes y colas — {dr['start_date']} a {dr['end_date']}", html, files)


REPORTS = {
    "daily": daily_digest,
    "weekly-exec": weekly_executive,
    "monthly": monthly,
    "weekly-agents": weekly_agents,
}


def run(report_key: str) -> bool:
    fn = REPORTS.get(report_key)
    if not fn:
        raise ValueError(f"Reporte desconocido: {report_key}. Opciones: {list(REPORTS)}")
    return fn()
