-- Up Migration
CREATE TABLE agents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL,
 description text NOT NULL DEFAULT '', icon text NOT NULL DEFAULT 'bot', color text NOT NULL DEFAULT 'violet',
 status text NOT NULL DEFAULT 'draft', instructions text NOT NULL DEFAULT '', tools text[] NOT NULL DEFAULT '{}',
 knowledge text[] NOT NULL DEFAULT '{}', settings jsonb NOT NULL DEFAULT '{}'::jsonb,
 workflow jsonb, current_version integer NOT NULL DEFAULT 1, runs integer NOT NULL DEFAULT 0,
 success_rate numeric(5,2) NOT NULL DEFAULT 0, last_run_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT agents_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
 CONSTRAINT agents_status_valid CHECK (status IN ('active','inactive','draft','archived'))
);
CREATE INDEX agents_owner_updated_idx ON agents (user_id, updated_at DESC);
CREATE TABLE agent_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
 user_id uuid NOT NULL, version integer NOT NULL CHECK (version > 0), instructions text NOT NULL DEFAULT '',
 tools text[] NOT NULL DEFAULT '{}', knowledge text[] NOT NULL DEFAULT '{}', settings jsonb NOT NULL DEFAULT '{}'::jsonb,
 workflow jsonb, changelog text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(agent_id, version)
);
CREATE INDEX agent_versions_agent_idx ON agent_versions(agent_id, version DESC);
-- Down Migration
DROP TABLE agent_versions; DROP TABLE agents;
