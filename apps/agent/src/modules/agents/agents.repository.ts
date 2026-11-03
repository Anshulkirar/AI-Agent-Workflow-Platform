import type { Pool } from "@agentflow/db";
import type { AgentDefinition } from "@agentflow/types";

type AgentRow = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: string;
  instructions: string;
  tools: string[];
  knowledge: string[];
  settings: unknown;
  workflow: unknown | null;
  current_version: number;
  runs: number;
  success_rate: string | number;
  last_run_at: Date | null;
  created_at: Date;
  updated_at: Date;
};
export function toAgent(row: AgentRow) {
  return {
    id: row.id,
    ownerId: row.user_id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    status: row.status,
    instructions: row.instructions,
    tools: row.tools,
    knowledge: row.knowledge,
    settings: row.settings,
    workflow: row.workflow,
    version: row.current_version,
    runs: row.runs,
    successRate: Number(row.success_rate),
    lastRunAt: row.last_run_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
export class AgentsRepository {
  constructor(private db: Pool) {}
  async create(userId: string, agent: AgentDefinition) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const row = (
        await client.query<AgentRow>(
          `INSERT INTO agents (user_id,name,description,icon,color,status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [
            userId,
            agent.name,
            agent.description,
            agent.icon,
            agent.color,
            agent.status,
          ],
        )
      ).rows[0]!;
      await client.query(
        `INSERT INTO agent_versions (agent_id,user_id,version,instructions,tools,knowledge,settings,workflow,changelog) VALUES ($1,$2,1,$3,$4,$5,$6,$7,'Initial version')`,
        [
          row.id,
          userId,
          agent.instructions,
          agent.tools,
          agent.knowledge,
          JSON.stringify(agent.settings),
          agent.workflow === undefined ? null : JSON.stringify(agent.workflow),
        ],
      );
      await client.query("COMMIT");
      return toAgent({
        ...row,
        instructions: agent.instructions,
        tools: agent.tools,
        knowledge: agent.knowledge,
        settings: agent.settings,
        workflow: agent.workflow ?? null,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async list(userId: string) {
    const result = await this.db.query<AgentRow>(
      "SELECT * FROM agents WHERE user_id=$1 ORDER BY updated_at DESC",
      [userId],
    );
    return Promise.all(
      result.rows.map((row) => this.withCurrentDefinition(row)),
    );
  }
  async find(userId: string, id: string) {
    const result = await this.db.query<AgentRow>(
      "SELECT * FROM agents WHERE id=$1 AND user_id=$2",
      [id, userId],
    );
    return result.rows[0] ? this.withCurrentDefinition(result.rows[0]) : null;
  }
  async findOwner(id: string) {
    const result = await this.db.query<{ user_id: string }>(
      "SELECT user_id FROM agents WHERE id=$1",
      [id],
    );
    return result.rows[0]?.user_id ?? null;
  }
  async update(userId: string, id: string, patch: Partial<AgentDefinition>) {
    const metadata = [
      "name",
      "description",
      "icon",
      "color",
      "status",
    ] as const;
    const columns = Object.keys(patch).filter(
      (key) =>
        metadata.includes(key as (typeof metadata)[number]) ||
        key === "instructions" ||
        key === "tools" ||
        key === "knowledge" ||
        key === "settings" ||
        key === "workflow",
    );
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const metaColumns = columns.filter((key) =>
        metadata.includes(key as (typeof metadata)[number]),
      );
      if (metaColumns.length) {
        const values: [string, string, ...unknown[]] = [id, userId];
        const assignments = metaColumns.map((column, index) => {
          values.push((patch as Record<string, unknown>)[column]!);
          return `${column}=$${index + 3}`;
        });
        await client.query(
          `UPDATE agents SET ${assignments.join(",")},updated_at=now() WHERE id=$1 AND user_id=$2`,
          values,
        );
      }
      const configChanged = columns.some((key) =>
        ["instructions", "tools", "knowledge", "settings", "workflow"].includes(
          key,
        ),
      );
      if (configChanged) {
        const current = (
          await client.query<{
            instructions: string;
            tools: string[];
            knowledge: string[];
            settings: unknown;
            workflow: unknown | null;
            version: number;
          }>(
            "SELECT v.version,v.instructions,v.tools,v.knowledge,v.settings,v.workflow FROM agent_versions v JOIN agents a ON a.id=v.agent_id WHERE v.agent_id=$1 AND v.version=a.current_version",
            [id],
          )
        ).rows[0];
        if (!current) throw new Error("Agent has no current version");
        const instructions = patch.instructions ?? current.instructions,
          tools = patch.tools ?? current.tools,
          knowledge = patch.knowledge ?? current.knowledge,
          settings = patch.settings ?? current.settings,
          workflow = patch.workflow ?? current.workflow;
        const version = current.version + 1;
        await client.query(
          `INSERT INTO agent_versions (agent_id,user_id,version,instructions,tools,knowledge,settings,workflow,changelog) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Configuration updated')`,
          [
            id,
            userId,
            version,
            instructions,
            tools,
            knowledge,
            JSON.stringify(settings),
            workflow === undefined || workflow === null
              ? null
              : JSON.stringify(workflow),
          ],
        );
        await client.query(
          "UPDATE agents SET current_version=$1,updated_at=now() WHERE id=$2 AND user_id=$3",
          [version, id, userId],
        );
      } else
        await client.query(
          "UPDATE agents SET updated_at=now() WHERE id=$1 AND user_id=$2",
          [id, userId],
        );
      await client.query("COMMIT");
      return this.find(userId, id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async remove(userId: string, id: string) {
    return (
      (
        await this.db.query(
          "DELETE FROM agents WHERE id=$1 AND user_id=$2 RETURNING id",
          [id, userId],
        )
      ).rowCount === 1
    );
  }
  async createVersion(
    userId: string,
    id: string,
    configuration: {
      instructions: string;
      tools: string[];
      knowledge: string[];
      settings: unknown;
      workflow?: unknown;
    },
    changelog?: string,
  ) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const current = (
        await client.query<{ version: number }>(
          "SELECT v.version FROM agent_versions v JOIN agents a ON a.id=v.agent_id WHERE v.agent_id=$1 AND v.version=a.current_version",
          [id],
        )
      ).rows[0];
      if (!current) {
        await client.query("ROLLBACK");
        return null;
      }
      const version = current.version + 1;
      await client.query(
        `INSERT INTO agent_versions (agent_id,user_id,version,instructions,tools,knowledge,settings,workflow,changelog) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          id,
          userId,
          version,
          configuration.instructions,
          configuration.tools,
          configuration.knowledge,
          JSON.stringify(configuration.settings),
          configuration.workflow === undefined
            ? null
            : JSON.stringify(configuration.workflow),
          changelog ?? null,
        ],
      );
      await client.query(
        "UPDATE agents SET current_version=$1,updated_at=now() WHERE id=$2 AND user_id=$3",
        [version, id, userId],
      );
      await client.query("COMMIT");
      return version;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async versions(userId: string, id: string) {
    return (
      await this.db.query(
        `SELECT v.id,v.agent_id,v.version,v.instructions,v.tools,v.knowledge,v.settings,v.workflow,v.changelog,v.created_at,a.current_version FROM agent_versions v JOIN agents a ON a.id=v.agent_id WHERE a.id=$1 AND a.user_id=$2 ORDER BY v.version DESC`,
        [id, userId],
      )
    ).rows;
  }
  async version(userId: string, id: string, version: number) {
    return (
      (
        await this.db.query(
          `SELECT v.id,v.agent_id,v.version,v.instructions,v.tools,v.knowledge,v.settings,v.workflow,v.changelog,v.created_at,a.current_version FROM agent_versions v JOIN agents a ON a.id=v.agent_id WHERE a.id=$1 AND a.user_id=$2 AND v.version=$3`,
          [id, userId, version],
        )
      ).rows[0] ?? null
    );
  }
  async activateVersion(userId: string, id: string, version: number) {
    return (
      (
        await this.db.query(
          `UPDATE agents a SET current_version=$3,updated_at=now() FROM agent_versions v WHERE a.id=$1 AND a.user_id=$2 AND v.agent_id=a.id AND v.version=$3 RETURNING a.id`,
          [id, userId, version],
        )
      ).rowCount === 1
    );
  }
  private async withCurrentDefinition(row: AgentRow) {
    const result = await this.db.query<{
      instructions: string;
      tools: string[];
      knowledge: string[];
      settings: unknown;
      workflow: unknown | null;
    }>(
      "SELECT instructions,tools,knowledge,settings,workflow FROM agent_versions WHERE agent_id=$1 AND version=$2",
      [row.id, row.current_version],
    );
    const current = result.rows[0];
    return toAgent({
      ...row,
      instructions: current?.instructions ?? row.instructions,
      tools: current?.tools ?? row.tools,
      knowledge: current?.knowledge ?? row.knowledge,
      settings: current?.settings ?? row.settings,
      workflow: current?.workflow ?? row.workflow,
    });
  }
}
