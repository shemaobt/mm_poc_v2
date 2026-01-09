#!/bin/bash
set -e

echo "🔄 Syncing database schema..."
prisma db push --accept-data-loss

echo "🌱 Seeding admin user..."
python scripts/seed_admin.py

echo "🚀 Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
