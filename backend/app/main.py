"""
FastAPI Main Application
Functional approach with minimal side effects
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import connect_db, disconnect_db
from app.api import passages, participants, relations, events, discourse, bhsa, ai, export, metrics, auth, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    # Startup
    await connect_db()
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

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
    app.include_router(users.router, prefix="/api/users", tags=["Users"])
    app.include_router(bhsa.router, prefix="/api/bhsa", tags=["BHSA"])
    app.include_router(passages.router, prefix="/api/passages", tags=["Passages"])
    app.include_router(participants.router, prefix="/api", tags=["Participants"])
    app.include_router(relations.router, prefix="/api", tags=["Relations"])
    app.include_router(events.router, prefix="/api", tags=["Events"])
    app.include_router(discourse.router, prefix="/api", tags=["Discourse"])
    app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
    app.include_router(export.router, prefix="/api/maps", tags=["Export"])
    app.include_router(metrics.router, prefix="/api/metrics", tags=["Metrics"])

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
