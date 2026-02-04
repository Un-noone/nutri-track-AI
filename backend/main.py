"""NutriTrack AI - FastAPI Backend with Google ADK."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from services import connect_to_mongodb, close_mongodb_connection
from routers import auth_router, food_router, entries_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events."""
    # Startup
    print("Starting NutriTrack AI Backend...")
    await connect_to_mongodb()
    yield
    # Shutdown
    await close_mongodb_connection()
    print("NutriTrack AI Backend stopped.")


# Create FastAPI app
app = FastAPI(
    title="NutriTrack AI",
    description="AI-powered nutrition tracking with Google ADK and MongoDB",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware - allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",  # Vite default
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(food_router)
app.include_router(entries_router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "nutritrack-ai",
        "version": "1.0.0",
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "NutriTrack AI API",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
