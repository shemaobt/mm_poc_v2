# MM POC V2 - Biblical Meaning Maps

Modern implementation of Biblical Meaning Maps with React + FastAPI + PostgreSQL.

## Quick Start (Docker Compose)

```bash
# Create .env file
cp backend/.env.example backend/.env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Running the App

1.  **Start the services**:
    ```bash
    docker-compose up --build
    ```

    - Frontend: `http://localhost:5173`
    - Backend: `http://localhost:8000`
    - API Docs: `http://localhost:8000/docs`

# BHSA Data Management

The application requires the BHSA (Biblia Hebraica Stuttgartensia Amstelodamensis) dataset to function.

### Cloud / Remote Environment (Cloud Run + GCS)

For Google Cloud Run, we use **Cloud Storage FUSE** to mount a GCS bucket as a file system. This ensures data persistence without bloating the container image.

1.  **Create a GCS Bucket**:
    Create a standard bucket (e.g., `shema-bhsa-data`).

2.  **Upload Data Manually (Recommended)**:
    Instead of using the API upload, you can upload the data once directly to the bucket.
    Your bucket structure should look like:
    `gs://shema-bhsa-data/text-fabric-data/github/...`

3.  **Configure Cloud Run**:
    Mount the bucket to `/app/text-fabric-data`.
    
    *deployment.yaml example:*
    ```yaml
    volumes:
    - name: bhsa-data
      csi:
        driver: gcsfuse.run.googleapis.com
        readOnly: false
        volumeAttributes:
          bucketName: shema-bhsa-data
          mountOptions: "implicit-dirs"
    volumeMounts:
    - name: bhsa-data
      mountPath: /app/text-fabric-data
    ```

4.  **Load Data**:
    Call `POST /api/bhsa/load` once the container starts. It will read from the mounted bucket path.

### Local Development

For local development, you can mount your local `~/text-fabric-data` directory to the container in `docker-compose.yml` (already configured in the example).

## Services

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs  
- **PostgreSQL**: localhost:5432

## First Time Setup

1. Load BHSA data (this takes 10-30 minutes):
```bash
curl -X POST http://localhost:8000/api/bhsa/load
```

2. Open the application:
```
http://localhost:5173
```

## Development

### Backend (FastAPI + Python)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
prisma generate
uvicorn app.main:app --reload
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

### Database

```bash
# Run migrations
cd backend
prisma migrate dev

# Reset database
prisma migrate reset

# Studio (GUI)
prisma studio
```

## Architecture

- **Backend**: FastAPI with functional programming approach
- **Frontend**: React + Vite + Zustand
- **Database**: PostgreSQL with Prisma ORM
- **BHSA Integration**: text-fabric Python library
- **AI**: Claude/Gemini API for semantic analysis

## License

[Your License]
