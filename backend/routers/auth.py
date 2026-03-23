"""
NexusLearn — Router: Autenticação
POST /auth/register — cadastro
POST /auth/login    — login, cria sessão no banco
POST /auth/logout   — invalida a sessão atual
GET  /auth/me       — dados do usuário logado
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from core.database import get_db
from core.security import (
    hash_password, verify_password,
    create_access_token, get_current_user,
)
from models.user import User, UserSession
from schemas.schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Verifica duplicidade
    result = await db.execute(
        select(User).where(
            (User.email == body.email) | (User.username == body.username)
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email ou username já cadastrado.")

    user = User(
        username=body.username,
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    # Busca usuário
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Conta desativada. Contate o suporte.")

    # Cria sessão persistida no banco
    session_id = str(uuid.uuid4())
    session = UserSession(
        session_id=session_id,
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        device_info=_parse_device(request.headers.get("user-agent", "")),
        last_seen_at=datetime.now(timezone.utc),
    )
    db.add(session)

    # Atualiza last_activity
    user.last_activity_at = datetime.now(timezone.utc)
    await db.commit()

    token = create_access_token(user.id, session_id)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        is_admin=user.is_admin,
    )


@router.post("/logout", status_code=204)
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invalida a sessão atual do usuário (sem precisar do admin)."""
    from fastapi.security import HTTPBearer
    # A session já foi verificada em get_current_user, apenas revogamos
    result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == current_user.id,
            UserSession.is_active == True,
        )
    )
    # Revoga a sessão mais recente (a atual)
    sessions = result.scalars().all()
    for s in sessions:
        s.is_active = False
        s.revoked_at = datetime.now(timezone.utc)
        s.revoke_reason = "Logout pelo usuário"
    await db.commit()


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


def _parse_device(ua: str) -> str:
    ua = ua.lower()
    if "mobile" in ua or "android" in ua:
        return "Mobile"
    if "tablet" in ua or "ipad" in ua:
        return "Tablet"
    return "Desktop"
