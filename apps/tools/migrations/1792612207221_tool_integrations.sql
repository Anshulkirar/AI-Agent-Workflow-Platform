-- Up Migration
CREATE TABLE tool_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  definition_key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'needs_setup' CHECK (status IN ('connected', 'needs_setup', 'error')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials_encrypted text,
  credential_fields text[] NOT NULL DEFAULT '{}',
  input_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE tool_agent_associations (
  tool_id uuid NOT NULL REFERENCES tool_integrations(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  user_id uuid NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tool_id, agent_id)
);

CREATE INDEX tool_integrations_owner_idx ON tool_integrations (user_id, created_at DESC);
CREATE INDEX tool_agent_associations_agent_idx ON tool_agent_associations (agent_id);

-- Down Migration
DROP TABLE tool_agent_associations;
DROP TABLE tool_integrations;
