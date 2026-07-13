"""
Prueba el envío de correo con Gmail (variables SMTP en .env).

Uso:
  python scripts/test_smtp.py destino@correo.com
  python scripts/test_smtp.py sbareav126@ficct.uagrm.edu.bo
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.services.email_service import email_service


async def main() -> None:
    if len(sys.argv) < 2:
        print("Uso: python scripts/test_smtp.py <correo_destino>")
        sys.exit(1)

    destino = sys.argv[1].strip()
    if not destino or "@" not in destino:
        print("Indica un correo de destino válido.")
        sys.exit(1)

    print("Configuración SMTP:")
    print(f"  Host:  {settings.SMTP_HOST}:{settings.SMTP_PORT}")
    print(f"  User:  {settings.SMTP_USER}")
    print(f"  From:  {settings.EMAILS_FROM_EMAIL}")
    print(f"  OK:    {email_service.configured}")
    print()

    if not email_service.configured:
        print(
            "SMTP no está listo. En .env configura:\n"
            "  SMTP_USER=tu@gmail.com\n"
            "  SMTP_PASSWORD=contraseña_de_aplicación_de_google\n"
            "  EMAILS_FROM_EMAIL=tu@gmail.com  (mismo que SMTP_USER)"
        )
        sys.exit(1)

    print(f"Enviando correo de prueba a {destino}...")
    ok = await email_service.send_temp_password(
        destino,
        "Prueba UAGRM-GYM",
        "TestSmtp123!",
    )
    if ok:
        print("Correo enviado. Revisa la bandeja de entrada (y spam).")
    else:
        print("No se pudo enviar. Revisa la consola y la contraseña de aplicación de Google.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
