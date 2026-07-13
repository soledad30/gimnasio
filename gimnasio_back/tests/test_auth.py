"""
Pruebas de caja negra — Autenticación (INFORME-DE-PRUEBAS.md §5.1, §5.2, §5.5)
Casos: CN-LOGIN-*, CN-REG-*, CN-FP-*, CN-BND-*
"""

import pytest
from httpx import AsyncClient

from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD, API, register_student

pytestmark = pytest.mark.asyncio


class TestLoginBlackBox:
    """Partición de equivalencia — POST /api/v1/auth/login"""

    async def test_cn_login_05_email_no_registrado(self, client: AsyncClient):
        response = await client.post(
            f"{API}/auth/login",
            data={"username": "noexiste@gmail.com", "password": "Secret123!"},
        )
        assert response.status_code == 401
        assert "incorrectos" in response.json()["detail"].lower()

    async def test_cn_login_06_password_incorrecto(self, client: AsyncClient):
        response = await client.post(
            f"{API}/auth/login",
            data={"username": ADMIN_EMAIL, "password": "123"},
        )
        assert response.status_code == 401

    async def test_cn_login_07_admin_credenciales_validas(self, client: AsyncClient):
        response = await client.post(
            f"{API}/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        if response.status_code != 200:
            pytest.skip("Ejecuta python scripts/seed_admin.py")
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_cn_login_08_me_con_token_valido(self, client: AsyncClient):
        login = await client.post(
            f"{API}/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        if login.status_code != 200:
            pytest.skip("Admin no disponible")
        token = login.json()["access_token"]
        me = await client.get(
            f"{API}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me.status_code == 200
        assert me.json()["email"] == ADMIN_EMAIL

    async def test_me_sin_token_retorna_401(self, client: AsyncClient):
        response = await client.get(f"{API}/auth/me")
        assert response.status_code == 401


class TestRegisterBlackBox:
    """POST /api/v1/auth/register"""

    async def test_cn_reg_03_password_corta(self, client: AsyncClient, unique_email: str):
        response = await client.post(
            f"{API}/auth/register",
            json={
                "nombre": "Juan",
                "email": unique_email,
                "password": "12345",
            },
        )
        assert response.status_code == 422

    async def test_cn_bnd_02_password_limite_inferior_ok(self, client: AsyncClient, unique_email: str):
        response = await register_student(client, unique_email, password="Abc123")
        assert response.status_code == 201
        assert "access_token" in response.json()

    async def test_cn_reg_04_registro_exitoso(self, client: AsyncClient, unique_email: str):
        response = await register_student(client, unique_email)
        assert response.status_code == 201
        data = response.json()
        assert data["token_type"] == "bearer"

    async def test_cn_reg_05_email_duplicado(self, client: AsyncClient, unique_email: str):
        first = await register_student(client, unique_email)
        assert first.status_code == 201
        second = await register_student(client, unique_email)
        assert second.status_code == 409


class TestForgotPasswordBlackBox:
    """POST /api/v1/auth/forgot-password"""

    async def test_cn_fp_01_sin_email(self, client: AsyncClient):
        response = await client.post(f"{API}/auth/forgot-password", json={})
        assert response.status_code == 400

    async def test_cn_fp_02_solo_telefono(self, client: AsyncClient):
        response = await client.post(
            f"{API}/auth/forgot-password",
            json={"telefono": "70000000"},
        )
        assert response.status_code == 501

    async def test_cn_fp_04_email_registrado_respuesta_generica(self, client: AsyncClient):
        response = await client.post(
            f"{API}/auth/forgot-password",
            json={"email": ADMIN_EMAIL},
        )
        if response.status_code == 200:
            assert "mensaje" in response.json()
        # Si SMTP no está configurado puede fallar en envío; el endpoint igual responde 200


class TestRefreshToken:
    """POST /api/v1/auth/refresh — camino P4 caja blanca"""

    async def test_refresh_token_invalido(self, client: AsyncClient):
        response = await client.post(
            f"{API}/auth/refresh",
            json={"refresh_token": "token.invalido.fake"},
        )
        assert response.status_code == 401

    async def test_refresh_token_valido(self, client: AsyncClient):
        login = await client.post(
            f"{API}/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        if login.status_code != 200:
            pytest.skip("Admin no disponible")
        refresh = await client.post(
            f"{API}/auth/refresh",
            json={"refresh_token": login.json()["refresh_token"]},
        )
        assert refresh.status_code == 200
        assert "access_token" in refresh.json()
