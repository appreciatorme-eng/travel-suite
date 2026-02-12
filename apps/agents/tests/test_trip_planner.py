"""
Tests for the Trip Planner multi-agent team.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestTripPlannerAgent:
    """Tests for trip planner functionality."""

    @pytest.mark.asyncio
    async def test_plan_trip_basic(self, mock_trip_data, mock_user_id):
        """Test basic trip planning with required parameters."""
        with patch("agents.trip_planner.trip_planner_team") as mock_team:
            mock_team.arun = AsyncMock(
                return_value=MagicMock(
                    content="Day 1: Arrive in Bali, check into hotel..."
                )
            )

            from agents.trip_planner import plan_trip

            result = await plan_trip(
                destination=mock_trip_data["destination"],
                duration_days=mock_trip_data["duration_days"],
                budget=mock_trip_data["budget"],
                interests=mock_trip_data["interests"],
                travel_style=mock_trip_data["travel_style"],
                user_id=mock_user_id,
            )

            assert result["destination"] == "Bali, Indonesia"
            assert result["duration_days"] == 5
            assert result["budget"] == 2000.0
            assert "plan" in result
            assert result["agents_used"] == ["Researcher", "Planner", "Budgeter"]

    @pytest.mark.asyncio
    async def test_plan_trip_without_budget(self, mock_trip_data, mock_user_id):
        """Test trip planning without budget constraint."""
        with patch("agents.trip_planner.trip_planner_team") as mock_team:
            mock_team.arun = AsyncMock(
                return_value=MagicMock(content="Flexible budget itinerary...")
            )

            from agents.trip_planner import plan_trip

            result = await plan_trip(
                destination=mock_trip_data["destination"],
                duration_days=mock_trip_data["duration_days"],
                budget=None,  # No budget
                user_id=mock_user_id,
            )

            assert result["destination"] == "Bali, Indonesia"
            assert result["budget"] is None

    @pytest.mark.asyncio
    async def test_plan_trip_with_interests(self, mock_trip_data):
        """Test that interests are included in the prompt."""
        with patch("agents.trip_planner.trip_planner_team") as mock_team:
            mock_team.arun = AsyncMock(
                return_value=MagicMock(content="Interest-focused itinerary...")
            )

            from agents.trip_planner import plan_trip

            await plan_trip(
                destination="Tokyo, Japan",
                duration_days=7,
                interests=["anime", "ramen", "technology"],
                travel_style="budget",
            )

            # Verify the team was called
            mock_team.arun.assert_called_once()
            call_args = mock_team.arun.call_args[0][0]
            assert "anime" in call_args or "ramen" in call_args

    def test_trip_itinerary_model_validation(self):
        """Test Pydantic model validation for TripItinerary."""
        from agents.trip_planner import TripItinerary, DayPlan, Activity

        activity = Activity(
            time="09:00",
            title="Visit Temple",
            description="Visit the famous temple",
            duration_minutes=120,
            location="Tanah Lot",
            cost_estimate=10.0,
        )

        day = DayPlan(
            day_number=1,
            theme="Cultural Exploration",
            activities=[activity],
            meals=["Local warung for lunch"],
            notes="Wear modest clothing",
        )

        itinerary = TripItinerary(
            destination="Bali",
            duration_days=1,
            total_budget=500.0,
            best_time_to_visit="May-October",
            days=[day],
        )

        assert itinerary.destination == "Bali"
        assert len(itinerary.days) == 1
        assert itinerary.days[0].activities[0].title == "Visit Temple"

    def test_activity_model_defaults(self):
        """Test Activity model default values."""
        from agents.trip_planner import Activity

        activity = Activity(
            time="10:00",
            title="Test Activity",
            description="Test",
            duration_minutes=60,
            location="Test Location",
        )

        assert activity.cost_estimate == 0  # Default value


class TestTripPlannerTeam:
    """Tests for the multi-agent team configuration."""

    def test_team_has_correct_agents(self):
        """Test that the team has all required agents."""
        from agents.trip_planner import researcher, planner, budgeter

        assert researcher.name == "Researcher"
        assert planner.name == "Planner"
        assert budgeter.name == "Budgeter"

    def test_researcher_has_tools(self):
        """Test that researcher agent has search tools."""
        from agents.trip_planner import researcher

        assert researcher.tools is not None
        assert len(researcher.tools) > 0

    def test_planner_instructions(self):
        """Test that planner has proper instructions."""
        from agents.trip_planner import planner

        assert planner.instructions is not None
        assert len(planner.instructions) > 0
        # Check for key instruction topics
        instructions_text = " ".join(planner.instructions).lower()
        assert "itinerar" in instructions_text or "plan" in instructions_text

    def test_budgeter_instructions(self):
        """Test that budgeter has cost-related instructions."""
        from agents.trip_planner import budgeter

        instructions_text = " ".join(budgeter.instructions).lower()
        assert "cost" in instructions_text or "budget" in instructions_text
