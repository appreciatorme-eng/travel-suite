"""
Support Bot Agent with RAG
Answers customer questions using knowledge base of policies, FAQs, and trip information
"""
import os
import logging
from pathlib import Path
from typing import Optional

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.knowledge.text import TextKnowledge
from agno.knowledge.combined import CombinedKnowledge

logger = logging.getLogger("gobuddy.support_bot")

# Knowledge base paths
KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"

# Initialize knowledge sources
knowledge_sources = []

# Add policy document if exists
policies_path = KNOWLEDGE_DIR / "policies.md"
if policies_path.exists():
    knowledge_sources.append(TextKnowledge(path=str(policies_path)))

# Add FAQ document if exists
faq_path = KNOWLEDGE_DIR / "faq.md"
if faq_path.exists():
    knowledge_sources.append(TextKnowledge(path=str(faq_path)))

# Add destination guides if they exist
destinations_dir = KNOWLEDGE_DIR / "destinations"
if destinations_dir.exists():
    for guide in destinations_dir.glob("*.md"):
        knowledge_sources.append(TextKnowledge(path=str(guide)))


# Create combined knowledge base (in-memory for simplicity, can be pgvector in production)
knowledge = None
if knowledge_sources:
    knowledge = CombinedKnowledge(sources=knowledge_sources)


# Support Bot Agent
support_agent = Agent(
    name="SupportBot",
    model=OpenAIChat(id="gpt-4o"),
    knowledge=knowledge,
    search_knowledge=True if knowledge else False,
    instructions=[
        "You are a friendly and helpful travel support assistant for GoBuddy Adventures.",
        "Answer customer questions accurately using the knowledge base when available.",
        "Be warm, professional, and empathetic in your responses.",
        "If you're not sure about something, say so and offer to connect with human support.",
        "For booking or payment issues, direct users to contact support@gobuddy.com.",
        "Always prioritize customer satisfaction and safety.",
        "Provide practical, actionable advice when possible.",
        "If asked about specific trips or bookings, ask for trip ID or booking reference.",
    ],
    markdown=True,
    show_tool_calls=False,  # Hide internal RAG lookups from user
)


async def load_knowledge():
    """Load the knowledge base. Called on server startup."""
    global knowledge
    if knowledge:
        await knowledge.aload(recreate=False)
        logger.info("Loaded %d knowledge sources", len(knowledge_sources))


async def answer_question(
    question: str,
    context: Optional[dict] = None,
    user_id: Optional[str] = None,
) -> dict:
    """
    Answer a customer support question.

    Args:
        question: The customer's question
        context: Optional context (e.g., trip_id, booking_ref)
        user_id: Optional user ID for personalization

    Returns:
        Response with answer and metadata
    """
    # Build prompt with context if provided
    prompt = question

    if context:
        context_parts = []
        if context.get("trip_id"):
            context_parts.append(f"Trip ID: {context['trip_id']}")
        if context.get("booking_ref"):
            context_parts.append(f"Booking Reference: {context['booking_ref']}")
        if context.get("user_name"):
            context_parts.append(f"Customer Name: {context['user_name']}")

        if context_parts:
            prompt = f"Context: {', '.join(context_parts)}\n\nQuestion: {question}"

    # Get response from agent
    response = await support_agent.arun(prompt, user_id=user_id)

    return {
        "answer": response.content,
        "sources_used": bool(knowledge),
        "agent": "SupportBot",
    }


# Quick response patterns for common questions
QUICK_RESPONSES = {
    "contact": {
        "keywords": ["contact", "phone", "email", "reach", "call"],
        "response": (
            "You can reach GoBuddy Adventures support through:\n\n"
            "- **Email**: support@gobuddy.com\n"
            "- **Phone**: +1-800-GO-BUDDY (Available 24/7)\n"
            "- **WhatsApp**: +1-555-123-4567\n\n"
            "For urgent matters during your trip, use the emergency contact "
            "provided in your trip details."
        ),
    },
    "cancellation": {
        "keywords": ["cancel", "refund", "change booking"],
        "response": (
            "For cancellation and refund requests:\n\n"
            "- **14+ days before trip**: Full refund\n"
            "- **7-14 days before trip**: 50% refund\n"
            "- **Less than 7 days**: No refund (credit may be available)\n\n"
            "To cancel, please email support@gobuddy.com with your booking reference."
        ),
    },
}


def get_quick_response(question: str) -> Optional[str]:
    """Check if question matches a quick response pattern."""
    question_lower = question.lower()
    for category, data in QUICK_RESPONSES.items():
        if any(keyword in question_lower for keyword in data["keywords"]):
            return data["response"]
    return None
