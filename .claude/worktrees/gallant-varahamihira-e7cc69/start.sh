#!/bin/bash
# Start MockML Interview Agent (backend + frontend)

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Installing Python dependencies..."
cd "$ROOT"
pip install -r requirements.txt -q

echo "==> Starting FastAPI backend on :8000..."
PYTHONPATH="$ROOT" python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "==> Starting React frontend on :3000..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend : http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
