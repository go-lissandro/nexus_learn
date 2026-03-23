"""
NexusLearn — Router: Gamificação
GET  /gamification/progress        — XP, nível, streak do usuário logado
GET  /gamification/leaderboard     — top 20 usuários por XP
POST /gamification/xp/award        — concede XP a um usuário (admin)
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.security import get_current_user, require_admin
from models.user import User
from schemas.schemas import GamificationProgress, LeaderboardEntry

router = APIRouter(prefix="/gamification", tags=["Gamificação"])

XP_PER_LEVEL = 1000  # Cada nível requer 1000 XP a mais


@router.get("/progress", response_model=GamificationProgress)
async def get_progress(current_user: User = Depends(get_current_user)):
    xp_to_next = (current_user.level * XP_PER_LEVEL) - current_user.xp_total
    badges_count = len(current_user.badges) if hasattr(current_user, "badges") else 0
    return GamificationProgress(
        xp_total=current_user.xp_total,
        level=current_user.level,
        streak_days=current_user.streak_days,
        xp_to_next_level=max(0, xp_to_next),
        badges_count=badges_count,
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
