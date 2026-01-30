# MM POC V2 - Biblical Meaning Maps

Modern implementation of Biblical Meaning Maps with React + FastAPI + PostgreSQL.

## Quick Start (Docker Compose)

```bash
cp backend/.env.example backend/.env
docker-compose up -d
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### First-time setup

1. Load BHSA data (10–30 minutes):
   ```bash
   curl -X POST http://localhost:8000/api/bhsa/load
   ```
2. Open http://localhost:5173

## BHSA Data

The app requires the BHSA (Biblia Hebraica Stuttgartensia Amstelodamensis) dataset.

- **Local**: Mount `~/text-fabric-data` in `docker-compose.yml` (see example).
- **Cloud (GCS)**: Mount a GCS bucket via Cloud Storage FUSE at `/app/text-fabric-data`; call `POST /api/bhsa/load` after deploy. Use CSI driver `gcsfuse.run.googleapis.com` with `bucketName` and `mountPath: /app/text-fabric-data`.

## Development

### Backend (FastAPI + uv)

```bash
cd backend
uv sync
uv run prisma generate
uv run uvicorn app.main:app --reload
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

### Database

```bash
cd backend
uv run prisma migrate dev
uv run prisma studio
```

## Architecture

- **Backend**: FastAPI, Prisma (PostgreSQL), uv, Pydantic
- **Frontend**: React, Vite, Zustand, Tailwind
- **BHSA**: text-fabric; AI: Claude/Gemini via LangChain

## Docs

- [DATA_STORAGE_EXPLAINED.md](DATA_STORAGE_EXPLAINED.md) — How meaning map data is stored and exported.
- [AGENTS.md](AGENTS.md) — Agent/LLM guidelines for this repo.
