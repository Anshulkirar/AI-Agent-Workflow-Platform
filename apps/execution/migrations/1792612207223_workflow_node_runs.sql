-- Up Migration
CREATE TABLE workflow_node_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES execution_runs(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  node_kind text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'skipped')),
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  error_message text,
  attempt integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 1,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, node_id)
);
CREATE INDEX workflow_node_runs_run_idx ON workflow_node_runs(run_id, created_at);

-- Down Migration
DROP TABLE workflow_node_runs;
