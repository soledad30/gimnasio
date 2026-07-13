"""
Pruebas RBAC — INFORME §5.6 (CN-RBAC-*)
"""

import pytest
from httpx import AsyncClient

from tests.conftest import API, register_student

pytestmark = pytest.mark.asyncio


class TestRBAC:
    async def test_cn_rbac_06_sin_token_usuarios_401(self, client: AsyncClient):
        response = await client.get(f"{API}/usuarios/")
        assert response.status_code == 401

    async def test_cn_rbac_04_admin_dashboard(self, client: AsyncClient, auth_headers: dict):
        response = await client.get(f"{API}/reportes/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    async def test_cn_rbac_01_estudiante_no_lista_usuarios(
        self, client: AsyncClient, unique_email: str
    ):
        reg = await register_student(client, unique_email)
        assert reg.status_code == 201
        token = reg.json()["access_token"]
        response = await client.get(
            f"{API}/usuarios/",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403

    async def test_estudiante_perfil_ok(self, client: AsyncClient, unique_email: str):
        reg = await register_student(client, unique_email)
        token = reg.json()["access_token"]
        response = await client.get(
            f"{API}/auth/perfil",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["rol"] == "estudiante"
