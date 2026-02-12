# GoBuddy Adventures - Findings & Decisions

## Architecture Decisions

### ADR-001: Agno Framework for AI Agents
**Decision:** Use Agno framework instead of LangChain or CrewAI
**Rationale:**
- Built-in persistent memory and learning
- Native FastAPI integration
- Better multi-agent team support
- Simpler RAG implementation with knowledge sources

### ADR-002: Supabase for Backend
**Decision:** Use Supabase (PostgreSQL) for all data storage
**Rationale:**
- Free tier sufficient for MVP
- Built-in auth with OAuth providers
- Real-time subscriptions for driver tracking
- pgvector extension for RAG embeddings

### ADR-003: n8n for Workflow Automation
**Decision:** Use n8n instead of custom cron jobs
**Rationale:**
- Visual workflow builder
- Easy to modify without code changes
- Self-hostable (no vendor lock-in)
- Supports complex conditional logic

### ADR-004: Expo Push for Notifications
**Decision:** Use Expo Push Notifications (free tier)
**Rationale:**
- No cost for reasonable usage
- Works with both iOS and Android
- Simple integration with Expo apps
- No need for FCM/APNS credentials in development

---

## Technical Discoveries

### Discovery: Agno Memory Patterns
The Agno framework supports multiple memory patterns:
1. **User Memories** - Persist across all sessions for a user
2. **Session Memories** - Persist within a conversation
3. **Learning Mode** - "always" or "agentic" (agent decides when to learn)

Best practice: Use `learning_mode="agentic"` for the Recommender to avoid learning noise.

### Discovery: pgvector Index Types
For RAG embeddings, use `ivfflat` index for faster queries:
```sql
CREATE INDEX ON policy_embeddings USING ivfflat (embedding vector_cosine_ops);
```
Note: Requires at least 100 rows before index is effective.

### Discovery: Expo Push Token Handling
- Tokens can change on app reinstall
- Store multiple tokens per user (for multiple devices)
- Mark tokens as inactive on delivery failure
- Token format: `ExponentPushToken[xxxxxx]`

### Discovery: WhatsApp Business API Costs
For automated driver notifications, two options:
1. **WhatsApp Links** (free) - Opens WhatsApp with pre-filled message, requires manual send
2. **WhatsApp Business API** ($$$) - Fully automated, requires Meta approval

Current implementation uses WhatsApp links for cost-effectiveness.

---

## Code Patterns

### Pattern: Structured Output with Pydantic
```python
from pydantic import BaseModel

class TripItinerary(BaseModel):
    destination: str
    days: list[DayPlan]

agent = Agent(
    model=OpenAIChat(id="gpt-4o"),
    response_model=TripItinerary,  # Ensures structured output
)
```

### Pattern: Multi-Agent Team
```python
team = Team(
    agents=[researcher, planner, budgeter],
    mode="sequential",  # Each agent processes in order
)
```

### Pattern: RAG with Knowledge Base
```python
knowledge = CombinedKnowledge(
    sources=[
        TextKnowledge(path="./policies.md"),
        TextKnowledge(path="./faq.md"),
    ],
)
agent = Agent(knowledge=knowledge, search_knowledge=True)
```

---

## Known Issues

### Issue: Supabase Free Tier Limits
- 500MB database storage
- 1GB file storage
- 2GB bandwidth/month
- **Mitigation:** Monitor usage, archive old data

### Issue: Expo Push Rate Limits
- 600 notifications/minute per project
- **Mitigation:** Queue notifications, batch sends

### Issue: OpenAI API Costs
- GPT-4o: ~$5/1M input tokens, ~$15/1M output tokens
- **Mitigation:** Use gpt-4o-mini for Researcher/Budgeter, gpt-4o only for Planner

---

## Performance Notes

- Agno agent cold start: ~2-3 seconds (first request)
- RAG search: ~200-500ms depending on knowledge base size
- Push notification delivery: 1-5 seconds typically
- n8n workflow execution: ~5-10 seconds for daily briefing
