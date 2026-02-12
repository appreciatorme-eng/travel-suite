-- Migration: Create policy_embeddings table for RAG
-- This table is required for the AI Agents to store and retrieve knowledge.

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Vector embeddings for RAG (policies, FAQs, destination guides)
CREATE TABLE IF NOT EXISTS public.policy_embeddings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI embedding dimension
    source_type TEXT CHECK (source_type IN ('policy', 'faq', 'destination', 'trip')),
    source_file TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.policy_embeddings ENABLE ROW LEVEL SECURITY;

-- Index for vector similarity search (IVFFlat first, then upgraded to HNSW in next migration)
CREATE INDEX IF NOT EXISTS idx_policy_embeddings_vector ON public.policy_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Embeddings policies (service role only for write, public read)
CREATE POLICY "Anyone can search embeddings"
    ON public.policy_embeddings FOR SELECT
    USING (true);
