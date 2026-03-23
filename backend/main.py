"""
NexusLearn — FastAPI App Entry Point
Rode com: uvicorn main:app --reload
Docs:     http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.database import init_db
from routers import auth, admin, gamification


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="NexusLearn API",
    description="Plataforma de cursos com gamificação e controle de sessões.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(gamification.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "NexusLearn API"}
