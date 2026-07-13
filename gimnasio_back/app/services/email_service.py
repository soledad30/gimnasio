import logging
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)

_SMTP_PLACEHOLDER_USERS = frozenset({
    "tu@email.com", "your@email.com", "noreply@example.com", "tu@gmail.com",
})
_SMTP_PLACEHOLDER_PASSWORDS = frozenset({
    "tu_app_password", "changeme", "password",
    "xxxx xxxx xxxx xxxx", "cambia_por_contraseña_de_aplicacion",
})
_SMTP_PLACEHOLDER_PREFIXES = ("cambia_por_", "tu_", "your_")


class EmailService:
    @property
    def configured(self) -> bool:
        if not (settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD):
            return False
        user = settings.SMTP_USER.lower()
        if user in _SMTP_PLACEHOLDER_USERS or any(user.startswith(p) for p in _SMTP_PLACEHOLDER_PREFIXES):
            return False
        pwd = settings.SMTP_PASSWORD.strip().lower().replace(" ", "")
        if settings.SMTP_PASSWORD in _SMTP_PLACEHOLDER_PASSWORDS or pwd.startswith("cambiap"):
            return False
        return True

    def _log_dev_console(self, to_email: str, subject: str, text_body: str) -> None:
        if not settings.EMAIL_DEV_LOG_TO_CONSOLE:
            return
        border = "=" * 60
        logger.warning(
            "\n%s\n[DEV] Correo no enviado por SMTP — copia desde la consola:\n"
            "  Para: %s\n  Asunto: %s\n%s\n%s\n%s",
            border,
            to_email,
            subject,
            text_body,
            border,
            border,
        )

    async def send_temp_password(self, to_email: str, nombre: str, password: str) -> bool:
        if not self.configured:
            logger.warning("SMTP no configurado o usa credenciales de ejemplo; no se envió correo a %s", to_email)
            self._log_dev_console(to_email, f"{settings.EMAILS_FROM_NAME} — Contraseña temporal", (
                f"Hola {nombre},\n\n"
                f"Tu contraseña temporal es: {password}\n\n"
                "Inicia sesión y cámbiala lo antes posible."
            ))
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

        smtp_password = settings.SMTP_PASSWORD.replace(" ", "")

        try:
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=smtp_password,
                start_tls=True,
                timeout=30,
            )
            logger.info("Correo enviado a %s", to_email)
            return True
        except Exception:
            logger.exception("Error al enviar correo a %s", to_email)
            self._log_dev_console(to_email, subject, text_body)
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
        usa_qr_simple: bool = False,
        banco_nombre: str | None = None,
        banco_cuenta: str | None = None,
        banco_titular: str | None = None,
    ) -> bool:
        if not self.configured:
            logger.warning("SMTP no configurado; no se envió correo de pago a %s", to_email)
            return False

        expira_txt = expira_en.strftime("%d/%m/%Y %H:%M")
        subject = f"{settings.EMAILS_FROM_NAME} — Pago pendiente ({referencia})"
        if usa_qr_simple:
            banco_html = ""
            banco_text = ""
            if banco_nombre and banco_cuenta:
                titular = f" ({banco_titular})" if banco_titular else ""
                banco_text = (
                    f"\nAlternativa por transferencia:\n"
                    f"  Banco: {banco_nombre}\n"
                    f"  Cuenta: {banco_cuenta}{titular}\n"
                )
                banco_html = (
                    f"<p><strong>Transferencia alternativa:</strong><br>"
                    f"{banco_nombre} — cuenta <code>{banco_cuenta}</code>"
                    f"{f' — {banco_titular}' if banco_titular else ''}</p>"
                )
            text_body = (
                f"Hola {nombre},\n\n"
                f"Tienes un pago pendiente para {concepto} — {mes_label}.\n\n"
                f"Monto: Bs. {monto}\n"
                f"Referencia: {referencia}\n\n"
                f"Paga escaneando el QR Simple del gimnasio desde la app "
                f"(Yape, banca móvil o tu banco). Abre la app del gimnasio en "
                f"Inscripciones → Ver pago / QR para ver el código.\n"
                f"Incluye la referencia en el detalle del pago o muéstrala en recepción."
                f"{banco_text}\n"
                f"Válido hasta {expira_txt} ({settings.HORAS_VALIDEZ_QR_PAGO} h).\n"
                f"Si expira, puedes solicitarlo de nuevo desde la app.\n\n"
                f"Debes pagar antes de que empiece el mes para acceder al gimnasio.\n"
            )
            html_body = f"""
            <p>Hola <strong>{nombre}</strong>,</p>
            <p>Tienes un pago pendiente para <strong>{concepto}</strong> — {mes_label}.</p>
            <ul>
              <li>Monto: <strong>Bs. {monto}</strong></li>
              <li>Referencia: <strong style="font-family:monospace">{referencia}</strong></li>
            </ul>
            <p>Escanea el <strong>QR Simple</strong> del gimnasio desde Yape, banca móvil o la app de tu banco.
            En la app del gimnasio: <em>Inscripciones → Ver pago / QR</em>.</p>
            <p>Incluye la referencia en el detalle del pago o preséntala en recepción.</p>
            {banco_html}
            <p>Válido hasta <strong>{expira_txt}</strong> ({settings.HORAS_VALIDEZ_QR_PAGO} h).
            Luego puedes volver a solicitar el método de pago en la app.</p>
            <p style="color:#666;font-size:12px;">Sin pago confirmado no podrás ingresar al gimnasio.</p>
            """
        else:
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

        smtp_password = settings.SMTP_PASSWORD.replace(" ", "")

        try:
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=smtp_password,
                start_tls=True,
                timeout=30,
            )
            return True
        except Exception:
            logger.exception("Error al enviar correo de pago a %s", to_email)
            return False

    async def send_aviso_pago_staff(
        self,
        to_email: str,
        *,
        estudiante_nombre: str,
        concepto: str,
        mes_label: str,
        monto: str,
        referencia: str,
        metodo: str,
        comprobante: str | None = None,
        modo: str = "notificar",
    ) -> bool:
        if not self.configured:
            logger.warning("SMTP no configurado; no se avisó a staff el pago de %s", referencia)
            return False

        if modo == "auto":
            titulo = f"Pago autoconfirmado — {referencia}"
            accion = "El estudiante confirmó el pago automáticamente. La inscripción ya está activa."
        else:
            titulo = f"Pago reportado — revisar {referencia}"
            accion = "El estudiante avisó que ya pagó. Revisa el comprobante y confirma en Pagos."

        comp = f"\nComprobante / Nº operación: {comprobante}" if comprobante else ""
        text_body = (
            f"{accion}\n\n"
            f"Estudiante: {estudiante_nombre}\n"
            f"Concepto: {concepto} — {mes_label}\n"
            f"Monto: Bs. {monto}\n"
            f"Método: {metodo}\n"
            f"Referencia inscripción: {referencia}{comp}\n"
        )
        html_body = f"""
        <p><strong>{accion}</strong></p>
        <ul>
          <li>Estudiante: <strong>{estudiante_nombre}</strong></li>
          <li>Concepto: {concepto} — {mes_label}</li>
          <li>Monto: <strong>Bs. {monto}</strong></li>
          <li>Método: {metodo}</li>
          <li>Referencia: <code>{referencia}</code></li>
          {f'<li>Comprobante: <code>{comprobante}</code></li>' if comprobante else ''}
        </ul>
        """

        message = MIMEMultipart("alternative")
        message["Subject"] = f"{settings.EMAILS_FROM_NAME} — {titulo}"
        message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        message["To"] = to_email
        message.attach(MIMEText(text_body, "plain", "utf-8"))
        message.attach(MIMEText(html_body, "html", "utf-8"))

        smtp_password = settings.SMTP_PASSWORD.replace(" ", "")
        try:
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=smtp_password,
                start_tls=True,
                timeout=30,
            )
            return True
        except Exception:
            logger.exception("Error al avisar pago a staff %s", to_email)
            return False


email_service = EmailService()
