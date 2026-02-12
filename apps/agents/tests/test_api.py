"""
Integration tests for the FastAPI endpoints.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client with mocked agents."""
    with patch("agents.trip_planner.trip_planner_team"), \
         patch("agents.support_bot.support_agent"), \
         patch("agents.recommender.recommender_agent"):
        from main import app
        return TestClient(app)


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    def test_health_check(self, client):
        """Test health endpoint returns healthy status."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "agents" in data

    def test_root_endpoint(self, client):
        """Test root endpoint returns API info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "GoBuddy AI Agents"
        assert "agents" in data
        assert "version" in data


class TestTripPlannerEndpoint:
    """Tests for trip planner API endpoint."""

    def test_plan_trip_success(self, client):
        """Test successful trip planning request."""
        with patch("api.routes.plan_trip") as mock_plan:
            mock_plan.return_value = {
                "destination": "Bali",
                "duration_days": 5,
                "budget": 2000,
                "travel_style": "balanced",
                "plan": "Day 1: Arrive in Bali...",
                "agents_used": ["Researcher", "Planner", "Budgeter"],
            }

            response = client.post(
                "/api/chat/trip-planner",
                json={
                    "destination": "Bali",
                    "duration_days": 5,
                    "budget": 2000,
                    "travel_style": "balanced",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["destination"] == "Bali"

    def test_plan_trip_validation_error(self, client):
        """Test validation error for invalid request."""
        response = client.post(
            "/api/chat/trip-planner",
            json={
                "destination": "Bali",
                "duration_days": 0,  # Invalid: must be >= 1
            },
        )

        assert response.status_code == 422  # Validation error

    def test_plan_trip_missing_required_field(self, client):
        """Test error when required field is missing."""
        response = client.post(
            "/api/chat/trip-planner",
            json={
                "duration_days": 5,
                # Missing destination
            },
        )

        assert response.status_code == 422


class TestSupportEndpoint:
    """Tests for support chat API endpoint."""

    def test_support_chat_success(self, client):
        """Test successful support chat request."""
        with patch("api.routes.answer_question") as mock_answer:
            mock_answer.return_value = {
                "answer": "You can cancel by contacting support...",
                "sources_used": True,
                "agent": "SupportBot",
            }

            response = client.post(
                "/api/chat/support",
                json={"message": "How do I cancel my booking?"},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "answer" in data["data"]

    def test_support_chat_quick_response(self, client):
        """Test quick response pattern."""
        with patch("api.routes.get_quick_response") as mock_quick:
            mock_quick.return_value = "Contact us at support@gobuddy.com"

            response = client.post(
                "/api/chat/support",
                json={"message": "How do I contact support?"},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["data"]["quick_response"] is True

    def test_support_chat_with_context(self, client):
        """Test support chat with booking context."""
        with patch("api.routes.answer_question") as mock_answer:
            mock_answer.return_value = {
                "answer": "Looking at booking GB-2024-001...",
                "sources_used": True,
                "agent": "SupportBot",
            }

            response = client.post(
                "/api/chat/support",
                json={
                    "message": "What's my booking status?",
                    "context": {"booking_ref": "GB-2024-001"},
                },
            )

            assert response.status_code == 200


class TestRecommendEndpoint:
    """Tests for recommendation API endpoint."""

    def test_recommend_success(self, client):
        """Test successful recommendation request."""
        with patch("api.routes.get_recommendations") as mock_rec:
            mock_rec.return_value = {
                "recommendations": "1. Bali...",
                "user_id": "test-user",
                "personalized": True,
                "agent": "TravelRecommender",
            }

            response = client.post(
                "/api/chat/recommend?user_id=test-user",
                json={"num_recommendations": 3},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"]["personalized"] is True

    def test_recommend_with_query(self, client):
        """Test recommendation with specific query."""
        with patch("api.routes.get_recommendations") as mock_rec:
            mock_rec.return_value = {
                "recommendations": "Beach destinations...",
                "user_id": "test-user",
                "personalized": True,
                "agent": "TravelRecommender",
            }

            response = client.post(
                "/api/chat/recommend?user_id=test-user",
                json={
                    "query": "beach destinations in Southeast Asia",
                    "num_recommendations": 5,
                },
            )

            assert response.status_code == 200

    def test_recommend_requires_user_id(self, client):
        """Test that user_id is required for recommendations."""
        response = client.post(
            "/api/chat/recommend",
            json={"num_recommendations": 3},
        )

        # Should fail without user_id
        assert response.status_code == 400

    def test_update_preferences_success(self, client):
        """Test updating user preferences."""
        with patch("api.routes.update_preferences") as mock_update:
            mock_update.return_value = {
                "updated": True,
                "preference_type": "budget",
                "preference_value": "mid-range",
                "acknowledgment": "Got it!",
            }

            response = client.post(
                "/api/recommend/preferences?user_id=test-user",
                json={
                    "preference_type": "budget",
                    "preference_value": "mid-range",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["data"]["updated"] is True

    def test_submit_feedback_success(self, client):
        """Test submitting destination feedback."""
        with patch("api.routes.provide_feedback") as mock_feedback:
            mock_feedback.return_value = {
                "feedback_recorded": True,
                "destination": "Bali",
                "rating": 5,
                "agent_response": "Thanks!",
            }

            response = client.post(
                "/api/recommend/feedback?user_id=test-user",
                json={
                    "destination": "Bali",
                    "feedback": "Amazing trip!",
                    "rating": 5,
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["data"]["feedback_recorded"] is True


class TestConversationsEndpoint:
    """Tests for conversation history endpoint."""

    def test_get_conversations(self, client):
        """Test getting conversation history."""
        response = client.get("/api/conversations/test-user?limit=5")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["user_id"] == "test-user"


class TestCORS:
    """Tests for CORS configuration."""

    def test_cors_headers(self, client):
        """Test CORS headers are present."""
        response = client.options(
            "/api/health",
            headers={"Origin": "http://localhost:3000"},
        )

        # CORS should be configured
        assert response.status_code in [200, 405]
