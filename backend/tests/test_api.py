"""
Testes de integração da API. Precisam de um Postgres acessível em DATABASE_URL
(ex.: postgresql+asyncpg://postgres:postgres@localhost:5432/nexuslearn_test).
O banco é recriado do zero a cada execução.
"""
import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/nexuslearn_test")

import main  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(main.app) as c:
        yield c


def _register(c, username):
    email = f"{username}-{uuid.uuid4().hex[:6]}@ex.com"
    r = c.post("/auth/register", json={
        "username": f"{username}-{uuid.uuid4().hex[:6]}", "email": email,
        "full_name": username, "password": "senha12345",
    })
    assert r.status_code == 201, r.text
    r = c.post("/auth/login", json={"email": email, "password": "senha12345"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"], None


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


async def _make_admin(user_id):
    # engine próprio (sem pool): o da aplicação pertence ao event loop do TestClient
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool

    engine = create_async_engine(os.environ["DATABASE_URL"], poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.execute(text("update users set is_admin = true where id = :id"), {"id": user_id})
    await engine.dispose()


def test_cadastro_login_e_me(client):
    token, _ = _register(client, "ana")
    r = client.get("/auth/me", headers=_headers(token))
    assert r.status_code == 200
    assert "hashed_password" not in r.json()


def test_senha_errada(client):
    _register(client, "beto")
    r = client.post("/auth/login", json={"email": "naoexiste@ex.com", "password": "x"})
    assert r.status_code == 401


def test_gamificacao(client):
    token, _ = _register(client, "caio")
    r = client.get("/gamification/progress", headers=_headers(token))
    assert r.status_code == 200
    assert r.json() == {"xp_total": 0, "level": 1, "streak_days": 0,
                        "xp_to_next_level": 1000, "badges_count": 0}
    assert client.get("/gamification/leaderboard").status_code == 200


def test_logout_revoga_sessao(client):
    token, _ = _register(client, "duda")
    assert client.post("/auth/logout", headers=_headers(token)).status_code == 204
    assert client.get("/auth/me", headers=_headers(token)).status_code == 401


def test_fluxo_admin(client):
    import asyncio

    admin_token, _ = _register(client, "chefe")
    admin_id = client.get("/auth/me", headers=_headers(admin_token)).json()["id"]
    aluno_token, _ = _register(client, "aluno")
    aluno_id = client.get("/auth/me", headers=_headers(aluno_token)).json()["id"]

    # aluno não acessa admin nem concede XP
    assert client.get("/admin/stats", headers=_headers(aluno_token)).status_code == 403
    assert client.post("/gamification/xp/award", headers=_headers(aluno_token),
                       json={"user_id": aluno_id, "amount": 10}).status_code == 403

    asyncio.run(_make_admin(admin_id))

    assert client.get("/admin/stats", headers=_headers(admin_token)).status_code == 200
    assert client.get("/admin/users", headers=_headers(admin_token)).status_code == 200

    r = client.post("/gamification/xp/award", headers=_headers(admin_token),
                    json={"user_id": aluno_id, "amount": 2500})
    assert r.status_code == 200, r.text
    assert r.json()["xp_total"] == 2500 and r.json()["level"] == 3

    r = client.get("/gamification/progress", headers=_headers(aluno_token))
    assert r.json()["xp_to_next_level"] == 500

    r = client.post(f"/admin/users/{aluno_id}/revoke-all", headers=_headers(admin_token), json={})
    assert r.status_code == 200
    assert client.get("/auth/me", headers=_headers(aluno_token)).status_code == 401
