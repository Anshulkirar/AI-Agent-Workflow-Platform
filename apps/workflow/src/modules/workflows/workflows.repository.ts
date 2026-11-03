import type { Pool, PoolClient } from "@agentflow/db";
import type { WorkflowDefinition } from "@agentflow/types";

type WorkflowRow = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: string;
  trigger: unknown;
  tags: string[];
  graph: unknown;
  settings: unknown;
  current_version: number;
  runs: number;
  success_rate: string | number;
  avg_duration_ms: number;
  last_run_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export function toWorkflow(row: WorkflowRow) {
  return {
    id: row.id,
    ownerId: row.user_id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    status: row.status,
    trigger: row.trigger,
    tags: row.tags,
    graph: row.graph,
    settings: row.settings,
    version: row.current_version,
    runs: row.runs,
    successRate: Number(row.success_rate),
    avgDurationMs: row.avg_duration_ms,
    lastRunAt: row.last_run_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class WorkflowsRepository {
  constructor(private db: Pool) {}

  async create(userId: string, definition: WorkflowDefinition) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const workflow = (
        await client.query<WorkflowRow>(
          `INSERT INTO workflows (user_id,name,description,icon,color,status,trigger,tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          [
            userId,
            definition.name,
            definition.description,
            definition.icon,
            definition.color,
            definition.status,
            JSON.stringify(definition.trigger),
            definition.tags,
          ],
        )
      ).rows[0]!;
      await client.query(
        `INSERT INTO workflow_versions (workflow_id,user_id,version,graph,settings,changelog) VALUES ($1,$2,1,$3,$4,'Initial version')`,
        [
          workflow.id,
          userId,
          JSON.stringify(definition.graph),
          JSON.stringify(definition.settings),
        ],
      );
      await client.query("COMMIT");
      return toWorkflow({
        ...workflow,
        graph: definition.graph,
        settings: definition.settings,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async list(userId: string) {
    const result = await this.db.query<WorkflowRow>(
      "SELECT * FROM workflows WHERE user_id=$1 ORDER BY updated_at DESC",
      [userId],
    );
    return Promise.all(
      result.rows.map((row) => this.withCurrentDefinition(row)),
    );
  }
  async find(userId: string, id: string) {
    const result = await this.db.query<WorkflowRow>(
      "SELECT * FROM workflows WHERE id=$1 AND user_id=$2",
      [id, userId],
    );
    return result.rows[0] ? this.withCurrentDefinition(result.rows[0]) : null;
  }
  async findOwner(id: string) {
    const result = await this.db.query<{ user_id: string }>(
      "SELECT user_id FROM workflows WHERE id=$1",
      [id],
    );
    return result.rows[0]?.user_id ?? null;
  }
  async update(
    userId: string,
    id: string,
    definition: Partial<WorkflowDefinition>,
  ) {
    const editableColumns = [
      "name",
      "description",
      "icon",
      "color",
      "status",
      "trigger",
      "tags",
    ] as const;
    const editable = new Set<string>(editableColumns);
    const columns = Object.keys(definition).filter((key) => editable.has(key));
    if (
      !columns.length &&
      definition.graph === undefined &&
      definition.settings === undefined
    )
      return this.find(userId, id);
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const values: unknown[] = [id, userId];
      const assignments = columns.map((column, index) => {
        const value = (definition as Record<string, unknown>)[column];
        values.push(column === "trigger" ? JSON.stringify(value) : value);
        return `${column === "trigger" ? '"trigger"' : column}=$${index + 3}`;
      });
      if (assignments.length) {
        assignments.push(`updated_at=now()`);
        await client.query(
          `UPDATE workflows SET ${assignments.join(", ")} WHERE id=$1 AND user_id=$2`,
          values,
        );
      }
      if (definition.graph !== undefined || definition.settings !== undefined) {
        const current = (
          await client.query<{
            graph: unknown;
            settings: unknown;
            version: number;
          }>(
            `SELECT current_version version, graph, settings FROM workflow_versions WHERE workflow_id=$1 ORDER BY version DESC LIMIT 1`,
            [id],
          )
        ).rows[0];
        const graph = definition.graph ?? current?.graph;
        const settings = definition.settings ?? current?.settings;
        const version = (current?.version ?? 0) + 1;
        await client.query(
          `INSERT INTO workflow_versions (workflow_id,user_id,version,graph,settings,changelog) VALUES ($1,$2,$3,$4,$5,'Updated workflow')`,
          [
            id,
            userId,
            version,
            JSON.stringify(graph),
            JSON.stringify(settings),
          ],
        );
        await client.query(
          "UPDATE workflows SET current_version=$1, updated_at=now() WHERE id=$2 AND user_id=$3",
          [version, id, userId],
        );
      } else
        await client.query(
          "UPDATE workflows SET updated_at=now() WHERE id=$1 AND user_id=$2",
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
          "DELETE FROM workflows WHERE id=$1 AND user_id=$2 RETURNING id",
          [id, userId],
        )
      ).rowCount === 1
    );
  }

  async createVersion(
    userId: string,
    id: string,
    graph: unknown,
    settings: unknown,
    changelog?: string,
  ) {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const current = (
        await client.query<{
          version: number;
          graph: unknown;
          settings: unknown;
        }>(
          `SELECT version,graph,settings FROM workflow_versions WHERE workflow_id=$1 ORDER BY version DESC LIMIT 1`,
          [id],
        )
      ).rows[0];
      if (!current) return null;
      const version = current.version + 1;
      await client.query(
        `INSERT INTO workflow_versions (workflow_id,user_id,version,graph,settings,changelog) VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          id,
          userId,
          version,
          JSON.stringify(graph),
          JSON.stringify(settings ?? current.settings),
          changelog ?? null,
        ],
      );
      await client.query(
        `UPDATE workflows SET current_version=$1, updated_at=now() WHERE id=$2 AND user_id=$3`,
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
    const result = await this.db.query(
      `SELECT v.id,v.workflow_id,v.version,v.graph,v.settings,v.changelog,v.created_at,w.current_version FROM workflow_versions v JOIN workflows w ON w.id=v.workflow_id WHERE w.id=$1 AND w.user_id=$2 ORDER BY v.version DESC`,
      [id, userId],
    );
    return result.rows;
  }
  async version(userId: string, id: string, version: number) {
    const result = await this.db.query(
      `SELECT v.id,v.workflow_id,v.version,v.graph,v.settings,v.changelog,v.created_at,w.current_version FROM workflow_versions v JOIN workflows w ON w.id=v.workflow_id WHERE w.id=$1 AND w.user_id=$2 AND v.version=$3`,
      [id, userId, version],
    );
    return result.rows[0] ?? null;
  }
  async activateVersion(userId: string, id: string, version: number) {
    const result = await this.db.query(
      `UPDATE workflows w SET current_version=$3,updated_at=now() FROM workflow_versions v WHERE w.id=$1 AND w.user_id=$2 AND v.workflow_id=w.id AND v.version=$3 RETURNING w.id`,
      [id, userId, version],
    );
    return result.rowCount === 1;
  }
  private async withCurrentDefinition(row: WorkflowRow) {
    const result = await this.db.query<{ graph: unknown; settings: unknown }>(
      "SELECT graph,settings FROM workflow_versions WHERE workflow_id=$1 AND version=$2",
      [row.id, row.current_version],
    );
    return toWorkflow({
      ...row,
      graph: result.rows[0]?.graph ?? row.graph,
      settings: result.rows[0]?.settings ?? row.settings,
    });
  }
}
