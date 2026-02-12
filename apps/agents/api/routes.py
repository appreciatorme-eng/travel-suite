"""
API Routes for GoBuddy AI Agents
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field

from agents.trip_planner import plan_trip, plan_trip_structured
from agents.support_bot import answer_question, get_quick_response
from agents.recommender import (
    get_recommendations,
    update_preferences,
    provide_feedback,
)
from api.auth import verify_supabase_token, get_user_id
from api.rate_limit import ai_limiter, general_limiter, get_client_key

logger = logging.getLogger("gobuddy.routes")

router = APIRouter()


# Request/Response Models
class TripPlanRequest(BaseModel):
    """Request body for trip planning."""

    destination: str = Field(description="Destination city/country")
    duration_days: int = Field(ge=1, le=30, description="Number of days")
    budget: Optional[float] = Field(None, description="Total budget in USD")
    interests: Optional[list[str]] = Field(
        None, description="List of interests (e.g., ['food', 'history'])"
    )
    travel_style: str = Field(
        default="balanced",
        description="One of: budget, balanced, luxury",
    )
    structured: bool = Field(
        default=False, description="Return structured JSON output"
    )


class ChatMessage(BaseModel):
    """A chat message."""

    message: str = Field(description="The user's message")
    context: Optional[dict] = Field(
        None, description="Optional context (trip_id, booking_ref, etc.)"
    )


class RecommendationRequest(BaseModel):
    """Request for destination recommendations."""

    query: Optional[str] = Field(None, description="Specific search query")
    preferences: Optional[dict] = Field(
        None,
        description="Preferences: budget, duration, interests, travel_style, avoid",
    )
    num_recommendations: int = Field(
        default=3, ge=1, le=10, description="Number of recommendations"
    )


class PreferenceUpdate(BaseModel):
    """Update a user preference."""

    preference_type: str = Field(
        description="Type: budget, style, interests, destinations, avoid"
    )
    preference_value: str = Field(description="The preference value")


class FeedbackRequest(BaseModel):
    """Feedback about a destination."""

    destination: str = Field(description="Destination name")
    feedback: str = Field(description="User feedback/comments")
    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating 1-5")


# Trip Planner Endpoints
@router.post("/chat/trip-planner")
async def chat_trip_planner(
    request: TripPlanRequest,
    raw_request: Request,
    user_id: str = Depends(get_user_id),
):
    """
    Plan a trip using the multi-agent Trip Planner team.

    The team consists of:
    - Researcher: Gathers destination information
    - Planner: Creates day-by-day itinerary
    - Budgeter: Optimizes costs and estimates expenses
    """
    try:
        ai_limiter.check(get_client_key(raw_request, user_id))
        logger.info("Trip plan request: %s for %d days by user %s",
                     request.destination, request.duration_days, user_id)
        if request.structured:
            result = await plan_trip_structured(
                destination=request.destination,
                duration_days=request.duration_days,
                budget=request.budget,
                interests=request.interests,
                travel_style=request.travel_style,
            )
            return {"success": True, "data": result.model_dump()}
        else:
            result = await plan_trip(
                destination=request.destination,
                duration_days=request.duration_days,
                budget=request.budget,
                interests=request.interests,
                travel_style=request.travel_style,
                user_id=user_id,
            )
            return {"success": True, "data": result}
    except Exception as e:
        logger.error("Trip planning failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Support Bot Endpoints
@router.post("/chat/support")
async def chat_support(
    request: ChatMessage,
    raw_request: Request,
    user_id: str = Depends(get_user_id),
):
    """
    Chat with the Support Bot agent.

    Answers customer questions using RAG (knowledge base) when available.
    Handles FAQs, policies, booking questions, and general support.
    """
    try:
        ai_limiter.check(get_client_key(raw_request, user_id))
        # Check for quick response first
        quick = get_quick_response(request.message)
        if quick:
            return {
                "success": True,
                "data": {
                    "answer": quick,
                    "quick_response": True,
                    "agent": "SupportBot",
                },
            }

        # Use the full agent
        result = await answer_question(
            question=request.message,
            context=request.context,
            user_id=user_id,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error("Support chat failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Recommender Endpoints
@router.post("/chat/recommend")
async def chat_recommend(
    request: RecommendationRequest,
    raw_request: Request,
    user_id: str = Depends(get_user_id),
):
    """
    Get personalized destination recommendations.

    The Recommender agent learns user preferences over time and
    provides increasingly personalized suggestions.
    """
    try:
        ai_limiter.check(get_client_key(raw_request, user_id))
        result = await get_recommendations(
            user_id=user_id,
            query=request.query,
            preferences=request.preferences,
            num_recommendations=request.num_recommendations,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error("Recommendation failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommend/preferences")
async def update_user_preferences(
    request: PreferenceUpdate,
    user_id: str = Depends(get_user_id),
):
    """
    Update user preferences for better recommendations.
    """
    try:
        result = await update_preferences(
            user_id=user_id,
            preference_type=request.preference_type,
            preference_value=request.preference_value,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error("Preference update failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommend/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    user_id: str = Depends(get_user_id),
):
    """
    Submit feedback about a destination for learning.
    """
    try:
        result = await provide_feedback(
            user_id=user_id,
            destination=request.destination,
            feedback=request.feedback,
            rating=request.rating,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error("Feedback submission failed: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Conversation History (optional endpoint)
@router.get("/conversations/{user_id}")
async def get_conversations(
    user_id: str,
    limit: int = 10,
    _current_user: str = Depends(get_user_id),
):
    """
    Get conversation history for a user (if stored in database).
    """
    # This would connect to the agent_conversations table
    # For now, return a placeholder
    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "conversations": [],
            "note": "Conversation history requires database integration",
        },
    }
