-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    content TEXT
);

-- Document chunks with vector embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding vector(384),  -- sentence-transformers embeddings are 384 dimensions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster vector similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Chat history table
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    user_message TEXT NOT NULL,
    assistant_message TEXT NOT NULL,
    sources TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);