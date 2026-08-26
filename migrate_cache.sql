-- Drop table if it exists
DROP TABLE IF EXISTS llm_semantic_cache;

-- Create the semantic cache table
CREATE TABLE llm_semantic_cache (
    id SERIAL PRIMARY KEY,
    query_embedding vector(768),
    json_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
