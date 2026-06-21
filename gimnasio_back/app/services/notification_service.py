from dataclasses import dataclass

from app.models.usuario import Usuario
from app.services.email_service import email_service


@dataclass
class NotificationResult:
    enviado_email: bool = False
    enviado_sms: bool = False


async def send_temp_password(user: Usuario, password: str) -> NotificationResult:
    result = NotificationResult()
    if user.email:
        result.enviado_email = await email_service.send_temp_password(
            user.email, user.nombre, password
        )
    # SMS: integrar Twilio u otro proveedor aquí
    return result
