"""Fixtures compartidas para pruebas de la API GymPro."""

import os
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@gympro.com")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "admin123")

API = "/api/v1"


@pytest.fixture
async def client():
    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            yield ac


async def _login(client: AsyncClient, email: str, password: str):
    return await client.post(
        f"{API}/auth/login",
        data={"username": email, "password": password},
    )


@pytest.fixture
async def admin_token(client: AsyncClient) -> str:
    response = await _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    if response.status_code != 200:
        pytest.skip(
            f"Admin no disponible ({ADMIN_EMAIL}). Ejecuta: python scripts/seed_admin.py"
        )
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(admin_token: str):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def unique_email():
    return f"test_{uuid.uuid4().hex[:10]}@example.com"


async def register_student(client: AsyncClient, email: str, password: str = "Test1234!"):
    return await client.post(
        f"{API}/auth/register",
        json={
            "nombre": "Estudiante Prueba",
            "email": email,
            "password": password,
            "telefono": "70000001",
            "registro_univercotario": f"RU-{uuid.uuid4().hex[:6].upper()}",
            "carrera": "Ingenieria de Sistemas",
        },
    )
