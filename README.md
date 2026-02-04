# MM POC V2 - Biblical Meaning Maps

Modern implementation of Biblical Meaning Maps with React + FastAPI + PostgreSQL.

## First-time run (someone already gave you secret access)

Prerequisites: Docker and Docker Compose, [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed. The app uses your **local** gcloud credentials (mounted into the container), so log in once on your machine with an account that has access to the secrets.

1. **Layout:** This repo (`mm_poc_v2`) and `tf` must be siblings so that `../tf/scripts` exists from the repo root. Example:
   ```
   your-workspace/
   ├── mm_poc_v2/    ← you are here
   └── tf/
       └── scripts/
   ```

2. **Start the app** (secrets are fetched from GCP at startup using your local gcloud login; no .env files):
   ```bash
   docker compose up
   ```
   BHSA is isolated in its own image: `bhsa-fetcher` downloads the dataset into a shared volume (runs in parallel with backend/frontend); once the backend is healthy and the fetcher has finished, `bhsa-load` triggers the in-memory load (can take 10–30 minutes total). Backend and frontend build without BHSA, so their build times are unaffected; the BHSA image reuses Docker layers across runs.

3. **Open:** Frontend http://localhost:5173 — Backend API http://localhost:8000 — API docs http://localhost:8000/docs

If **gcp-secrets** fails (exit 1), the backend won’t start. From the repo root run
`docker compose run --rm -e REPO_PREFIX=mm_poc_v2 gcp-secrets sh -c "/tf/scripts/gcp_secrets_to_env.sh"`
to see the script error.

## Quick reference

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## BHSA Data

The app requires the BHSA (Biblia Hebraica Stuttgartensia Amstelodamensis) dataset.

- **Docker**: A dedicated `bhsa-fetcher` service (image `mm_poc_v2_bhsa`, see `backend/Dockerfile.bhsa`) downloads BHSA into the `tf_data` volume; it is independent of backend/frontend builds and reuses cached layers. `bhsa-load` then calls `POST /api/bhsa/load` after the fetcher and backend are ready.
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
