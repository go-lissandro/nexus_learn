"""
NexusLearn — Schemas Pydantic (validação de request/response)
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator


# ─── AUTH ────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    is_admin: bool


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Senha deve ter no mínimo 8 caracteres")
        return v


# ─── SESSÕES ─────────────────────────────────────────────

class SessionOut(BaseModel):
    id: int
    session_id: str
    user_id: int
    is_active: bool
    ip_address: Optional[str]
    user_agent: Optional[str]
    device_info: Optional[str]
    created_at: datetime
    last_seen_at: Optional[datetime]
    revoked_at: Optional[datetime]
    revoke_reason: Optional[str]

    model_config = {"from_attributes": True}


class RevokeSessionRequest(BaseModel):
    reason: Optional[str] = "Revogado pelo administrador"


# ─── USUÁRIOS ────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    is_admin: bool
    xp_total: int
    level: int
    streak_days: int
    created_at: datetime
    last_activity_at: Optional[datetime]

    model_config = {"from_attributes": True}


class UserWithSessionsOut(UserOut):
    sessions: List[SessionOut] = []


class UpdateUserRequest(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    full_name: Optional[str] = None


# ─── GAMIFICAÇÃO ─────────────────────────────────────────

class GamificationProgress(BaseModel):
    xp_total: int
    level: int
    streak_days: int
    xp_to_next_level: int
    badges_count: int


class XPAwardRequest(BaseModel):
    user_id: int
    amount: int = Field(..., ge=-10_000, le=10_000, description="XP a somar (negativo remove)")


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    avatar_url: Optional[str]
    xp_total: int
    level: int


# ─── ADMIN DASHBOARD ─────────────────────────────────────

class AdminStats(BaseModel):
    total_users: int
    active_users: int
    active_sessions: int
    new_users_today: int
    new_users_week: int
    total_courses: int
    lessons_completed_today: int
