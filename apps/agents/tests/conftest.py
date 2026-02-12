"""
Pytest configuration and shared fixtures for agent tests.
"""
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Set test environment
os.environ["ENV"] = "test"
os.environ["OPENAI_API_KEY"] = "test-key"


@pytest.fixture
def mock_openai_response():
    """Mock OpenAI API response."""
    return {
        "id": "chatcmpl-test",
        "object": "chat.completion",
        "created": 1234567890,
        "model": "gpt-4o",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "This is a test response from the AI.",
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 20,
            "total_tokens": 30,
        },
    }


@pytest.fixture
def mock_trip_data():
    """Sample trip data for testing."""
    return {
        "destination": "Bali, Indonesia",
        "duration_days": 5,
        "budget": 2000.0,
        "interests": ["beaches", "temples", "food"],
        "travel_style": "balanced",
    }


@pytest.fixture
def mock_user_id():
    """Sample user ID for testing."""
    return "test-user-123"


@pytest.fixture
def mock_conversation_context():
    """Mock conversation context."""
    return {
        "trip_id": "trip-456",
        "booking_ref": "GB-2024-001",
        "user_name": "Test User",
    }


@pytest.fixture
def mock_preferences():
    """Mock user preferences."""
    return {
        "budget": "mid-range",
        "duration": "7 days",
        "interests": ["adventure", "culture", "food"],
        "travel_style": "balanced",
        "avoid": ["crowded places"],
    }


@pytest.fixture
def mock_agent_response():
    """Mock Agno agent response object."""
    response = MagicMock()
    response.content = "Test agent response content"
    return response


@pytest.fixture
def mock_agno_agent():
    """Mock Agno Agent class."""
    with patch("agno.agent.Agent") as mock:
        agent = MagicMock()
        agent.arun = AsyncMock(return_value=MagicMock(content="Mock response"))
        agent.run = MagicMock(return_value=MagicMock(content="Mock response"))
        mock.return_value = agent
        yield mock


@pytest.fixture
def mock_agno_team():
    """Mock Agno Team class."""
    with patch("agno.team.Team") as mock:
        team = MagicMock()
        team.arun = AsyncMock(return_value=MagicMock(content="Mock team response"))
        mock.return_value = team
        yield mock
