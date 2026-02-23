#!/bin/sh
set -e

# Create uploads and data directories if missing
mkdir -p /usr/src/app/uploads/reports
mkdir -p /usr/src/app/uploads/avatars

# Ensure sqlite DB file exists if using sqlite (path from docker-compose env)
if [ -z "$DB_NAME" ]; then
	DB_PATH="/usr/src/app/participium.db"
else
	DB_PATH="$DB_NAME"
fi

mkdir -p "$(dirname "$DB_PATH")"
if [ ! -f "$DB_PATH" ]; then
	touch "$DB_PATH" || true
fi

# Ensure permissions (best-effort)
chown -R node:node /usr/src/app/uploads || true
chown -R node:node "$DB_PATH" || true

echo "Starting Participium server (entrypoint)..."

# Diagnostic: list application directory and dist contents to help debug missing files
echo "PWD=$(pwd)"
echo "Listing /usr/src/app:" 
ls -la /usr/src/app || true
echo "Listing /usr/src/app/dist:" 
ls -la /usr/src/app/dist || true

# If command passed, execute it (CMD provided in Dockerfile)
exec "$@"
