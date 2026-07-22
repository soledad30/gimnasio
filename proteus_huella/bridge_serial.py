"""
Puente serial Proteus (COMPIM) → API GymPro.

Lee líneas `FP:<ID>` del puerto COM virtual y llama a POST /api/v1/acceso/huella-scan.
Responde al Arduino con OK / DENY / ERR para LEDs.

Uso (desde la carpeta proteus_huella):
  pip install -r requirements.txt
  python bridge_serial.py --port COM3

Variables de entorno (opcionales):
  HUELLA_COM_PORT=COM3
  HUELLA_BAUDRATE=9600
  GYMPRO_API_URL=http://127.0.0.1:8000/api/v1
"""
from __future__ import annotations

import argparse
import os
import sys
import time

try:
    import serial
    from serial.tools import list_ports
except ImportError:
    print("Falta pyserial. Ejecutá: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)

try:
    import httpx
except ImportError:
    print("Falta httpx. Ejecutá: pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)


DEFAULT_API = os.getenv("GYMPRO_API_URL", "http://127.0.0.1:8000/api/v1").rstrip("/")
DEFAULT_PORT = os.getenv("HUELLA_COM_PORT", "COM4")
DEFAULT_BAUD = int(os.getenv("HUELLA_BAUDRATE", "9600"))


def listar_puertos() -> None:
    ports = list(list_ports.comports())
    if not ports:
        print("No se detectaron puertos COM.")
        return
    print("Puertos disponibles:")
    for p in ports:
        print(f"  {p.device:8}  {p.description}")


def parse_fp_line(line: str) -> str | None:
    raw = line.strip()
    if not raw:
        return None
    upper = raw.upper()
    if upper.startswith("FP:"):
        return raw[3:].strip()
    if upper.startswith("HUELLA:"):
        return raw[7:].strip()
    # Compat: UID NFC suelto
    if upper.startswith("READY:"):
        return None
    if len(raw) >= 4 and " " not in raw:
        return raw
    return None


def escanear_huella(api_base: str, huella_id: str) -> tuple[str, dict]:
    """Devuelve (OK|DENY|ERR, payload)."""
    url = f"{api_base}/acceso/huella-scan"
    try:
        with httpx.Client(timeout=8.0) as client:
            r = client.post(url, json={"huella_id": huella_id, "modo": "auto"})
            if r.status_code >= 500:
                return "ERR", {"mensaje": f"HTTP {r.status_code}"}
            data = r.json()
            if r.status_code >= 400:
                return "DENY", data if isinstance(data, dict) else {"mensaje": str(data)}
            concedido = bool(data.get("acceso_concedido"))
            return ("OK" if concedido else "DENY"), data
    except httpx.HTTPError as exc:
        return "ERR", {"mensaje": str(exc)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Puente Proteus huella → GymPro")
    parser.add_argument("--port", default=DEFAULT_PORT, help="Puerto COM (ej. COM3)")
    parser.add_argument("--baud", type=int, default=DEFAULT_BAUD)
    parser.add_argument("--api", default=DEFAULT_API, help="Base URL API v1")
    parser.add_argument("--list", action="store_true", help="Listar puertos COM y salir")
    args = parser.parse_args()

    if args.list:
        listar_puertos()
        return 0

    print(f"API:  {args.api}")
    print(f"COM:  {args.port} @ {args.baud}")
    print("Esperando lecturas FP:<ID>… (Ctrl+C para salir)\n")

    try:
        ser = serial.Serial(args.port, args.baud, timeout=0.2)
    except serial.SerialException as exc:
        print(f"No se pudo abrir {args.port}: {exc}", file=sys.stderr)
        print("Tip: cerrá Virtual Terminal de Proteus si usa el mismo COM, o usá com0com.")
        listar_puertos()
        return 1

    time.sleep(1.5)  # reset Arduino al abrir puerto
    buffer = ""

    try:
        while True:
            chunk = ser.read(ser.in_waiting or 1).decode("utf-8", errors="ignore")
            if not chunk:
                continue
            buffer += chunk
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line:
                    continue
                print(f"← {line}")
                huella_id = parse_fp_line(line)
                if not huella_id:
                    continue
                status, data = escanear_huella(args.api, huella_id)
                msg = data.get("mensaje") or data.get("detail") or ""
                print(f"→ {status}  [{huella_id}]  {msg}")
                ser.write(f"{status}\n".encode("utf-8"))
                ser.flush()
    except KeyboardInterrupt:
        print("\nPuente detenido.")
    finally:
        ser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
