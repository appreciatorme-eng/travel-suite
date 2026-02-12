"""
Shared dependencies for API routes.
Database connections, authentication, etc.
"""
import os
from typing import Optional
from fastapi import Header, HTTPException
import httpx

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


async def verify_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """
    Verify user authentication via Supabase JWT.

    Returns user_id if authenticated, None if no auth header.
    Raises HTTPException if token is invalid.
    """
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        # If Supabase not configured, accept any token (dev mode)
        return "dev_user"

    # Verify token with Supabase
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_SERVICE_KEY,
            },
        )

        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user_data = response.json()
        return user_data.get("id")


async def get_supabase_client():
    """
    Get an async Supabase client for database operations.

    Note: For production, consider using supabase-py async client.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None

    # Return connection details for manual operations
    return {
        "url": SUPABASE_URL,
        "key": SUPABASE_SERVICE_KEY,
    }


# Database URL for Agno agents (PostgreSQL)
def get_database_url() -> Optional[str]:
    """Get the database URL for agent memory/learning storage."""
    return os.getenv("DATABASE_URL")
