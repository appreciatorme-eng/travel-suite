-- Migration: Switch policy_embeddings index from IVFFlat to HNSW
-- IVFFlat requires existing training data to build index lists.
-- On empty or small tables, queries return incorrect/empty results.
-- HNSW works correctly regardless of table size.

-- Drop the existing IVFFlat index
DROP INDEX IF EXISTS idx_policy_embeddings_vector;

-- Create HNSW index (works on empty tables, better recall, slightly more memory)
CREATE INDEX idx_policy_embeddings_vector
    ON public.policy_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Note: m=16 and ef_construction=64 are good defaults for small-medium datasets.
-- For larger datasets (>100k rows), consider increasing ef_construction to 128+.
