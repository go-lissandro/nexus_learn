"""
NexusLearn — Router: Painel Administrativo
Todas as rotas exigem is_admin=True.

GET  /admin/stats                          — métricas do painel
GET  /admin/users                          — lista todos os usuários
GET  /admin/users/{user_id}               — detalhes + sessões de um usuário
PATCH /admin/users/{user_id}              — ativa/desativa conta, altera role
GET  /admin/sessions                       — lista todas as sessões ativas
GET  /admin/users/{user_id}/sessions      — sessões de um usuário específico
POST /admin/sessions/{session_id}/revoke  — revoga uma sessão específica
POST /admin/users/{user_id}/revoke-all   — revoga TODAS as sessões de um usuário
"""
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from core.database import get_db
from core.security import require_admin
from models.user import User, UserSession
from schemas.schemas import (
    AdminStats, UserOut, UserWithSessionsOut,
    SessionOut, RevokeSessionRequest, UpdateUserRequest,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── ESTATÍSTICAS ─────────────────────────────────────────

@router.get("/stats", response_model=AdminStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    active_users = (await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )).scalar()
    active_sessions = (await db.execute(
        select(func.count(UserSession.id)).where(UserSession.is_active == True)
    )).scalar()
    new_today = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= today_start)
    )).scalar()
    new_week = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_start)
    )).scalar()

    return AdminStats(
        total_users=total_users or 0,
        active_users=active_users or 0,
        active_sessions=active_sessions or 0,
        new_users_today=new_today or 0,
        new_users_week=new_week or 0,
        total_courses=0,  # plugar quando Course estiver integrado
        lessons_completed_today=0,
    )


# ─── GERENCIAMENTO DE USUÁRIOS ────────────────────────────

@router.get("/users", response_model=List[UserOut])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    only_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(User).offset(skip).limit(limit).order_by(User.created_at.desc())
    if search:
        query = query.where(
            (User.username.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )
    if only_active is not None:
        query = query.where(User.is_active == only_active)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/users/{user_id}", response_model=UserWithSessionsOut)
async def get_user_detail(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    sessions_result = await db.execute(
        select(UserSession)
        .where(UserSession.user_id == user_id)
        .order_by(UserSession.created_at.desc())
        .limit(20)
    )
    user.sessions = sessions_result.scalars().all()
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    body: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Não é possível alterar sua própria conta aqui.")

    if body.is_active is not None:
        user.is_active = body.is_active
        # Se desativando conta, revoga todas as sessões
        if not body.is_active:
            await _revoke_all_sessions(user_id, admin.id, "Conta desativada pelo admin", db)

    if body.is_admin is not None:
        user.is_admin = body.is_admin

    if body.full_name is not None:
        user.full_name = body.full_name

    await db.commit()
    await db.refresh(user)
    return user


# ─── GERENCIAMENTO DE SESSÕES ─────────────────────────────

@router.get("/sessions", response_model=List[SessionOut])
async def list_active_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    only_active: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = (
        select(UserSession)
        .order_by(UserSession.last_seen_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if only_active:
        query = query.where(UserSession.is_active == True)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/users/{user_id}/sessions", response_model=List[SessionOut])
async def list_user_sessions(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(UserSession)
        .where(UserSession.user_id == user_id)
        .order_by(UserSession.created_at.desc())
    )
    return result.scalars().all()


@router.post("/sessions/{session_id}/revoke", status_code=200)
async def revoke_session(
    session_id: str,
    body: RevokeSessionRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Revoga uma sessão específica pelo session_id (UUID).
    O usuário dono dessa sessão receberá 401 na próxima requisição.
    """
    result = await db.execute(
        select(UserSession).where(UserSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Sessão já está inativa.")

    session.is_active = False
    session.revoked_at = datetime.now(timezone.utc)
    session.revoked_by_admin_id = admin.id
    session.revoke_reason = body.reason
    await db.commit()

    return {"message": "Sessão revogada com sucesso.", "session_id": session_id}


@router.post("/users/{user_id}/revoke-all", status_code=200)
async def revoke_all_user_sessions(
    user_id: int,
    body: RevokeSessionRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Revoga TODAS as sessões ativas de um usuário de uma vez."""
    count = await _revoke_all_sessions(user_id, admin.id, body.reason or "Revogação em massa pelo admin", db)
    return {"message": f"{count} sessão(ões) revogada(s).", "user_id": user_id}


# ─── HELPER ──────────────────────────────────────────────

async def _revoke_all_sessions(user_id: int, admin_id: int, reason: str, db: AsyncSession) -> int:
    result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.is_active == True,
        )
    )
    sessions = result.scalars().all()
    now = datetime.now(timezone.utc)
    for s in sessions:
        s.is_active = False
        s.revoked_at = now
        s.revoked_by_admin_id = admin_id
        s.revoke_reason = reason
    await db.commit()
    return len(sessions)
