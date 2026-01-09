#!/bin/bash
set -e

# Check for GCS_SERVICE_ACCOUNT_JSON_B64 and create credential file
if [ -n "$GCS_SERVICE_ACCOUNT_JSON_B64" ]; then
    echo "🔑 Found GCS_SERVICE_ACCOUNT_JSON_B64, creating gcs_creds.json..."
    echo "$GCS_SERVICE_ACCOUNT_JSON_B64" | base64 -d > /app/gcs_creds.json
    export GOOGLE_APPLICATION_CREDENTIALS=/app/gcs_creds.json
fi

# Run migrations in background to not block startup
echo "🔄 Running database sync in background..."
(prisma db push --accept-data-loss && python scripts/seed_admin.py) &

echo "🚀 Starting server..."
exec "$@"
