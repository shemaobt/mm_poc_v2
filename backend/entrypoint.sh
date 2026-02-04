#!/bin/bash
set -e

if [ -f /run/secrets/.env ]; then
  set -a
  . /run/secrets/.env
  set +a
  export DATABASE_URL="${NEON_DATABASE_URL:-$DATABASE_URL}"
  export JWT_SECRET_KEY="${JWT_SECRET_KEY:-$JWT_SECRET}"
fi

# Check for GCS_SERVICE_ACCOUNT_JSON_B64 and create credential file
if [ -n "$GCS_SERVICE_ACCOUNT_JSON_B64" ]; then
    echo "🔑 Found GCS_SERVICE_ACCOUNT_JSON_B64, creating gcs_creds.json..."
    echo "$GCS_SERVICE_ACCOUNT_JSON_B64" | base64 -d > /app/gcs_creds.json
    export GOOGLE_APPLICATION_CREDENTIALS=/app/gcs_creds.json
fi

# Generate Prisma client to ensure it matches schema
echo "🔧 Generating Prisma client..."
prisma generate

# Run migrations in background to not block startup
echo "🔄 Running database sync in background..."
(prisma db push --accept-data-loss && python scripts/seed_admin.py) &

echo "🚀 Starting server..."
exec "$@"
