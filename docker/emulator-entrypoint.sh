#!/bin/sh
set -e

echo "ENTRYPOINT SCRIPT STARTED - $(date)" > /app/entrypoint.log

# Function to handle container shutdown
handle_shutdown() {
  echo "Container shutdown signal received, gracefully stopping emulators..."
  firebase emulators:stop
  exit 0
}

# Set up signal trapping
trap handle_shutdown SIGTERM SIGINT

# Check for Auth data specifically
if [ -d "/app/data/auth_export" ]; then
  echo "Found Auth data for import" >> /app/entrypoint.log
else
  echo "No Auth data found in import directory" >> /app/entrypoint.log
fi

# Check if data directory has content
if [ -d "/app/data" ] && [ "$(ls -A /app/data 2>/dev/null)" ]; then
  echo "Starting Firebase emulators with import from /app/data" >> /app/entrypoint.log
  # List data directory contents before import
  ls -la /app/data >> /app/entrypoint.log
  
  # Start emulators with ALL services and import
  exec firebase emulators:start \
    --project=dnd-campaign-companion \
    --import=/app/data \
    --only=auth,firestore,functions,storage
else
  echo "Starting Firebase emulators without import" >> /app/entrypoint.log
  exec firebase emulators:start \
    --project=dnd-campaign-companion \
    --only=auth,firestore,functions,storage
fi