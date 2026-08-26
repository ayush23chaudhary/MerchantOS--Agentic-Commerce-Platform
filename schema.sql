-- Removed pgvector extension for local compatibility

-- Table to hold our product inventory
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- Storing price in smallest currency unit (e.g., paise)
    stock INTEGER NOT NULL DEFAULT 0
);

-- Table to log AI agent intents and our circuit breaker validation results
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    agent_intent_json JSONB NOT NULL,
    validation_status VARCHAR(50) NOT NULL, -- e.g., 'ACCEPTED', 'REJECTED'
    error_reason TEXT -- Populated if validation_status is 'REJECTED'
);
