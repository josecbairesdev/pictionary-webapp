# Pictionary Web App

A real-time Pictionary game built with React, TypeScript, Tailwind CSS, and FastAPI.

## Features

- Real-time drawing and guessing using WebSockets
- Multiple game rooms
- Score tracking
- Timer-based rounds
- Word selection
- Mobile-friendly drawing canvas
- Responsive design
- **Solo play supported**

## Tech Stack

### Frontend
- React
- TypeScript
- Tailwind CSS
- Vite

### Backend
- FastAPI
- WebSockets
- Pydantic

## Project Structure

```
pictionary-webapp/
├── frontend/           # React TypeScript frontend
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   └── styles/     # CSS and Tailwind styles
│   ├── public/         # Static assets
│   └── package.json    # Frontend dependencies
└── backend/            # FastAPI backend
    ├── app/
    │   └── api/        # API routes
    ├── requirements.txt # Backend dependencies
    └── main.py         # Entry point
```

## Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- npm or yarn

## Setup Instructions

### Backend Setup

1. Create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install  # or: yarn install
   ```

2. Start the development server:
   ```bash
   npm run dev  # or: yarn dev
   ```

### Quick Start (Both Frontend and Backend)

Use the provided script to start both servers (the backend venv will be activated automatically):
```bash
./start.sh
```

## How to Play

1. Create a room or join an existing one
2. You can play solo or with friends (solo play is supported)
3. Start the game
4. The player who is drawing will receive a word to draw
5. Other players (or you, in solo) try to guess the word by typing in the chat
6. Points are awarded for correct guesses and successful drawings
7. The player with the highest score at the end wins

**Note:** Player info is stored in your browser's localStorage. For solo play, use the same browser tab/session.

## API Documentation

When the backend is running, you can access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Deployment

### Frontend

Build the frontend for production:
```bash
cd frontend
npm run build
```

The build output will be in the `frontend/dist` directory.

### Backend

For production deployment, consider using Gunicorn with Uvicorn workers:
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

## Troubleshooting

- **WebSocket connection fails (403):** Make sure you join the room before connecting, and use the same browser tab/session.
- **Port already in use:** Kill previous servers with `pkill -f uvicorn; pkill -f vite`.
- **Frontend or backend not starting:** Ensure Node.js, npm, and Python dependencies are installed.
- **Changes not showing up:** Stop the servers and run `./start.sh` again.

## License

MIT 