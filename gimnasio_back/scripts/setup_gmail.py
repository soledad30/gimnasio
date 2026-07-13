"""
Configura Gmail real en .env y prueba el envío de correo.

Uso:
  cd gimnasio_back
  python scripts/setup_gmail.py

Necesitas:
  - Cuenta Gmail con verificación en 2 pasos activada
  - Contraseña de aplicación: https://myaccount.google.com/apppasswords
"""
import asyncio
import getpass
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"


def _set_env_var(content: str, key: str, value: str) -> str:
    line = f"{key}={value}"
    pattern = rf"^{re.escape(key)}=.*$"
    if re.search(pattern, content, flags=re.MULTILINE):
        return re.sub(pattern, line, content, count=1, flags=re.MULTILINE)
    return content.rstrip() + "\n" + line + "\n"


def _prompt_gmail() -> str:
    while True:
        gmail = input("Gmail del gimnasio (ej. uagrm.gym@gmail.com): ").strip().lower()
        if gmail and "@" in gmail and gmail.endswith("@gmail.com"):
            return gmail
        print("  Ingresa un correo @gmail.com válido.")


def _prompt_app_password() -> str:
    print(
        "\nContraseña de aplicación de Google (16 caracteres, no tu contraseña normal).\n"
        "Crear en: https://myaccount.google.com/apppasswords\n"
    )
    while True:
        pwd = getpass.getpass("Contraseña de aplicación: ").strip()
        normalized = pwd.replace(" ", "")
        if len(normalized) >= 16:
            return pwd
        print("  Debe tener al menos 16 caracteres. Vuelve a pegarla.")


def _prompt_destino(default: str) -> str:
    destino = input(f"Correo de prueba [{default}]: ").strip() or default
    if "@" not in destino:
        print("Correo de prueba inválido.")
        sys.exit(1)
    return destino


def update_env(gmail: str, app_password: str) -> None:
    if not ENV_PATH.exists():
        print(f"No existe {ENV_PATH}. Copia .env.example a .env primero.")
        sys.exit(1)

    content = ENV_PATH.read_text(encoding="utf-8")
    content = _set_env_var(content, "SMTP_HOST", "smtp.gmail.com")
    content = _set_env_var(content, "SMTP_PORT", "587")
    content = _set_env_var(content, "SMTP_USER", gmail)
    content = _set_env_var(content, "SMTP_PASSWORD", app_password)
    content = _set_env_var(content, "EMAILS_FROM_EMAIL", gmail)
    content = _set_env_var(content, "EMAILS_FROM_NAME", "UAGRM-GYM")
    content = _set_env_var(content, "EMAIL_DEV_LOG_TO_CONSOLE", "false")
    ENV_PATH.write_text(content, encoding="utf-8")
    print(f"\n✓ Guardado en {ENV_PATH}")


async def test_send(destino: str) -> bool:
    # Recargar settings tras editar .env
    from importlib import reload
    import app.core.config as config_module
    import app.services.email_service as email_module

    reload(config_module)
    reload(email_module)

    from app.services.email_service import email_service

    print(f"\nEnviando correo de prueba a {destino}...")
    ok = await email_service.send_temp_password(destino, "Prueba UAGRM-GYM", "TestSmtp123!")
    return ok


def main() -> None:
    print("=" * 60)
    print("  Configuración Gmail — UAGRM-GYM")
    print("=" * 60)

    gmail = _prompt_gmail()
    app_password = _prompt_app_password()
    destino = _prompt_destino(gmail)

    update_env(gmail, app_password)

    ok = asyncio.run(test_send(destino))
    if ok:
        print("\n✓ Correo enviado. Revisa bandeja de entrada y spam.")
        print("  Reinicia el backend si ya estaba corriendo:")
        print("  python -m uvicorn app.main:app --reload --port 8000")
    else:
        print("\n✗ No se pudo enviar. Revisa:")
        print("  - Verificación en 2 pasos activa en Google")
        print("  - Contraseña de aplicación correcta (tipo Correo)")
        print("  - Conexión a internet")
        sys.exit(1)


if __name__ == "__main__":
    main()
