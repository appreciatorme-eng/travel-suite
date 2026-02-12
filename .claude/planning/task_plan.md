# GoBuddy Adventures - Development Task Plan

## Project Overview
GoBuddy Adventures is a tour operator platform with:
- **Mobile App** (React Native/Expo) - Client-facing trip management
- **Web Admin** (Next.js) - Travel agent dashboard
- **AI Agents** (Python/Agno) - Intelligent trip planning and support
- **Database** (Supabase/PostgreSQL) - Data storage with pgvector for RAG

## Current Phase: Phase 3 - AI Integration & Automation

---

## Task Breakdown

### 1. AI Agent Integration (Priority: High)
- [ ] Connect web frontend to Agno API endpoints
- [ ] Add chat UI component for AI interactions
- [ ] Implement streaming responses for better UX
- [ ] Add conversation history display

### 2. Mobile App AI Features (Priority: High)
- [ ] Add AI chat screen in mobile app
- [ ] Integrate with Recommender agent for destination suggestions
- [ ] Add Support Bot for in-app help

### 3. n8n Workflow Automation (Priority: Medium)
- [x] Daily briefing workflow (7am notifications)
- [ ] Trip reminder workflow (24h before trip)
- [ ] Pickup reminder workflow (1h before pickup)
- [ ] Review request workflow (after trip completion)
- [ ] Weather alert workflow (severe weather notifications)

### 4. Testing & Quality (Priority: Medium)
- [x] Playwright E2E test structure
- [ ] Unit tests for Agno agents
- [ ] Integration tests for API endpoints
- [ ] Mobile app component tests

### 5. Production Readiness (Priority: Low - Future)
- [ ] Docker containerization for agents
- [ ] CI/CD pipeline setup
- [ ] Monitoring and logging
- [ ] App store submission

---

## Dependencies

```
Mobile App ──depends on──> Web API ──depends on──> Supabase
                              │
                              └──depends on──> Agno Agents API
```

## Tech Stack Reference
| Component | Technology | Port |
|-----------|------------|------|
| Mobile App | Expo/React Native | 8081 |
| Web Admin | Next.js 16 | 3000 |
| AI Agents | FastAPI/Agno | 8001 |
| Database | Supabase (PostgreSQL) | - |
| Notifications | Expo Push | - |
| Automation | n8n | 5678 |

---

## Notes
- All API keys stored in `.env` files (not committed)
- RAG knowledge base in `apps/agents/knowledge/`
- n8n workflows exported to `n8n/workflows/`
