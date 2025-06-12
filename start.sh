#!/bin/bash

# Start the backend server
echo "Starting backend server..."
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start the frontend dev server
echo "Starting frontend dev server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Function to handle script termination
function cleanup {
  echo "Stopping servers..."
  kill $BACKEND_PID
  kill $FRONTEND_PID
  exit
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

# Keep the script running
echo "Both servers are running. Press Ctrl+C to stop."
wait 