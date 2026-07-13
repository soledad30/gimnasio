"""
Pruebas caja negra — Control de acceso NFC (INFORME §5.4)
Casos: CN-NFC-01 a CN-NFC-04
"""

import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import API, register_student

pytestmark = pytest.mark.asyncio


class TestNFCBlackBox:
    """POST /api/v1/acceso/nfc-scan — tabla de decisiones"""

    async def test_cn_nfc_01_uid_no_registrado(self, client: AsyncClient):
        uid = f"UNKNOWN-{uuid.uuid4().hex[:8].upper()}"
        response = await client.post(
            f"{API}/acceso/nfc-scan",
            json={"nfc_uid": uid},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["acceso_concedido"] is False
        assert data["tipo_movimiento"] == "denegado"
        assert "no registrado" in data["motivo_denegacion"].lower()

    async def test_cn_nfc_02_estudiante_sin_inscripcion(self, client: AsyncClient, unique_email: str):
        """Estudiante recién registrado sin inscripción confirmada → acceso denegado."""
        reg = await register_student(client, unique_email)
        assert reg.status_code == 201

        nfc_uid = f"NFC-TEST-{uuid.uuid4().hex[:8].upper()}"
        token = reg.json()["access_token"]
        # Admin asigna NFC (si hay admin)
        from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD

        admin_login = await client.post(
            f"{API}/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        if admin_login.status_code != 200:
            pytest.skip("Requiere admin para asignar NFC")

        admin_token = admin_login.json()["access_token"]
        perfil = await client.get(
            f"{API}/auth/perfil",
            headers={"Authorization": f"Bearer {token}"},
        )
        estudiante_id = perfil.json().get("estudiante_id")
        if not estudiante_id:
            pytest.skip("Sin perfil estudiante")

        assign = await client.post(
            f"{API}/estudiantes/{estudiante_id}/nfc",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nfc_uid": nfc_uid},
        )
        if assign.status_code not in (200, 201):
            pytest.skip(f"No se pudo asignar NFC: {assign.status_code}")

        scan = await client.post(f"{API}/acceso/nfc-scan", json={"nfc_uid": nfc_uid})
        assert scan.status_code == 200
        data = scan.json()
        assert data["acceso_concedido"] is False
        assert data["tipo_movimiento"] == "denegado"

    async def test_nfc_scan_requiere_body(self, client: AsyncClient):
        response = await client.post(f"{API}/acceso/nfc-scan", json={})
        assert response.status_code == 422


class TestAccesoStaff:
    """Endpoints que requieren personal autorizado."""

    async def test_monitor_sin_auth_401(self, client: AsyncClient):
        response = await client.get(f"{API}/acceso/monitor")
        assert response.status_code == 401

    async def test_monitor_con_admin(self, client: AsyncClient, auth_headers: dict):
        response = await client.get(f"{API}/acceso/monitor", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "en_gimnasio_ahora" in data
        assert "ingresos_hoy" in data
