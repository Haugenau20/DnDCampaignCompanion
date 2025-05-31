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

# Check if functions directory exists and prepare it
if [ -d "/app/functions" ]; then
  echo "Found functions directory" >> /app/entrypoint.log
  
  # Install dependencies for functions if package.json exists
  if [ -f "/app/functions/package.json" ]; then
    echo "Installing dependencies for functions..." >> /app/entrypoint.log
    cd /app/functions
    npm install --quiet
    
    # Create a simple test function if needed
    mkdir -p /app/functions/src
    if [ ! -f "/app/functions/src/simpleTest.ts" ]; then
      echo "Creating a simple test function..." >> /app/entrypoint.log
      cat > /app/functions/src/simpleTest.ts << 'EOF'
import * as functions from 'firebase-functions';

export const helloWorld = functions.https.onCall((_data, _context) => {
  console.log('Hello world function called!');
  return {
    message: 'Hello from Firebase Functions!',
    timestamp: new Date().toISOString()
  };
});
EOF
    fi
    
    # Build functions if needed
    echo "Building functions..." >> /app/entrypoint.log
    npm run build

    cd /app
    echo "Functions prepared" >> /app/entrypoint.log
  else
    echo "No package.json found in functions directory" >> /app/entrypoint.log
  fi
else
  echo "No functions directory found" >> /app/entrypoint.log
  # Create a minimal functions setup
  mkdir -p /app/functions/src
  cd /app/functions
  
  # Initialize package.json
  cat > package.json << 'EOF'
{
  "name": "functions",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "22"
  },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^11.8.0",
    "firebase-functions": "^4.3.1"
  },
  "devDependencies": {
    "typescript": "^5.1.3"
  },
  "private": true
}
EOF

  # Create tsconfig.json
  cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "module": "NodeNext",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2017",
    "skipLibCheck": true
  },
  "compileOnSave": true,
  "include": [
    "src"
  ]
}
EOF

  # Create a simple function
  mkdir -p src
  cat > src/index.ts << 'EOF'
import * as functions from 'firebase-functions';

export const helloWorld = functions.https.onCall((_data, _context) => {
  console.log('Hello world function called!');
  return {
    message: 'Hello from Firebase Functions!',
    timestamp: new Date().toISOString()
  };
});
EOF

  # Install dependencies and build
  npm install --quiet
  npm run build
  
  cd /app
  echo "Created minimal functions setup" >> /app/entrypoint.log
fi

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