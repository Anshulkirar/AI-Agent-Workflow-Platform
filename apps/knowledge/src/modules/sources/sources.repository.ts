import type { Pool } from "@agentflow/db";

export type KnowledgeSourceRow = {
  id: string;
  user_id: string;
  name: string;
  type: "file" | "url" | "text";
  file_kind: string | null;
  source_url: string | null;
  storage_path: string | null;
  text_content: string | null;
  collection_id: string;
  tags: string[];
  size_bytes: string;
  pages: number | null;
  chunk_count: number;
  token_count: number;
  status: "queued" | "processing" | "ready" | "failed";
  stage: string | null;
  progress: number;
  error_message: string | null;
  attempts: number;
  preview: string;
  sync_schedule: string;
  created_at: Date;
  updated_at: Date;
  processed_at: Date | null;
};

export function toSource(row: KnowledgeSourceRow) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    fileKind: row.file_kind ?? undefined,
    url: row.source_url ?? undefined,
    collectionId: row.collection_id,
    tags: row.tags ?? [],
    sizeBytes: Number(row.size_bytes),
    pages: row.pages ?? undefined,
    chunks: row.chunk_count,
    tokens: row.token_count,
    status: row.status,
    stage: row.stage ?? undefined,
    progress: row.progress,
    error: row.error_message ?? undefined,
    attempts: row.attempts,
    preview: row.preview,
    syncSchedule: row.sync_schedule,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    processedAt: row.processed_at?.toISOString() ?? null,
  };
}

export class SourcesRepository {
  constructor(private db: Pool) {}

  async list(userId: string) {
    const result = await this.db.query<KnowledgeSourceRow>(
      "SELECT * FROM knowledge_sources WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return result.rows.map(toSource);
  }

  async find(userId: string, id: string) {
    const result = await this.db.query<KnowledgeSourceRow>(
      "SELECT * FROM knowledge_sources WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return result.rows[0] ? toSource(result.rows[0]) : null;
  }

  async findRow(id: string) {
    const result = await this.db.query<KnowledgeSourceRow>("SELECT * FROM knowledge_sources WHERE id = $1", [id]);
    return result.rows[0] ?? null;
  }

  async create(userId: string, input: {
    name: string;
    type: "file" | "url" | "text";
    collectionId: string;
    tags: string[];
    url?: string;
    fileKind?: string;
    storagePath?: string;
    textContent?: string;
    sizeBytes?: number;
  }) {
    const result = await this.db.query<KnowledgeSourceRow>(
      `INSERT INTO knowledge_sources
       (user_id, name, type, file_kind, source_url, storage_path, text_content, collection_id, tags, size_bytes, stage, status, progress)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'queued',0)
       RETURNING *`,
      [
        userId, input.name, input.type, input.fileKind ?? null, input.url ?? null,
        input.storagePath ?? null, input.textContent ?? null, input.collectionId,
        JSON.stringify(input.tags), input.sizeBytes ?? Buffer.byteLength(input.textContent ?? ""),
        input.type === "file" ? "uploading" : input.type === "url" ? "crawling" : "chunking",
      ],
    );
    return toSource(result.rows[0]!);
  }

  async update(userId: string, id: string, input: Record<string, unknown>) {
    const fields: string[] = [];
    const values: unknown[] = [];
    const columns: Record<string, string> = { name: "name", collectionId: "collection_id", tags: "tags", syncSchedule: "sync_schedule" };
    for (const [key, column] of Object.entries(columns)) {
      if (input[key] !== undefined) {
        values.push(key === "tags" ? JSON.stringify(input[key]) : input[key]);
        fields.push(`${column} = $${values.length}`);
      }
    }
    if (!fields.length) return this.find(userId, id);
    values.push(id, userId);
    const result = await this.db.query<KnowledgeSourceRow>(
      `UPDATE knowledge_sources SET ${fields.join(", ")}, updated_at = now() WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`,
      values,
    );
    return result.rows[0] ? toSource(result.rows[0]) : null;
  }

  async remove(userId: string, id: string) {
    const result = await this.db.query("DELETE FROM knowledge_sources WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId]);
    return result.rowCount === 1;
  }

  async retry(id: string) {
    await this.db.query(
      "UPDATE knowledge_sources SET status = 'queued', stage = CASE WHEN type = 'file' THEN 'uploading' WHEN type = 'url' THEN 'crawling' ELSE 'chunking' END, progress = 0, error_message = NULL, updated_at = now() WHERE id = $1",
      [id],
    );
  }

  async owner(id: string) {
    const result = await this.db.query<{ user_id: string }>("SELECT user_id FROM knowledge_sources WHERE id = $1", [id]);
    return result.rows[0]?.user_id ?? null;
  }

  async associate(userId: string, id: string, agentId: string) {
    await this.db.query(
      "INSERT INTO knowledge_agent_associations (agent_id, source_id) SELECT $1, id FROM knowledge_sources WHERE id = $2 AND user_id = $3 ON CONFLICT DO NOTHING",
      [agentId, id, userId],
    );
  }

  async unassociate(userId: string, id: string, agentId: string) {
    const result = await this.db.query(
      "DELETE FROM knowledge_agent_associations WHERE agent_id = $1 AND source_id = $2 AND EXISTS (SELECT 1 FROM knowledge_sources WHERE id = $2 AND user_id = $3)",
      [agentId, id, userId],
    );
    return result.rowCount === 1;
  }

  async search(userId: string, query: number[], limit: number) {
    const result = await this.db.query<{ id: string; source_id: string; chunk_index: number; content: string; embedding: unknown }>(
      `SELECT c.id, c.source_id, c.chunk_index, c.content, c.embedding
       FROM knowledge_chunks c
       JOIN knowledge_sources s ON s.id = c.source_id
       WHERE s.user_id = $1`,
      [userId],
    );
    const cosine = (a: number[], b: number[]) => {
      const dot = a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
      const length = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0)) *
        Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
      return length ? dot / length : 0;
    };
    const embedding = (value: unknown) => Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
    return result.rows
      .map((row) => ({ ...row, embedding: undefined, score: cosine(query, embedding(row.embedding)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
