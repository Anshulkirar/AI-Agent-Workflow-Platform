-- Runs once, on an empty data volume (docker-entrypoint-initdb.d), as the superuser.
-- The auth service gets its own role and databases; no other service is given these credentials.
\getenv auth_password AUTH_DB_PASSWORD
\getenv workflow_password WORKFLOW_DB_PASSWORD
\getenv agent_password AGENT_DB_PASSWORD
\getenv execution_password EXECUTION_DB_PASSWORD
\getenv tools_password TOOLS_DB_PASSWORD
\getenv knowledge_password KNOWLEDGE_DB_PASSWORD

CREATE ROLE auth_service LOGIN PASSWORD :'auth_password';
CREATE ROLE workflow_service LOGIN PASSWORD :'workflow_password';
CREATE ROLE agent_service LOGIN PASSWORD :'agent_password';
CREATE ROLE execution_service LOGIN PASSWORD :'execution_password';
CREATE ROLE tools_service LOGIN PASSWORD :'tools_password';
CREATE ROLE knowledge_service LOGIN PASSWORD :'knowledge_password';

CREATE DATABASE agentflow_auth OWNER auth_service;
CREATE DATABASE agentflow_auth_test OWNER auth_service;
CREATE DATABASE agentflow_workflow OWNER workflow_service;
CREATE DATABASE agentflow_workflow_test OWNER workflow_service;
CREATE DATABASE agentflow_agent OWNER agent_service;
CREATE DATABASE agentflow_agent_test OWNER agent_service;
CREATE DATABASE agentflow_execution OWNER execution_service;
CREATE DATABASE agentflow_execution_test OWNER execution_service;
CREATE DATABASE agentflow_tools OWNER tools_service;
CREATE DATABASE agentflow_tools_test OWNER tools_service;
CREATE DATABASE agentflow_knowledge OWNER knowledge_service;
CREATE DATABASE agentflow_knowledge_test OWNER knowledge_service;

-- New databases are connectable by every role by default; only the owner should get in.
REVOKE CONNECT ON DATABASE agentflow_auth FROM PUBLIC;
REVOKE CONNECT ON DATABASE agentflow_auth_test FROM PUBLIC;
REVOKE CONNECT ON DATABASE agentflow_workflow FROM PUBLIC;
REVOKE CONNECT ON DATABASE agentflow_workflow_test FROM PUBLIC;
REVOKE CONNECT ON DATABASE agentflow_agent FROM PUBLIC;
REVOKE CONNECT ON DATABASE agentflow_agent_test FROM PUBLIC;
REVOKE CONNECT ON DATABASE agentflow_execution FROM PUBLIC;
REVOKE CONNECT ON DATABASE agentflow_execution_test FROM PUBLIC;
REVOKE CONNECT ON DATABASE agentflow_tools FROM PUBLIC;
REVOKE CONNECT ON DATABASE agentflow_tools_test FROM PUBLIC;
REVOKE CONNECT ON DATABASE agentflow_knowledge FROM PUBLIC;
REVOKE CONNECT ON DATABASE agentflow_knowledge_test FROM PUBLIC;
