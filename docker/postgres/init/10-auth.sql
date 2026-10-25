-- Runs once, on an empty data volume (docker-entrypoint-initdb.d), as the superuser.
-- The auth service gets its own role and databases; no other service is given these credentials.
\getenv auth_password AUTH_DB_PASSWORD

CREATE ROLE auth_service LOGIN PASSWORD :'auth_password';

CREATE DATABASE agentflow_auth OWNER auth_service;
CREATE DATABASE agentflow_auth_test OWNER auth_service;

-- New databases are connectable by every role by default; only the owner should get in.
REVOKE CONNECT ON DATABASE agentflow_auth FROM PUBLIC;
REVOKE CONNECT ON DATABASE agentflow_auth_test FROM PUBLIC;
