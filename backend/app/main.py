"""
FastAPI Main Application
Functional approach with minimal side effects
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import connect_db, disconnect_db
from app.api import passages, participants, relations, events, discourse, bhsa, ai, export, metrics, auth, users, pericopes, tripod, audio
from app.services.bhsa_service import get_bhsa_service
import threading


def _load_bhsa_background():
    """Load BHSA data in a background thread"""
    try:
        print("[STARTUP] Loading BHSA data in background...")
        bhsa_service = get_bhsa_service()
        bhsa_service.load_bhsa()
        print("[STARTUP] BHSA data loaded successfully!")
    except Exception as e:
        print(f"[STARTUP] Failed to load BHSA data: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    # Startup
    await connect_db()
    
    # Start BHSA loading in background thread (don't block app startup)
    threading.Thread(target=_load_bhsa_background, daemon=True).start()
    
    yield
    # Shutdown
    await disconnect_db()


def create_app() -> FastAPI:
    """Pure function to create FastAPI application"""
    app = FastAPI(
        title="Biblical Meaning Maps API",
        version="2.0.0",
        description="API for semantic analysis of Biblical Hebrew passages",
        lifespan=lifespan,
    )

    # CORS middleware - allow frontend origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://localhost:3000",
            "https://mm-poc-v2-frontend-f7ssqjozfq-uc.a.run.app",
            "https://mm-poc-v2-frontend-718681737495.us-central1.run.app",
            "https://mmpoc.shemaywam.com",
        ],
        allow_origin_regex=r"https://mm-poc-v2-frontend.*\.run\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
    app.include_router(users.router, prefix="/api/users", tags=["Users"])
    app.include_router(bhsa.router, prefix="/api/bhsa", tags=["BHSA"])
    app.include_router(pericopes.router, tags=["Pericopes"])
    app.include_router(passages.router, prefix="/api/passages", tags=["Passages"])
    app.include_router(participants.router, prefix="/api", tags=["Participants"])
    app.include_router(relations.router, prefix="/api", tags=["Relations"])
    app.include_router(events.router, prefix="/api", tags=["Events"])
    app.include_router(discourse.router, prefix="/api", tags=["Discourse"])
    app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
    app.include_router(export.router, prefix="/api/maps", tags=["Export"])
    app.include_router(metrics.router, prefix="/api/metrics", tags=["Metrics"])
    app.include_router(tripod.router, prefix="/api/tripod", tags=["Tripod Studio"])
    app.include_router(audio.router, prefix="/api/audio", tags=["Audio"])

    @app.get("/")
    async def root():
        return {
            "name": "Biblical Meaning Maps API",
            "version": "2.0.0",
            "docs": "/docs",
        }

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    return app


app = create_app()
