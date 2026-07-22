# Control de acceso por huella — Proteus ↔ GymPro

Simulación sin hardware físico: Arduino en **Proteus** envía IDs de huella por puerto serial virtual (**COMPIM**), un puente Python llama a la API del gimnasio, y la pantalla **Admin → Acceso** muestra entrada/salida.

```
[Proteus]  Botón = huella  →  Arduino UART  →  COMPIM (COMx)
                                                    ↓
                              bridge_serial.py  →  POST /api/v1/acceso/huella-scan
                                                    ↓
                              GymPro (BD + /admin/acceso)
```

> Proteus usa proyectos binarios `.pdsprj` propios: no se puede generar un archivo válido desde aquí. Abajo tenés el esquema exacto para armarlo en 5–10 minutos + el firmware listo.

---

## 1. Requisitos

- Proteus 8 (Schematic Capture + Arduino)
- Par de puertos COM virtuales: [com0com](https://sourceforge.net/projects/com0com/) (recomendado en Windows)
- Backend GymPro corriendo (`http://127.0.0.1:8000`)
- Python 3.10+

---

## 2. Esquema en Proteus

### Componentes (Pick Devices)

| Componente | Librería / nombre | Cant. |
|---|---|---|
| Arduino Uno | `ARDUINO UNO R3` | 1 |
| COMPIM | `COMPIM` | 1 |
| Botón | `BUTTON` | 4 |
| LED | `LED-GREEN`, `LED-RED` | 1+1 |
| Resistencia | `RES` 220 Ω | 2 (LEDs) |
| Buzzer (opc.) | `SOUNDER` / `BUZZER` | 1 |
| Virtual Terminal (opc.) | `VIRTUAL TERMINAL` | 1 (solo debug; **no** al mismo COM que el bridge) |

### Conexiones

| Arduino | Destino |
|---|---|
| D2 | Botón 1 → GND (huella `HUELLA-001`) |
| D3 | Botón 2 → GND (`HUELLA-002`) |
| D4 | Botón 3 → GND (`HUELLA-003`) |
| D5 | Botón 4 → GND (`HUELLA-004`) |
| D8 | LED verde (+ ánodo vía 220 Ω; cátodo a GND) |
| D9 | LED rojo (+ ánodo vía 220 Ω; cátodo a GND) |
| D10 | Buzzer (+) / GND |
| TX (D1) | COMPIM **RXD** |
| RX (D0) | COMPIM **TXD** |
| GND | COMPIM GND + GND común botones/LEDs |

### COMPIM (doble clic → Edit Properties)

- **Physical Port**: un COM del par virtual, p. ej. `COM5`  
  (com0com: emparejá `COM4` ↔ `COM5`; el bridge usa uno y Proteus el otro. Evitá COM3 si ya lo usa el sistema.)
- **Baud Rate**: `9600`
- **Data Bits**: 8 · Parity: None · Stop Bits: 1

### Firmware

1. En el Arduino de Proteus → Program File → apuntá al `.hex` compilado, **o**
2. Compilá `firmware/acceso_huella/acceso_huella.ino` con Arduino IDE y cargá el HEX en el componente.

Código fuente: `proteus_huella/firmware/acceso_huella/acceso_huella.ino`

---

## 3. Preparar la base de datos

Asigná IDs de huella a estudiantes (usa el campo `nfc_uid`):

```bash
cd gimnasio_back
python ../proteus_huella/seed_huellas_demo.py
```

O manualmente: **Admin → Estudiantes → Asignar NFC/huella** → `HUELLA-001`, etc.

Los estudiantes necesitan membresía o inscripción pagada (igual que con NFC). Podés usar `scripts/seed_acceso_julio.py`.

---

## 4. Puente serial

```bash
cd proteus_huella
pip install -r requirements.txt
python bridge_serial.py --list          # ver COMs
python bridge_serial.py --port COM4     # un extremo del par; Proteus usa el otro (ej. COM5)
```

Variables opcionales:

```
HUELLA_COM_PORT=COM3
HUELLA_BAUDRATE=9600
GYMPRO_API_URL=http://127.0.0.1:8000/api/v1
```

---

## 5. Probar el flujo completo

1. Arrancá backend + frontend.
2. Abrí `/admin/acceso`.
3. Corré `bridge_serial.py`.
4. En Proteus: **Play** (simulación).
5. Pulsá un botón (D2…D5).
6. Debés ver:
   - En consola del bridge: `← FP:HUELLA-001` y `→ OK` o `→ DENY`
   - LED verde/rojo en Proteus
   - Toast + historial en la web

Sin Proteus podés probar la API/UI con los botones **HUELLA-001…004** en la página de Acceso.

---

## Protocolo serial

| Dirección | Mensaje |
|---|---|
| Arduino → PC | `FP:HUELLA-001\n` |
| PC → Arduino | `OK\n` / `DENY\n` / `ERR\n` |

API:

```http
POST /api/v1/acceso/huella-scan
Content-Type: application/json

{"huella_id": "HUELLA-001", "modo": "auto"}
```

Misma lógica de negocio que NFC (membresía, ficha, un ingreso por día).

---

## Diagrama del circuito

```
        [BTN1]──D2┐
        [BTN2]──D3┤
        [BTN3]──D4┼── Arduino Uno ──TX/RX── COMPIM ── COMx ── bridge_serial.py ── API
        [BTN4]──D5┤         │
                  │         ├── D8 ── LED verde
                 GND        ├── D9 ── LED rojo
                            └── D10 ─ buzzer
```

---

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| Bridge no abre COM | Otro programa usa el puerto (Virtual Terminal, Arduino IDE). Cerralo o usá el otro extremo del par com0com. |
| `ERR` en LEDs | Backend apagado o URL incorrecta (`--api`). |
| Siempre `DENY` | ID no asignado al estudiante, o sin membresía/inscripción/ficha. |
| Nada al pulsar botón | Simulación no en Play; botones a GND; firmware no cargado. |
