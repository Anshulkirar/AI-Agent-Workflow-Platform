CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('file', 'url', 'text')),
  file_kind text CHECK (file_kind IN ('pdf', 'docx', 'txt', 'md', 'csv', 'xlsx', 'json', 'html')),
  source_url text,
  storage_path text,
  text_content text,
  collection_id text NOT NULL DEFAULT 'general',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  size_bytes bigint NOT NULL DEFAULT 0,
  pages integer,
  chunk_count integer NOT NULL DEFAULT 0,
  token_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  stage text CHECK (stage IN ('uploading', 'crawling', 'parsing', 'chunking', 'embedding', 'indexing')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  preview text NOT NULL DEFAULT '',
  sync_schedule text NOT NULL DEFAULT 'manual' CHECK (sync_schedule IN ('manual', 'daily', 'weekly')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX knowledge_sources_user_idx ON knowledge_sources (user_id, created_at DESC);

CREATE TABLE knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  token_count integer NOT NULL,
  embedding jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (source_id, chunk_index)
);
CREATE INDEX knowledge_chunks_source_idx ON knowledge_chunks (source_id, chunk_index);

CREATE TABLE knowledge_agent_associations (
  agent_id uuid NOT NULL,
  source_id uuid NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, source_id)
);
