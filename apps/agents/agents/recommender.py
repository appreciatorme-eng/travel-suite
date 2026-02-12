"""
Travel Recommender Agent with Learning
Provides personalized destination recommendations based on user preferences and history
"""
import os
from typing import Optional
from pydantic import BaseModel, Field

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.memory import Memory
from agno.tools.duckduckgo import DuckDuckGoTools


# Structured output models
class Destination(BaseModel):
    """A recommended destination."""

    name: str = Field(description="Destination name (city, country)")
    tagline: str = Field(description="Short catchy description")
    why_visit: str = Field(description="Why this destination matches user preferences")
    best_time: str = Field(description="Best time to visit")
    budget_range: str = Field(description="Budget range (e.g., '$100-150/day')")
    highlights: list[str] = Field(description="Top 3-5 highlights")
    travel_style: str = Field(description="Best suited travel style")
    similarity_score: float = Field(
        description="How well it matches preferences (0-1)", ge=0, le=1
    )


class RecommendationResponse(BaseModel):
    """Response with multiple destination recommendations."""

    recommendations: list[Destination]
    personalization_note: str = Field(
        description="Note about how recommendations were personalized"
    )


# Memory configuration for learning user preferences
memory_config = Memory(
    # User memories - persist across sessions
    create_user_memories=True,
    update_user_memories=True,
    # Session summaries
    create_session_summary=True,
    # Keep recent context
    num_history_responses=5,
)

# Recommender Agent with Learning
recommender_agent = Agent(
    name="TravelRecommender",
    model=OpenAIChat(id="gpt-4o"),
    tools=[DuckDuckGoTools()],
    memory=memory_config,
    learning=True,
    learning_mode="agentic",  # Agent decides when to learn
    read_user_memories=True,
    update_user_memories=True,
    instructions=[
        "You are a personalized travel recommendation expert for GoBuddy Adventures.",
        "Learn and remember user travel preferences, past trips, and interests.",
        "Provide destination recommendations tailored to each user's unique profile.",
        "Consider: budget preferences, travel style, interests, past destinations, and feedback.",
        "Ask clarifying questions to better understand preferences when needed.",
        "Update your understanding of the user based on their responses and choices.",
        "Suggest diverse options: popular destinations AND hidden gems.",
        "Consider seasonality, current events, and practical travel factors.",
        "Be enthusiastic but honest about destinations - mention any potential downsides.",
    ],
    markdown=True,
    show_tool_calls=True,
)


async def get_recommendations(
    user_id: str,
    query: Optional[str] = None,
    preferences: Optional[dict] = None,
    num_recommendations: int = 3,
) -> dict:
    """
    Get personalized destination recommendations.

    Args:
        user_id: User ID for personalization and memory
        query: Optional specific query (e.g., "beach destinations in Asia")
        preferences: Optional explicit preferences to consider
        num_recommendations: Number of destinations to recommend

    Returns:
        Personalized recommendations with explanations
    """
    # Build the prompt
    prompt_parts = []

    if query:
        prompt_parts.append(f"The user is looking for: {query}")
    else:
        prompt_parts.append("Suggest some great travel destinations for me.")

    if preferences:
        pref_items = []
        if preferences.get("budget"):
            pref_items.append(f"Budget: {preferences['budget']}")
        if preferences.get("duration"):
            pref_items.append(f"Duration: {preferences['duration']} days")
        if preferences.get("interests"):
            pref_items.append(f"Interests: {', '.join(preferences['interests'])}")
        if preferences.get("travel_style"):
            pref_items.append(f"Travel style: {preferences['travel_style']}")
        if preferences.get("avoid"):
            pref_items.append(f"Avoid: {', '.join(preferences['avoid'])}")

        if pref_items:
            prompt_parts.append(f"Preferences: {'; '.join(pref_items)}")

    prompt_parts.append(
        f"Please recommend {num_recommendations} destinations that would be perfect for me, "
        "explaining why each one matches my preferences."
    )

    prompt = "\n".join(prompt_parts)

    # Get response with user context (memory)
    response = await recommender_agent.arun(prompt, user_id=user_id)

    return {
        "recommendations": response.content,
        "user_id": user_id,
        "personalized": True,
        "agent": "TravelRecommender",
    }


async def get_structured_recommendations(
    user_id: str,
    query: Optional[str] = None,
    preferences: Optional[dict] = None,
    num_recommendations: int = 3,
) -> RecommendationResponse:
    """
    Get structured destination recommendations.
    """
    # Create formatter agent with structured output
    formatter = Agent(
        name="RecommendationFormatter",
        model=OpenAIChat(id="gpt-4o"),
        response_model=RecommendationResponse,
    )

    # First get natural language recommendations
    result = await get_recommendations(
        user_id=user_id,
        query=query,
        preferences=preferences,
        num_recommendations=num_recommendations,
    )

    # Format into structured output
    format_prompt = f"""
    Convert these travel recommendations into structured format:

    {result['recommendations']}

    Extract {num_recommendations} destinations with all required fields.
    """

    response = await formatter.arun(format_prompt)
    return response.content


async def update_preferences(
    user_id: str,
    preference_type: str,
    preference_value: str,
) -> dict:
    """
    Explicitly update a user preference.

    Args:
        user_id: User ID
        preference_type: Type of preference (e.g., 'budget', 'style', 'interests')
        preference_value: The preference value

    Returns:
        Confirmation of preference update
    """
    prompt = f"""
    Please note and remember this preference for future recommendations:
    - {preference_type}: {preference_value}

    Acknowledge this update briefly.
    """

    response = await recommender_agent.arun(prompt, user_id=user_id)

    return {
        "updated": True,
        "preference_type": preference_type,
        "preference_value": preference_value,
        "acknowledgment": response.content,
    }


async def provide_feedback(
    user_id: str,
    destination: str,
    feedback: str,
    rating: Optional[int] = None,
) -> dict:
    """
    Record user feedback about a destination for future learning.

    Args:
        user_id: User ID
        destination: The destination they're providing feedback on
        feedback: Their feedback/comments
        rating: Optional 1-5 rating

    Returns:
        Confirmation and updated understanding
    """
    prompt_parts = [f"I want to share my thoughts about {destination}."]

    if rating:
        prompt_parts.append(f"Rating: {rating}/5 stars.")

    prompt_parts.append(f"Feedback: {feedback}")
    prompt_parts.append(
        "Please note this for my future recommendations and let me know "
        "how this changes your understanding of my preferences."
    )

    prompt = " ".join(prompt_parts)

    response = await recommender_agent.arun(prompt, user_id=user_id)

    return {
        "feedback_recorded": True,
        "destination": destination,
        "rating": rating,
        "agent_response": response.content,
    }
