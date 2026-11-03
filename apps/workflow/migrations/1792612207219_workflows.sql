-- Up Migration
CREATE TABLE workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'sparkles',
  color text NOT NULL DEFAULT 'violet',
  status text NOT NULL DEFAULT 'draft',
  "trigger" jsonb NOT NULL DEFAULT '{"type":"manual"}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  graph jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_version integer NOT NULL DEFAULT 1,
  runs integer NOT NULL DEFAULT 0,
  success_rate numeric(5,2) NOT NULL DEFAULT 0,
  avg_duration_ms integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflows_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
  CONSTRAINT workflows_status_valid CHECK (status IN ('active','paused','draft','archived'))
);
CREATE INDEX workflows_owner_updated_idx ON workflows (user_id, updated_at DESC);

CREATE TABLE workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  graph jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  changelog text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, version),
  CONSTRAINT workflow_version_owner_matches CHECK (user_id IS NOT NULL)
);
CREATE INDEX workflow_versions_workflow_idx ON workflow_versions (workflow_id, version DESC);

-- Down Migration
DROP TABLE workflow_versions;
DROP TABLE workflows;
