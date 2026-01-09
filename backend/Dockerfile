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

# Pre-load BHSA data into the image
# This bakes the ~370MB data into the layer
COPY gcs_creds.json .
ENV GOOGLE_APPLICATION_CREDENTIALS=gcs_creds.json
ENV GOOGLE_CLOUD_PROJECT=gen-lang-client-0886209230
RUN python preload_data.py && rm gcs_creds.json

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
