"""
NexusLearn — Router: Gamificação
GET  /gamification/progress        — XP, nível, streak do usuário logado
GET  /gamification/leaderboard     — top 20 usuários por XP
POST /gamification/xp/award        — concede XP a um usuário (admin)
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from core.database import get_db
from core.security import get_current_user, require_admin
from models.gamification import UserBadge
from models.user import User
from schemas.schemas import GamificationProgress, LeaderboardEntry, XPAwardRequest

router = APIRouter(prefix="/gamification", tags=["Gamificação"])

XP_PER_LEVEL = 1000  # Cada nível requer 1000 XP a mais


@router.get("/progress", response_model=GamificationProgress)
async def get_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    xp_to_next = (current_user.level * XP_PER_LEVEL) - current_user.xp_total
    # Contagem via query: acessar current_user.badges dispararia lazy-load,
    # que não é permitido em sessão async (MissingGreenlet).
    badges_count = await db.scalar(
        select(func.count()).select_from(UserBadge).where(UserBadge.user_id == current_user.id)
    )
    return GamificationProgress(
        xp_total=current_user.xp_total,
        level=current_user.level,
        streak_days=current_user.streak_days,
        xp_to_next_level=max(0, xp_to_next),
        badges_count=badges_count or 0,
    )


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def leaderboard(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .where(User.is_active == True)
        .order_by(User.xp_total.desc())
        .limit(20)
    )
    users = result.scalars().all()
    return [
        LeaderboardEntry(
            rank=i + 1,
            user_id=u.id,
            username=u.username,
            avatar_url=u.avatar_url,
            xp_total=u.xp_total,
            level=u.level,
        )
        for i, u in enumerate(users)
    ]


def level_for_xp(xp_total: int) -> int:
    """Nível 1 de 0 a 999 XP, nível 2 de 1000 a 1999, e assim por diante."""
    return xp_total // XP_PER_LEVEL + 1


@router.post("/xp/award", response_model=LeaderboardEntry)
async def award_xp(
    body: XPAwardRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = await db.get(User, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    user.xp_total = max(0, user.xp_total + body.amount)
    user.level = level_for_xp(user.xp_total)
    await db.commit()
    await db.refresh(user)

    rank = await db.scalar(
        select(func.count()).select_from(User).where(
            User.is_active == True, User.xp_total > user.xp_total  # noqa: E712
        )
    )
    return LeaderboardEntry(
        rank=(rank or 0) + 1,
        user_id=user.id,
        username=user.username,
        avatar_url=user.avatar_url,
        xp_total=user.xp_total,
        level=user.level,
    )
