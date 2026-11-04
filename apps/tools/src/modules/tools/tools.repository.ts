import type { Pool } from "@agentflow/db";
import { decryptCredentials, encryptCredentials } from "./crypto.js";

export const toolDefinitions = [
  {
    key: "http",
    name: "HTTP Request",
    description: "Call HTTP APIs.",
    credentialFields: [{ name: "apiKey", label: "API key", secret: true }],
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        method: { type: "string" },
        body: {},
      },
    },
    outputSchema: { type: "object" },
  },
  {
    key: "web_search",
    name: "Web Search",
    description: "Search the public web.",
    credentialFields: [{ name: "apiKey", label: "API key", secret: true }],
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    outputSchema: {
      type: "object",
      properties: { results: { type: "array" } },
    },
  },
  {
    key: "postgres",
    name: "PostgreSQL",
    description: "Query a PostgreSQL database.",
    credentialFields: [
      { name: "connectionString", label: "Connection string", secret: true },
    ],
    inputSchema: { type: "object", properties: { query: { type: "string" } } },
    outputSchema: { type: "object" },
  },
];

export type ToolRow = {
  id: string;
  user_id: string;
  definition_key: string;
  name: string;
  description: string;
  enabled: boolean;
  status: "connected" | "needs_setup" | "error";
  config: unknown;
  credentials_encrypted: string | null;
  credential_fields: string[];
  input_schema: unknown;
  output_schema: unknown;
  last_tested_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

export function publicTool(row: ToolRow) {
  return {
    id: row.id,
    ownerId: row.user_id,
    definitionKey: row.definition_key,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    status: row.status,
    config: row.config,
    credentialsConfigured: Boolean(row.credentials_encrypted),
    credentialFields: row.credential_fields,
    inputSchema: row.input_schema,
    outputSchema: row.output_schema,
    lastTestedAt: row.last_tested_at?.toISOString() ?? null,
    lastError: row.last_error,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class ToolsRepository {
  constructor(
    private db: Pool,
    private encryptionKey: string,
  ) {}

  async create(
    userId: string,
    input: {
      definitionKey: string;
      name: string;
      description: string;
      enabled: boolean;
      config: Record<string, unknown>;
      credentials?: Record<string, unknown>;
      inputSchema: Record<string, unknown>;
      outputSchema: Record<string, unknown>;
    },
  ) {
    const definition = toolDefinitions.find(
      (item) => item.key === input.definitionKey,
    );
    if (!definition) return null;
    const fields = definition.credentialFields.map((field) => field.name);
    const encrypted = input.credentials
      ? encryptCredentials(input.credentials, this.encryptionKey)
      : null;
    const result = await this.db.query<ToolRow>(
      `INSERT INTO tool_integrations (user_id, definition_key, name, description, enabled, status, config, credentials_encrypted, credential_fields, input_schema, output_schema)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        userId,
        input.definitionKey,
        input.name,
        input.description,
        input.enabled,
        input.credentials ? "needs_setup" : "needs_setup",
        JSON.stringify(input.config),
        encrypted,
        fields,
        JSON.stringify(input.inputSchema),
        JSON.stringify(input.outputSchema),
      ],
    );
    return publicTool(result.rows[0]!);
  }

  async list(userId: string) {
    const result = await this.db.query<ToolRow>(
      "SELECT * FROM tool_integrations WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return result.rows.map(publicTool);
  }
  async find(userId: string, id: string) {
    const result = await this.db.query<ToolRow>(
      "SELECT * FROM tool_integrations WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return result.rows[0] ? publicTool(result.rows[0]) : null;
  }
  async findOwner(id: string) {
    const result = await this.db.query<{ user_id: string }>(
      "SELECT user_id FROM tool_integrations WHERE id = $1",
      [id],
    );
    return result.rows[0]?.user_id ?? null;
  }
  async update(userId: string, id: string, input: Record<string, unknown>) {
    const current = await this.db.query<ToolRow>(
      "SELECT * FROM tool_integrations WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    const row = current.rows[0];
    if (!row) return null;
    const values = {
      name: (input.name as string | undefined) ?? row.name,
      description: (input.description as string | undefined) ?? row.description,
      enabled: (input.enabled as boolean | undefined) ?? row.enabled,
      config:
        (input.config as Record<string, unknown> | undefined) ?? row.config,
      inputSchema:
        (input.inputSchema as Record<string, unknown> | undefined) ??
        row.input_schema,
      outputSchema:
        (input.outputSchema as Record<string, unknown> | undefined) ??
        row.output_schema,
      encrypted: (input.credentials as Record<string, unknown> | undefined)
        ? encryptCredentials(
            input.credentials as Record<string, unknown>,
            this.encryptionKey,
          )
        : row.credentials_encrypted,
    };
    const result = await this.db.query<ToolRow>(
      `UPDATE tool_integrations SET name=$3,description=$4,enabled=$5,config=$6,input_schema=$7,output_schema=$8,credentials_encrypted=$9,status=CASE WHEN $9 IS NULL THEN 'needs_setup' ELSE status END,last_error=NULL,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *`,
      [
        id,
        userId,
        values.name,
        values.description,
        values.enabled,
        JSON.stringify(values.config),
        JSON.stringify(values.inputSchema),
        JSON.stringify(values.outputSchema),
        values.encrypted,
      ],
    );
    return result.rows[0] ? publicTool(result.rows[0]) : null;
  }
  async remove(userId: string, id: string) {
    return (
      (
        await this.db.query(
          "DELETE FROM tool_integrations WHERE id = $1 AND user_id = $2",
          [id, userId],
        )
      ).rowCount !== 0
    );
  }
  async setConnectionStatus(
    userId: string,
    id: string,
    status: "connected" | "needs_setup" | "error",
    error?: string,
  ) {
    const result = await this.db.query<ToolRow>(
      "UPDATE tool_integrations SET status=$3,last_error=$4,last_tested_at=now(),updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *",
      [
        id,
        userId,
        status,
        status === "error" ? (error ?? "Connection test failed") : null,
      ],
    );
    return result.rows[0] ? publicTool(result.rows[0]) : null;
  }
  async credentials(userId: string, id: string) {
    const result = await this.db.query<{
      credentials_encrypted: string | null;
    }>(
      "SELECT credentials_encrypted FROM tool_integrations WHERE id=$1 AND user_id=$2",
      [id, userId],
    );
    if (!result.rows[0]?.credentials_encrypted) return null;
    return decryptCredentials(
      result.rows[0].credentials_encrypted,
      this.encryptionKey,
    );
  }
  async associate(
    userId: string,
    toolId: string,
    agentId: string,
    config: Record<string, unknown>,
  ) {
    await this.db.query(
      `INSERT INTO tool_agent_associations (tool_id,agent_id,user_id,config) VALUES ($1,$2,$3,$4) ON CONFLICT (tool_id,agent_id) DO UPDATE SET config=EXCLUDED.config`,
      [toolId, agentId, userId, JSON.stringify(config)],
    );
  }
  async associations(userId: string, toolId: string) {
    const result = await this.db.query<{
      agent_id: string;
      config: unknown;
      created_at: Date;
    }>(
      "SELECT agent_id,config,created_at FROM tool_agent_associations WHERE tool_id=$1 AND user_id=$2 ORDER BY created_at",
      [toolId, userId],
    );
    return result.rows.map((row) => ({
      agentId: row.agent_id,
      config: row.config,
      createdAt: row.created_at.toISOString(),
    }));
  }
  async unassociate(userId: string, toolId: string, agentId: string) {
    return (
      (
        await this.db.query(
          "DELETE FROM tool_agent_associations WHERE tool_id=$1 AND agent_id=$2 AND user_id=$3",
          [toolId, agentId, userId],
        )
      ).rowCount !== 0
    );
  }
}
