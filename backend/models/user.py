"""
NexusLearn — Modelos: User e UserSession
UserSession é o coração do controle de acesso:
cada login gera um session_id único.
O admin pode revogar sessões individualmente ou todas de um usuário.
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(100))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))

    # Controle de acesso
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Gamificação
    xp_total: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_activity_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relacionamentos
    sessions: Mapped[List["UserSession"]] = relationship(
        "UserSession", back_populates="user",
        foreign_keys="UserSession.user_id",
        cascade="all, delete-orphan"
    )


class UserSession(Base):
    """
    Cada login cria um registro aqui com um session_id (UUID).
    O JWT contém esse session_id — toda requisição verifica se a sessão
    ainda está ativa. Admin seta is_active=False para revogar em tempo real.
    """
    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String(36), unique=True, index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Estado da sessão
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Metadados do cliente
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))
    device_info: Mapped[Optional[str]] = mapped_column(String(200))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Revogação
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    revoked_by_admin_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    revoke_reason: Mapped[Optional[str]] = mapped_column(String(255))

    # Relacionamentos
    user: Mapped["User"] = relationship("User", back_populates="sessions", foreign_keys=[user_id])
    revoked_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[revoked_by_admin_id])
