# Pruebas automatizadas — GymPro Backend

Suite **pytest** alineada con `docs/INFORME-DE-PRUEBAS.md`.

## Requisitos

- PostgreSQL en ejecución (misma config que `.env`)
- Admin sembrado: `python scripts/seed_admin.py`
- Dependencias de desarrollo instaladas

## Instalación

```bash
cd gimnasio_back
pip install -r requirements-dev.txt
```

## Ejecutar todas las pruebas

```bash
cd gimnasio_back
pytest -v
```

## Ejecutar por módulo

```bash
pytest tests/test_auth.py -v
pytest tests/test_acceso.py -v
pytest tests/test_rbac.py -v
```

## Casos cubiertos (referencia informe)

| Archivo | Casos del informe |
|---------|-------------------|
| `test_auth.py` | CN-LOGIN-05/06/07/08, CN-REG-03/04/05, CN-FP-01/02/04, CN-BND-02 |
| `test_acceso.py` | CN-NFC-01, CN-NFC-02, monitor staff |
| `test_rbac.py` | CN-RBAC-01, 04, 06 |
| `test_health.py` | Health check |

## Variables de entorno opcionales

| Variable | Default |
|----------|---------|
| `TEST_ADMIN_EMAIL` | `admin@gympro.com` |
| `TEST_ADMIN_PASSWORD` | `admin123` |

## Postman

Importar desde `docs/postman/`:

1. `GymPro-API.postman_collection.json`
2. `GymPro-Local.postman_environment.json`

Ejecutar primero **01 — Auth → Login Admin**, luego **Runner** sobre la colección.

## Notas

- Las pruebas usan la base de datos configurada en `.env` (no aíslan en SQLite).
- El registro de estudiantes crea usuarios con email único (`test_*@gympro.test`).
- Algunos tests se omiten (`pytest.skip`) si el admin no existe.
