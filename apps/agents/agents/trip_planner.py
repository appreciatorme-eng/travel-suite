"""
Trip Planner Multi-Agent Team
Coordinates Researcher, Planner, and Budgeter agents for comprehensive trip planning
"""
import os
from typing import Optional
from pydantic import BaseModel, Field

from agno.agent import Agent
from agno.team import Team
from agno.models.openai import OpenAIChat
from agno.tools.duckduckgo import DuckDuckGoTools


# Structured output models
class Activity(BaseModel):
    """A single activity in the itinerary."""

    time: str = Field(description="Start time (e.g., '09:00')")
    title: str = Field(description="Activity name")
    description: str = Field(description="Brief description of the activity")
    duration_minutes: int = Field(description="Duration in minutes")
    location: str = Field(description="Location/venue name")
    cost_estimate: float = Field(description="Estimated cost in USD", default=0)


class DayPlan(BaseModel):
    """A single day's itinerary."""

    day_number: int
    date: Optional[str] = None
    theme: str = Field(description="Day theme (e.g., 'Cultural Exploration')")
    activities: list[Activity]
    meals: list[str] = Field(default_factory=list, description="Recommended meal spots")
    notes: str = Field(default="", description="Additional notes for the day")


class TripItinerary(BaseModel):
    """Complete trip itinerary."""

    destination: str
    duration_days: int
    total_budget: float
    currency: str = "USD"
    best_time_to_visit: str
    days: list[DayPlan]
    packing_tips: list[str] = Field(default_factory=list)
    local_tips: list[str] = Field(default_factory=list)


# Researcher Agent - Gathers destination information
researcher = Agent(
    name="Researcher",
    role="Research destinations, activities, and local information",
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[DuckDuckGoTools()],
    instructions=[
        "Find accurate, up-to-date destination information",
        "Research local activities, restaurants, and attractions",
        "Check weather patterns for the travel dates",
        "Find unique local experiences and hidden gems",
        "Research transportation options and logistics",
        "Always cite sources when providing information",
    ],
    markdown=True,
    show_tool_calls=True,
)

# Planner Agent - Creates detailed itineraries
planner = Agent(
    name="Planner",
    role="Create day-by-day itineraries with realistic timing",
    model=OpenAIChat(id="gpt-4o"),
    instructions=[
        "Create realistic, well-paced itineraries",
        "Consider travel times between locations",
        "Balance activities with rest time",
        "Include breakfast, lunch, and dinner recommendations",
        "Group nearby activities to minimize travel",
        "Consider opening hours and busy periods",
        "Include both popular attractions and local favorites",
    ],
    markdown=True,
)

# Budgeter Agent - Optimizes costs
budgeter = Agent(
    name="Budgeter",
    role="Optimize trip costs and find deals",
    model=OpenAIChat(id="gpt-4o-mini"),
    instructions=[
        "Estimate realistic costs for all activities",
        "Find budget-friendly alternatives when possible",
        "Calculate transportation costs between locations",
        "Include accommodation cost estimates",
        "Track total trip budget and breakdown",
        "Suggest money-saving tips for the destination",
        "Consider local currency and exchange rates",
    ],
    markdown=True,
)


# Create the Trip Planner Team
trip_planner_team = Team(
    name="TripPlannerTeam",
    agents=[researcher, planner, budgeter],
    instructions=[
        "Work together to create comprehensive trip plans",
        "Researcher goes first to gather destination information",
        "Planner uses research to create the itinerary",
        "Budgeter optimizes costs and adds financial details",
        "Always provide actionable, practical recommendations",
        "Consider the user's preferences, budget, and travel style",
    ],
    mode="sequential",  # Agents work in order
)


async def plan_trip(
    destination: str,
    duration_days: int,
    budget: Optional[float] = None,
    interests: Optional[list[str]] = None,
    travel_style: str = "balanced",
    user_id: Optional[str] = None,
) -> dict:
    """
    Plan a trip using the multi-agent team.

    Args:
        destination: Where the user wants to go
        duration_days: How many days
        budget: Optional budget constraint in USD
        interests: List of interests (e.g., ['food', 'history', 'adventure'])
        travel_style: One of 'budget', 'balanced', 'luxury'
        user_id: Optional user ID for personalization

    Returns:
        Complete trip plan with itinerary
    """
    # Build the prompt
    prompt_parts = [
        f"Plan a {duration_days}-day trip to {destination}.",
    ]

    if budget:
        prompt_parts.append(f"Budget: ${budget} USD total.")

    if interests:
        prompt_parts.append(f"Interests: {', '.join(interests)}.")

    prompt_parts.append(f"Travel style: {travel_style}.")
    prompt_parts.append(
        "Please provide a detailed day-by-day itinerary with activities, "
        "timings, cost estimates, and local tips."
    )

    prompt = " ".join(prompt_parts)

    # Run the team
    response = await trip_planner_team.arun(prompt)

    return {
        "destination": destination,
        "duration_days": duration_days,
        "budget": budget,
        "travel_style": travel_style,
        "plan": response.content,
        "agents_used": ["Researcher", "Planner", "Budgeter"],
    }


# Structured output version for API
async def plan_trip_structured(
    destination: str,
    duration_days: int,
    budget: Optional[float] = None,
    interests: Optional[list[str]] = None,
    travel_style: str = "balanced",
) -> TripItinerary:
    """
    Plan a trip and return structured output.
    """
    # Create a single agent with structured output for final formatting
    formatter = Agent(
        name="TripFormatter",
        model=OpenAIChat(id="gpt-4o"),
        response_model=TripItinerary,
        instructions=[
            "Format the trip plan into a structured itinerary",
            "Include all days with detailed activities",
            "Ensure cost estimates are realistic",
        ],
    )

    # First get the detailed plan from the team
    team_result = await plan_trip(
        destination=destination,
        duration_days=duration_days,
        budget=budget,
        interests=interests,
        travel_style=travel_style,
    )

    # Then format it
    format_prompt = f"""
    Based on this trip plan, create a structured itinerary:

    {team_result['plan']}

    Destination: {destination}
    Duration: {duration_days} days
    Budget: ${budget or 'flexible'}
    """

    response = await formatter.arun(format_prompt)
    return response.content
