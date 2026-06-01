# services/email_service.py
"""Envío de correo vía SMTP (Google Workspace / Gmail).

Configuración en .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD,
SMTP_FROM, SMTP_FROM_NAME, APP_BASE_URL.
"""
import smtplib
import ssl
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.utils import formataddr
from email import encoders

from config.settings import settings

logger = logging.getLogger(__name__)

MACSA_BLUE = "#2196F3"
MACSA_GOLD = "#D4AF37"


def is_configured() -> bool:
    """True si hay credenciales SMTP suficientes para enviar."""
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def send_email(to_email: str, subject: str, html_body: str, text_body: str = None) -> bool:
    """Envía un correo. Devuelve True si se envió, False si falló o no hay config.
    No lanza excepción para no romper el flujo de creación de usuarios."""
    if not is_configured():
        logger.warning("SMTP no configurado (faltan SMTP_USER/SMTP_PASSWORD); no se envía correo a %s", to_email)
        return False

    from_addr = settings.SMTP_FROM or settings.SMTP_USER
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((settings.SMTP_FROM_NAME, from_addr))
    msg["To"] = to_email

    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            server.starttls(context=context)
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(from_addr, [to_email], msg.as_string())
        logger.info("Correo enviado a %s (%s)", to_email, subject)
        return True
    except Exception as e:  # noqa: BLE001
        logger.error("Error enviando correo a %s: %s", to_email, e)
        return False


def send_with_attachments(recipients, subject: str, html_body: str, attachments=None,
                          text_body: str = None) -> bool:
    """Envía un correo (HTML) con adjuntos a uno o varios destinatarios.
    recipients: str o lista de str.
    attachments: lista de dicts {filename, content (bytes), mime}.
    Devuelve True si se envió a al menos un destinatario."""
    if not is_configured():
        logger.warning("SMTP no configurado; no se envía reporte a %s", recipients)
        return False

    if isinstance(recipients, str):
        recipients = [recipients]
    recipients = [r.strip() for r in recipients if r and r.strip()]
    if not recipients:
        logger.warning("Sin destinatarios válidos para el reporte '%s'", subject)
        return False

    from_addr = settings.SMTP_FROM or settings.SMTP_USER
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = formataddr((settings.SMTP_FROM_NAME, from_addr))
    msg["To"] = ", ".join(recipients)

    alt = MIMEMultipart("alternative")
    if text_body:
        alt.attach(MIMEText(text_body, "plain", "utf-8"))
    alt.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(alt)

    for att in (attachments or []):
        part = MIMEBase("application", "octet-stream")
        part.set_payload(att["content"])
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{att["filename"]}"')
        if att.get("mime"):
            part.replace_header("Content-Type", att["mime"]) if part.get("Content-Type") else part.add_header("Content-Type", att["mime"])
        msg.attach(part)

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
            server.starttls(context=context)
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(from_addr, recipients, msg.as_string())
        logger.info("Reporte enviado a %s (%s)", recipients, subject)
        return True
    except Exception as e:  # noqa: BLE001
        logger.error("Error enviando reporte a %s: %s", recipients, e)
        return False


def _layout(title: str, inner_html: str) -> str:
    """Plantilla HTML básica con branding MACSA."""
    return f"""
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;padding:24px;">
      <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;
                  box-shadow:0 4px 16px rgba(0,0,0,.08);">
        <div style="background:linear-gradient(135deg,{MACSA_BLUE},{MACSA_GOLD});padding:20px 24px;color:#fff;">
          <div style="font-size:20px;font-weight:bold;">MACSA · Call Center Analytics</div>
          <div style="font-size:14px;opacity:.95;">{title}</div>
        </div>
        <div style="padding:24px;color:#333;font-size:15px;line-height:1.6;">
          {inner_html}
        </div>
        <div style="padding:16px 24px;border-top:1px solid #f0f0f0;color:#9E9E9E;font-size:12px;">
          Este es un correo automático, por favor no respondas a este mensaje.
        </div>
      </div>
    </div>
    """


def send_temp_password_email(to_email: str, full_name: str, username: str,
                             temp_password: str, is_new: bool = True) -> bool:
    """Envía usuario + contraseña temporal (creación o reseteo)."""
    login_url = settings.APP_BASE_URL
    titulo = "Tu cuenta ha sido creada" if is_new else "Restablecimiento de contraseña"
    intro = (
        "Se ha creado una cuenta para ti en el sistema de Call Center Analytics."
        if is_new else
        "Se ha restablecido la contraseña de tu cuenta."
    )

    inner = f"""
      <p>Hola <strong>{full_name or username}</strong>,</p>
      <p>{intro} Estos son tus datos de acceso:</p>
      <table style="margin:16px 0;border-collapse:collapse;">
        <tr><td style="padding:6px 12px;color:#9E9E9E;">Usuario</td>
            <td style="padding:6px 12px;font-weight:bold;">{username}</td></tr>
        <tr><td style="padding:6px 12px;color:#9E9E9E;">Contraseña temporal</td>
            <td style="padding:6px 12px;font-weight:bold;font-family:monospace;
                       background:#f6f8fa;border-radius:6px;">{temp_password}</td></tr>
      </table>
      <p>Por seguridad, <strong>deberás cambiar esta contraseña</strong> la primera vez que inicies sesión.</p>
      <p style="margin:24px 0;">
        <a href="{login_url}" style="background:{MACSA_BLUE};color:#fff;text-decoration:none;
           padding:12px 22px;border-radius:8px;font-weight:bold;display:inline-block;">
           Iniciar sesión
        </a>
      </p>
      <p style="color:#9E9E9E;font-size:13px;">O ingresa a: {login_url}</p>
    """
    text = (
        f"Hola {full_name or username},\n\n{intro}\n\n"
        f"Usuario: {username}\nContraseña temporal: {temp_password}\n\n"
        f"Deberás cambiarla en tu primer inicio de sesión.\nIngresa a: {login_url}\n"
    )
    return send_email(to_email, f"[MACSA] {titulo}", _layout(titulo, inner), text)
