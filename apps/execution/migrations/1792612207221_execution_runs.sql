-- Up Migration
CREATE TABLE execution_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('agent', 'workflow')),
  source_id uuid NOT NULL,
  source_name text NOT NULL DEFAULT '',
  trigger text NOT NULL DEFAULT 'api',
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  error_code text,
  error_message text,
  timeout_ms integer NOT NULL DEFAULT 300000 CHECK (timeout_ms BETWEEN 100 AND 3600000),
  attempt integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 1 CHECK (max_attempts BETWEEN 1 AND 10),
  queued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer NOT NULL DEFAULT 0,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  rerun_of uuid REFERENCES execution_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX execution_runs_owner_created_idx ON execution_runs (user_id, created_at DESC);
CREATE INDEX execution_runs_status_created_idx ON execution_runs (status, created_at DESC);
CREATE INDEX execution_runs_source_idx ON execution_runs (source_type, source_id);

CREATE TABLE execution_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES execution_runs(id) ON DELETE CASCADE,
  at_ms integer NOT NULL DEFAULT 0 CHECK (at_ms >= 0),
  level text NOT NULL CHECK (level IN ('debug', 'info', 'success', 'warn', 'error')),
  message text NOT NULL,
  step_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX execution_logs_run_idx ON execution_logs (run_id, id);

-- Down Migration
DROP TABLE execution_logs;
DROP TABLE execution_runs;
