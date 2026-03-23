"""
NexusLearn — Security: JWT + Session Control
Toda requisição autentica o JWT e verifica se a sessão
ainda está ativa no banco — revogação em tempo real.
"""
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os

from core.database import get_db
from models.user import User, UserSession

SECRET_KEY = os.getenv("SECRET_KEY", "troque-esta-chave-em-producao")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 8

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int, session_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": str(user_id), "session_id": session_id, "exp": expire},
        SECRET_KEY, algorithm=ALGORITHM,
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Valida JWT e verifica a sessão no banco em tempo real.
    Se o admin revogou (is_active=False), retorna 401 imediatamente —
    mesmo que o token JWT ainda não tenha expirado.
    """
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sessão inválida ou expirada. Faça login novamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        session_id: str = payload.get("session_id")
        if not user_id or not session_id:
            raise unauthorized
    except JWTError:
        raise unauthorized

    # Verificação central de sessão — revogação funciona aqui
    result = await db.execute(
        select(UserSession).where(
            UserSession.session_id == session_id,
            UserSession.user_id == int(user_id),
            UserSession.is_active == True,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sua sessão foi encerrada pelo administrador.",
        )

    session.last_seen_at = datetime.now(timezone.utc)
    await db.commit()

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise unauthorized
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    return current_user
