# Backend

Python backend with FastAPI.

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Generate Prisma client
prisma generate

# Run migrations
prisma migrate dev

# Start server
uvicorn app.main:app --reload
```

## API Documentation

Once running, visit: http://localhost:8000/docs

## Project Structure

```
backend/
├── app/
│   ├── api/           # API route handlers
│   ├── core/          # Core configuration
│   ├── models/        # Pydantic models
│   ├── services/      # Business logic (functional)
│   └── main.py        # FastAPI application
├── prisma/
│   └── schema.prisma  # Database schema
├── tests/             # Tests
└── requirements.txt
```
