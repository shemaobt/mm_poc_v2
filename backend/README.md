# Backend

FastAPI + Prisma (PostgreSQL). Dependencies managed with **uv** (`pyproject.toml`, `uv.lock`).

## Setup

```bash
uv sync
cp .env.example .env
uv run prisma generate
uv run prisma migrate dev
uv run uvicorn app.main:app --reload
```

## API docs

http://localhost:8000/docs

## Structure

```
app/
├── api/        # HTTP route handlers (thin; call services only)
├── ai/         # LLM client, prompts, schemas, context builders
├── core/       # config, database, auth
├── models/     # Pydantic schemas
├── services/   # business logic and data access
└── main.py
prisma/
├── schema.prisma
└── migrations/
scripts/        # seed, import, etc.
pyproject.toml
uv.lock
```
