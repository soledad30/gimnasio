# Gimnasio

Sistema de gestión de gimnasio con backend y frontend.

## Estructura

- `gimnasio_back/` — API (Python)
- `gimnasio_front/` — Interfaz web (React + Vite)
- `proteus_huella/` — Simulación de lector de huella en Proteus + puente serial a la API

## Configuración

Copiá los archivos `.env.example` en cada carpeta a `.env` y completá las variables antes de ejecutar.

Consultá los README de cada subproyecto para instrucciones de instalación y ejecución.

## Acceso por huella (Proteus)

Sin sensor físico: armá el esquema en Proteus, corré el puente serial y usá **Admin → Acceso**.

Ver instrucciones completas en [`proteus_huella/README.md`](proteus_huella/README.md).
