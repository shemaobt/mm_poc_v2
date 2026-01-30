# Production Dockerfile using uv
FROM python:3.11-slim AS builder

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install system dependencies needed for building
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files, README (hatchling metadata), and app package for build
COPY pyproject.toml uv.lock README.md ./
COPY app ./app

# Install dependencies using uv (creates .venv in /app)
RUN uv sync --frozen --no-dev

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Install same system dependencies as Dockerfile.dev (stage that runs prisma generate)
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy application code
COPY . .

# Add venv to PATH
ENV PATH="/app/.venv/bin:$PATH"

# Generate Prisma client
RUN prisma generate

# Pre-load BHSA data during build (downloads from ETCBC/bhsa public repo)
RUN python -c "from tf.app import use; use('ETCBC/bhsa', silent=False)"

ENV PORT=8080
EXPOSE 8080

# Ensure entrypoint is executable
RUN chmod +x entrypoint.sh

# Use entrypoint script to handle secrets and db setup
ENTRYPOINT ["./entrypoint.sh"]

# Use gunicorn for production
CMD ["gunicorn", "app.main:app", "--workers", "1", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8080", "--timeout", "120"]
