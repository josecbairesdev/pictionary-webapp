from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.api.routes import router as api_router
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Pictionary API", description="Backend API for Pictionary Web App")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Mount static files (for production)
# app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")

@app.get("/")
async def root():
    return {"message": "Welcome to Pictionary API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 