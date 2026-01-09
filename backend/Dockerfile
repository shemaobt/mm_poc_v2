# Production Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

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

# Use gunicorn for production - must use exec form with ENTRYPOINT
CMD ["gunicorn", "app.main:app", "--workers", "1", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8080", "--timeout", "120"]
