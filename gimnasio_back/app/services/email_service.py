import logging
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    @property
    def configured(self) -> bool:
        return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)

    async def send_temp_password(self, to_email: str, nombre: str, password: str) -> bool:
        if not self.configured:
            logger.warning("SMTP no configurado; no se envió correo a %s", to_email)
            return False

        subject = f"{settings.EMAILS_FROM_NAME} — Contraseña temporal"
        text_body = (
            f"Hola {nombre},\n\n"
            f"Tu contraseña temporal para {settings.EMAILS_FROM_NAME} es:\n\n"
            f"  {password}\n\n"
            "Inicia sesión y cámbiala lo antes posible.\n\n"
            "Si no solicitaste este cambio, contacta al administrador.\n"
        )
        html_body = f"""
        <p>Hola <strong>{nombre}</strong>,</p>
        <p>Tu contraseña temporal para <strong>{settings.EMAILS_FROM_NAME}</strong> es:</p>
        <p style="font-size:18px;font-family:monospace;background:#f4f4f4;padding:12px;border-radius:6px;">
          {password}
        </p>
        <p>Inicia sesión y cámbiala lo antes posible.</p>
        <p style="color:#666;font-size:12px;">Si no solicitaste este cambio, contacta al administrador.</p>
        """

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        message["To"] = to_email
        message.attach(MIMEText(text_body, "plain", "utf-8"))
        message.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
            )
            return True
        except Exception:
            logger.exception("Error al enviar correo a %s", to_email)
            return False

    async def send_pago_pendiente(
        self,
        to_email: str,
        nombre: str,
        *,
        concepto: str,
        mes_label: str,
        monto: str,
        referencia: str,
        qr_pago: str,
        expira_en: datetime,
    ) -> bool:
        if not self.configured:
            logger.warning("SMTP no configurado; no se envió correo de pago a %s", to_email)
            return False

        expira_txt = expira_en.strftime("%d/%m/%Y %H:%M")
        subject = f"{settings.EMAILS_FROM_NAME} — Pago pendiente ({referencia})"
        text_body = (
            f"Hola {nombre},\n\n"
            f"Tienes un pago pendiente para {concepto} — {mes_label}.\n\n"
            f"Monto: Bs. {monto}\n"
            f"Referencia / transacción: {referencia}\n"
            f"Código QR: {qr_pago}\n\n"
            f"Este método de pago está habilitado hasta {expira_txt} "
            f"({settings.HORAS_VALIDEZ_QR_PAGO} horas).\n"
            f"Si expira, puedes solicitarlo de nuevo desde la app.\n\n"
            f"Debes pagar antes de que empiece el mes para acceder al gimnasio.\n"
        )
        html_body = f"""
        <p>Hola <strong>{nombre}</strong>,</p>
        <p>Tienes un pago pendiente para <strong>{concepto}</strong> — {mes_label}.</p>
        <ul>
          <li>Monto: <strong>Bs. {monto}</strong></li>
          <li>Referencia: <strong style="font-family:monospace">{referencia}</strong></li>
          <li>QR: <strong style="font-family:monospace">{qr_pago}</strong></li>
        </ul>
        <p>Válido hasta <strong>{expira_txt}</strong> ({settings.HORAS_VALIDEZ_QR_PAGO} h).
        Luego puedes volver a solicitar el método de pago en la app.</p>
        <p style="color:#666;font-size:12px;">Sin pago confirmado no podrás ingresar al gimnasio.</p>
        """

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        message["To"] = to_email
        message.attach(MIMEText(text_body, "plain", "utf-8"))
        message.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
            )
            return True
        except Exception:
            logger.exception("Error al enviar correo de pago a %s", to_email)
            return False


email_service = EmailService()
