"""
Tests for the Travel Recommender agent with learning.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestRecommenderAgent:
    """Tests for recommender functionality."""

    @pytest.mark.asyncio
    async def test_get_recommendations_basic(self, mock_user_id):
        """Test getting basic recommendations."""
        with patch("agents.recommender.recommender_agent") as mock_agent:
            mock_agent.arun = AsyncMock(
                return_value=MagicMock(
                    content="1. Bali - Perfect for beaches...\n2. Tokyo - Great for culture..."
                )
            )

            from agents.recommender import get_recommendations

            result = await get_recommendations(
                user_id=mock_user_id,
                num_recommendations=3,
            )

            assert "recommendations" in result
            assert result["user_id"] == mock_user_id
            assert result["personalized"] is True
            assert result["agent"] == "TravelRecommender"

    @pytest.mark.asyncio
    async def test_get_recommendations_with_query(self, mock_user_id):
        """Test recommendations with specific query."""
        with patch("agents.recommender.recommender_agent") as mock_agent:
            mock_agent.arun = AsyncMock(
                return_value=MagicMock(
                    content="Beach destinations in Asia..."
                )
            )

            from agents.recommender import get_recommendations

            result = await get_recommendations(
                user_id=mock_user_id,
                query="beach destinations in Asia",
            )

            # Verify query was passed to agent
            mock_agent.arun.assert_called_once()
            call_args = mock_agent.arun.call_args[0][0]
            assert "beach" in call_args.lower()
            assert "asia" in call_args.lower()

    @pytest.mark.asyncio
    async def test_get_recommendations_with_preferences(
        self, mock_user_id, mock_preferences
    ):
        """Test recommendations with explicit preferences."""
        with patch("agents.recommender.recommender_agent") as mock_agent:
            mock_agent.arun = AsyncMock(
                return_value=MagicMock(content="Based on your preferences...")
            )

            from agents.recommender import get_recommendations

            result = await get_recommendations(
                user_id=mock_user_id,
                preferences=mock_preferences,
            )

            # Verify preferences were included
            mock_agent.arun.assert_called_once()
            call_args = mock_agent.arun.call_args[0][0]
            assert "adventure" in call_args or "culture" in call_args

    @pytest.mark.asyncio
    async def test_update_preferences(self, mock_user_id):
        """Test updating user preferences."""
        with patch("agents.recommender.recommender_agent") as mock_agent:
            mock_agent.arun = AsyncMock(
                return_value=MagicMock(
                    content="Noted! I'll remember you prefer budget travel."
                )
            )

            from agents.recommender import update_preferences

            result = await update_preferences(
                user_id=mock_user_id,
                preference_type="budget",
                preference_value="budget-friendly options",
            )

            assert result["updated"] is True
            assert result["preference_type"] == "budget"

    @pytest.mark.asyncio
    async def test_provide_feedback(self, mock_user_id):
        """Test providing destination feedback."""
        with patch("agents.recommender.recommender_agent") as mock_agent:
            mock_agent.arun = AsyncMock(
                return_value=MagicMock(
                    content="Thanks for the feedback! I've noted that you enjoyed Bali."
                )
            )

            from agents.recommender import provide_feedback

            result = await provide_feedback(
                user_id=mock_user_id,
                destination="Bali, Indonesia",
                feedback="Loved the beaches and temples!",
                rating=5,
            )

            assert result["feedback_recorded"] is True
            assert result["destination"] == "Bali, Indonesia"
            assert result["rating"] == 5

    @pytest.mark.asyncio
    async def test_provide_feedback_without_rating(self, mock_user_id):
        """Test feedback without numeric rating."""
        with patch("agents.recommender.recommender_agent") as mock_agent:
            mock_agent.arun = AsyncMock(
                return_value=MagicMock(content="Thanks for sharing!")
            )

            from agents.recommender import provide_feedback

            result = await provide_feedback(
                user_id=mock_user_id,
                destination="Tokyo",
                feedback="It was okay, a bit crowded.",
                rating=None,
            )

            assert result["feedback_recorded"] is True
            assert result["rating"] is None


class TestRecommenderModels:
    """Tests for Pydantic models."""

    def test_destination_model(self):
        """Test Destination model validation."""
        from agents.recommender import Destination

        destination = Destination(
            name="Bali, Indonesia",
            tagline="Island of the Gods",
            why_visit="Perfect for beach lovers",
            best_time="May-October",
            budget_range="$100-150/day",
            highlights=["Temples", "Beaches", "Rice terraces"],
            travel_style="balanced",
            similarity_score=0.95,
        )

        assert destination.name == "Bali, Indonesia"
        assert destination.similarity_score == 0.95
        assert len(destination.highlights) == 3

    def test_destination_similarity_score_bounds(self):
        """Test similarity score validation (0-1)."""
        from agents.recommender import Destination
        from pydantic import ValidationError

        # Valid score
        dest = Destination(
            name="Test",
            tagline="Test",
            why_visit="Test",
            best_time="Test",
            budget_range="Test",
            highlights=[],
            travel_style="Test",
            similarity_score=0.5,
        )
        assert dest.similarity_score == 0.5

        # Invalid score (> 1)
        with pytest.raises(ValidationError):
            Destination(
                name="Test",
                tagline="Test",
                why_visit="Test",
                best_time="Test",
                budget_range="Test",
                highlights=[],
                travel_style="Test",
                similarity_score=1.5,
            )

    def test_recommendation_response_model(self):
        """Test RecommendationResponse model."""
        from agents.recommender import RecommendationResponse, Destination

        dest = Destination(
            name="Tokyo",
            tagline="Modern meets traditional",
            why_visit="Great food scene",
            best_time="Spring/Fall",
            budget_range="$150-200/day",
            highlights=["Food", "Culture"],
            travel_style="balanced",
            similarity_score=0.8,
        )

        response = RecommendationResponse(
            recommendations=[dest],
            personalization_note="Based on your love of food and culture",
        )

        assert len(response.recommendations) == 1
        assert response.personalization_note is not None


class TestRecommenderMemory:
    """Tests for memory and learning features."""

    def test_agent_has_learning_enabled(self):
        """Test that recommender has learning enabled."""
        from agents.recommender import recommender_agent

        assert recommender_agent.learning is True

    def test_agent_reads_user_memories(self):
        """Test that agent can read user memories."""
        from agents.recommender import recommender_agent

        assert recommender_agent.read_user_memories is True

    def test_agent_updates_user_memories(self):
        """Test that agent can update user memories."""
        from agents.recommender import recommender_agent

        assert recommender_agent.update_user_memories is True

    def test_memory_configuration(self):
        """Test memory configuration settings."""
        from agents.recommender import memory_config

        assert memory_config.create_user_memories is True
        assert memory_config.update_user_memories is True
        assert memory_config.create_session_summary is True
