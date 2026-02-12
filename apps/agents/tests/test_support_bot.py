"""
Tests for the Support Bot agent with RAG.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestSupportBotAgent:
    """Tests for support bot functionality."""

    @pytest.mark.asyncio
    async def test_answer_basic_question(self, mock_user_id):
        """Test answering a basic support question."""
        with patch("agents.support_bot.support_agent") as mock_agent:
            mock_agent.arun = AsyncMock(
                return_value=MagicMock(
                    content="You can cancel your booking by contacting support..."
                )
            )

            from agents.support_bot import answer_question

            result = await answer_question(
                question="How do I cancel my booking?",
                user_id=mock_user_id,
            )

            assert "answer" in result
            assert result["agent"] == "SupportBot"

    @pytest.mark.asyncio
    async def test_answer_with_context(
        self, mock_user_id, mock_conversation_context
    ):
        """Test answering with trip/booking context."""
        with patch("agents.support_bot.support_agent") as mock_agent:
            mock_agent.arun = AsyncMock(
                return_value=MagicMock(
                    content="Looking at your trip GB-2024-001..."
                )
            )

            from agents.support_bot import answer_question

            result = await answer_question(
                question="What's the status of my booking?",
                context=mock_conversation_context,
                user_id=mock_user_id,
            )

            assert "answer" in result
            # Verify context was included in prompt
            mock_agent.arun.assert_called_once()
            call_args = mock_agent.arun.call_args[0][0]
            assert "GB-2024-001" in call_args

    def test_quick_response_contact(self):
        """Test quick response for contact questions."""
        from agents.support_bot import get_quick_response

        result = get_quick_response("How can I contact support?")
        assert result is not None
        assert "support@gobuddy.com" in result
        assert "phone" in result.lower() or "email" in result.lower()

    def test_quick_response_cancellation(self):
        """Test quick response for cancellation questions."""
        from agents.support_bot import get_quick_response

        result = get_quick_response("I want to cancel my trip")
        assert result is not None
        assert "refund" in result.lower()
        assert "14" in result  # 14+ days policy

    def test_quick_response_no_match(self):
        """Test that non-matching questions return None."""
        from agents.support_bot import get_quick_response

        result = get_quick_response("What are the best beaches in Bali?")
        assert result is None

    def test_quick_responses_patterns(self):
        """Test all quick response patterns."""
        from agents.support_bot import QUICK_RESPONSES

        assert "contact" in QUICK_RESPONSES
        assert "cancellation" in QUICK_RESPONSES

        # Verify each pattern has required fields
        for category, data in QUICK_RESPONSES.items():
            assert "keywords" in data
            assert "response" in data
            assert len(data["keywords"]) > 0
            assert len(data["response"]) > 0


class TestSupportBotKnowledge:
    """Tests for RAG knowledge base functionality."""

    def test_knowledge_sources_exist(self):
        """Test that knowledge source files exist."""
        from pathlib import Path
        from agents.support_bot import KNOWLEDGE_DIR

        policies_path = KNOWLEDGE_DIR / "policies.md"
        faq_path = KNOWLEDGE_DIR / "faq.md"

        # At least one knowledge source should exist
        assert policies_path.exists() or faq_path.exists()

    def test_knowledge_configuration(self):
        """Test knowledge base configuration."""
        from agents.support_bot import knowledge_sources

        # Should have some knowledge sources configured
        assert isinstance(knowledge_sources, list)

    @pytest.mark.asyncio
    async def test_load_knowledge(self):
        """Test knowledge loading function."""
        with patch("agents.support_bot.knowledge") as mock_knowledge:
            mock_knowledge.aload = AsyncMock()

            from agents.support_bot import load_knowledge

            # Should not raise exception
            await load_knowledge()


class TestSupportBotResponses:
    """Tests for response formatting."""

    @pytest.mark.asyncio
    async def test_response_format(self, mock_user_id):
        """Test response has correct format."""
        with patch("agents.support_bot.support_agent") as mock_agent:
            mock_agent.arun = AsyncMock(
                return_value=MagicMock(content="Test response")
            )

            from agents.support_bot import answer_question

            result = await answer_question(
                question="Test question",
                user_id=mock_user_id,
            )

            # Verify response structure
            assert isinstance(result, dict)
            assert "answer" in result
            assert "sources_used" in result
            assert "agent" in result

    @pytest.mark.asyncio
    async def test_response_without_user_id(self):
        """Test response works without user_id."""
        with patch("agents.support_bot.support_agent") as mock_agent:
            mock_agent.arun = AsyncMock(
                return_value=MagicMock(content="Test response")
            )

            from agents.support_bot import answer_question

            result = await answer_question(
                question="General question",
                user_id=None,
            )

            assert "answer" in result
