-- Up Migration

CREATE TABLE users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL,
  name          text        NOT NULL,
  password_hash text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- The app normalizes emails; the database refuses anything that slipped past it.
  CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email))),
  CONSTRAINT users_email_length     CHECK (char_length(email) BETWEEN 3 AND 254),
  CONSTRAINT users_name_length      CHECK (char_length(btrim(name)) BETWEEN 1 AND 100)
);
CREATE UNIQUE INDEX users_email_key ON users (email);

CREATE TABLE sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- SHA-256 of the cookie token. The token itself is never stored.
  token_hash  bytea       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  ip          inet,
  user_agent  text,
  CONSTRAINT sessions_token_hash_length CHECK (octet_length(token_hash) = 32),
  CONSTRAINT sessions_expiry_valid      CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX sessions_token_hash_key  ON sessions (token_hash);
CREATE INDEX        sessions_user_active_idx ON sessions (user_id) WHERE revoked_at IS NULL;
CREATE INDEX        sessions_expires_at_idx  ON sessions (expires_at);

-- Down Migration

DROP TABLE sessions;
DROP TABLE users;
