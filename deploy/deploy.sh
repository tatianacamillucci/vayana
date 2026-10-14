#!/bin/bash
set -e

REPO_DIR="/home/vayana/vayana"
API_DIR="$REPO_DIR/vayana-api"
FRONTEND_ENV="$REPO_DIR/.env"

echo "==> [1/5] Pulling latest code..."
git config --global --add safe.directory "$REPO_DIR"
cd "$REPO_DIR"
git fetch origin
git reset --hard origin/master

echo "==> [2/5] Ensuring frontend .env (baked at build time by Vite)..."
printf 'VITE_USE_BACKEND=true\nVITE_API_URL=/api\n' > "$FRONTEND_ENV"
echo "Frontend .env ready: VITE_USE_BACKEND=true VITE_API_URL=/api"

echo "==> [3/5] Building backend..."
cd "$API_DIR"
npm install
npx prisma generate
npm run build
npx prisma migrate deploy

echo "==> [4/5] Building frontend..."
cd "$REPO_DIR"
npm install
npm run build

echo "==> [5/5] Restarting API..."
pm2 restart vayana-api

echo "==> Deploy complete!"
