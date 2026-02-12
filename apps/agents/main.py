"""
GoBuddy AI Agents - FastAPI Server
Multi-agent travel assistance powered by Agno framework
"""
import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("gobuddy")

# Import agents
from agents.trip_planner import trip_planner_team
from agents.support_bot import support_agent
from agents.recommender import recommender_agent
from api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup: Load knowledge base for RAG
    logger.info("Loading knowledge base...")
    try:
        from agents.support_bot import load_knowledge
        await load_knowledge()
        logger.info("Knowledge base loaded successfully")
    except Exception as e:
        logger.warning("Could not load knowledge base: %s", e)

    yield

    # Shutdown
    logger.info("Shutting down AI agents...")


# Create FastAPI app
app = FastAPI(
    title="GoBuddy AI Agents",
    description="AI-powered travel assistance with multi-agent collaboration",
    version="1.0.0",
    lifespan=lifespan,
)

# Build allowed origins from env vars (restrict in production)
_allowed_origins = list(filter(None, [
    os.getenv("WEB_APP_URL"),
    os.getenv("MOBILE_APP_URL"),
]))
if os.getenv("ENV", "development") == "development":
    _allowed_origins += ["http://localhost:3000", "http://localhost:8081"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Client-Info", "apikey"],
)

# Include API routes
app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "GoBuddy AI Agents",
        "version": "1.0.0",
        "agents": [
            {"name": "TripPlanner", "endpoint": "/api/chat/trip-planner"},
            {"name": "SupportBot", "endpoint": "/api/chat/support"},
            {"name": "Recommender", "endpoint": "/api/chat/recommend"},
        ],
        "health": "/api/health",
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "agents": {
            "trip_planner": "ready",
            "support_bot": "ready",
            "recommender": "ready",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8001)),
        reload=os.getenv("ENV", "development") == "development",
    )
