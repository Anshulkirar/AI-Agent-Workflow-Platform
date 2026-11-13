import { createPool } from "@agentflow/db";
import { Redis } from "ioredis";
import { z } from "zod";
import { readFile } from "node:fs/promises";

const env = z
  .object({
    EXECUTION_DATABASE_URL: z.string().min(1),
      KNOWLEDGE_DATABASE_URL: z.string().min(1).optional(),
    REDIS_URL: z.string().min(1),
      WORKFLOW_SERVICE_URL: z.string().default("http://127.0.0.1:4002"),
      AGENT_SERVICE_URL: z.string().default("http://127.0.0.1:4003"),
      EXECUTION_SERVICE_URL: z.string().default("http://127.0.0.1:4004"),
      TOOLS_SERVICE_URL: z.string().default("http://127.0.0.1:4005"),
  })
  .parse(process.env);
const db = createPool(env.EXECUTION_DATABASE_URL);
const knowledgeDb = env.KNOWLEDGE_DATABASE_URL ? createPool(env.KNOWLEDGE_DATABASE_URL) : null;
const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const queue = "agentflow:execution:queue";
const knowledgeQueue = "agentflow:knowledge:queue";
let stopping = false;

console.log("[worker] started");
void consume();

async function consume() {
  while (!stopping) {
    try {
      const job = await redis.brpop(queue, knowledgeQueue, 5);
      if (!job) continue;
      if (job[0] === queue) await execute(job[1]);
      else if (knowledgeDb) await processKnowledge(job[1]);
    } catch (error) {
      console.error("execution worker error", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function execute(id: string) {
  const run = await db.query<{
    timeout_ms: number;
    status: string;
    attempt: number;
    max_attempts: number;
    source_type: string;
    source_id: string;
    input: unknown;
    user_id: string;
  }>(
    "SELECT timeout_ms, status, attempt, max_attempts, source_type, source_id, input, user_id FROM execution_runs WHERE id = $1",
    [id],
  );
  const row = run.rows[0];
  if (!row || row.status === "cancelled") return;

  await db.query(
    "UPDATE execution_runs SET status = 'running', attempt = attempt + 1, started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = $1 AND status IN ('queued', 'running')",
    [id],
  );
  await addLog(id, "info", "Execution started");

  try {
    const output = row.source_type === "workflow"
      ? await executeWorkflow(id, row.source_id, row.input, row.user_id, row.timeout_ms)
      : await simulateExecution(row.timeout_ms);
    await db.query(
      `UPDATE execution_runs SET status = 'completed', output = $2, completed_at = now(),
       duration_ms = GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(started_at, now()))) * 1000)::integer, updated_at = now()
       WHERE id = $1 AND status = 'running'`,
      [id, JSON.stringify(output)],
    );
    await addLog(id, "success", "Execution completed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    const current = await db.query<{ attempt: number; max_attempts: number }>(
      "SELECT attempt, max_attempts FROM execution_runs WHERE id = $1",
      [id],
    );
    const retry =
      current.rows[0] && current.rows[0].attempt < current.rows[0].max_attempts;
    await db.query(
      retry
        ? "UPDATE execution_runs SET status = 'queued', error_message = $2, updated_at = now() WHERE id = $1"
        : "UPDATE execution_runs SET status = 'failed', error_message = $2, completed_at = now(), updated_at = now() WHERE id = $1",
      [id, message],
    );
    await addLog(id, "error", message);
    if (retry) await redis.rpush(queue, id);
  }
}

async function simulateExecution(timeoutMs: number) {
  await Promise.race([
    new Promise<void>((resolve) => setTimeout(resolve, 100)),
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error("Execution timed out")), timeoutMs),
    ),
  ]);
  return { status: "ok", completedAt: new Date().toISOString() };
}

async function addLog(id: string, level: string, message: string) {
  await db.query(
    "INSERT INTO execution_logs (run_id, at_ms, level, message) SELECT $1, GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer, $2, $3 FROM execution_runs WHERE id = $1",
    [id, level, message],
  );
}

async function processKnowledge(id: string) {
  if (!knowledgeDb) return;
  const sourceResult = await knowledgeDb.query<{
    type: string;
    file_kind: string | null;
    storage_path: string | null;
    source_url: string | null;
    text_content: string | null;
    status: string;
  }>("SELECT type, file_kind, storage_path, source_url, text_content, status FROM knowledge_sources WHERE id = $1", [id]);
  const source = sourceResult.rows[0];
  if (!source || source.status === "ready") return;

  try {
    await knowledgeDb.query(
      "UPDATE knowledge_sources SET status = 'processing', attempts = attempts + 1, stage = CASE WHEN type = 'file' THEN 'parsing' WHEN type = 'url' THEN 'crawling' ELSE 'chunking' END, progress = 10, updated_at = now() WHERE id = $1",
      [id],
    );
    let text = source.text_content ?? "";
    if (source.type === "url") {
      const response = await fetch(source.source_url!);
      if (!response.ok) throw new Error(`Unable to fetch URL (${response.status})`);
      text = stripHtml(await response.text());
    } else if (source.type === "file") {
      if (!["txt", "md", "csv", "json", "html"].includes(source.file_kind ?? "")) {
        throw new Error(`Text extraction for ${source.file_kind ?? "this file type"} requires a document parser; the source is stored securely and can be processed when that parser is configured.`);
      }
      text = await readFile(source.storage_path!, "utf8");
      if (source.file_kind === "html") text = stripHtml(text);
    }
    text = text.trim();
    if (!text) throw new Error("No text could be extracted from the source.");

    await knowledgeDb.query("UPDATE knowledge_sources SET stage = 'chunking', progress = 45, updated_at = now() WHERE id = $1", [id]);
    const chunks = splitText(text, 800, 100);
    await knowledgeDb.query("DELETE FROM knowledge_chunks WHERE source_id = $1", [id]);
    await knowledgeDb.query("UPDATE knowledge_sources SET stage = 'embedding', progress = 75, updated_at = now() WHERE id = $1", [id]);
    for (let index = 0; index < chunks.length; index++) {
      await knowledgeDb.query(
        "INSERT INTO knowledge_chunks (source_id, chunk_index, content, token_count, embedding) VALUES ($1,$2,$3,$4,$5)",
        [id, index, chunks[index]!, Math.max(1, Math.round(chunks[index]!.length / 4)), JSON.stringify(embed(chunks[index]!))],
      );
    }
    await knowledgeDb.query(
      `UPDATE knowledge_sources SET status = 'ready', stage = 'indexing', progress = 100,
       chunk_count = $2, token_count = $3, preview = $4, processed_at = now(),
       error_message = NULL, updated_at = now() WHERE id = $1`,
      [id, chunks.length, Math.max(1, Math.round(text.length / 4)), text.slice(0, 2000)],
    );
    await knowledgeDb.query("UPDATE knowledge_sources SET stage = NULL, updated_at = now() WHERE id = $1", [id]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Knowledge processing failed";
    await knowledgeDb.query(
      "UPDATE knowledge_sources SET status = 'failed', error_message = $2, updated_at = now() WHERE id = $1",
      [id, message],
    );
  }
}

function stripHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ").trim();
}

function splitText(text: string, size: number, overlap: number) {
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += size - overlap) {
    chunks.push(text.slice(start, start + size).trim());
    if (start + size >= text.length) break;
  }
  return chunks.filter(Boolean);
}

function embed(text: string) {
  const vector = new Array<number>(64).fill(0);
  for (const token of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    let hash = 0;
    for (let index = 0; index < token.length; index++) {
      hash = ((hash << 5) - hash + token.charCodeAt(index)) | 0;
    }
    const bucket = ((hash % 64) + 64) % 64;
    vector[bucket] = (vector[bucket] ?? 0) + 1;
  }
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return length ? vector.map((value) => value / length) : vector;
}

type WorkflowNode = {
  id: string;
  data: {
    kind: string;
    label?: string;
    toolId?: string;
    config?: Record<string, unknown>;
  };
};
type WorkflowGraph = {
  nodes: WorkflowNode[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    label?: string;
  }>;
};

async function executeWorkflow(runId: string, workflowId: string, input: unknown, userId: string, timeoutMs: number) {
  const response = await fetch(`${env.WORKFLOW_SERVICE_URL.replace(/\/$/, "")}/internal/workflows/${workflowId}`);
  if (!response.ok) throw new Error(`Workflow source returned ${response.status}`);
  const workflow = await response.json() as { graph: WorkflowGraph; userId: string };
  if (workflow.userId !== userId) throw new Error("Workflow ownership mismatch");
  const graph = workflow.graph;
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const dependencies = new Map(graph.nodes.map((node) => [node.id, [] as string[]]));
  const successors = new Map(graph.nodes.map((node) => [node.id, [] as string[]]));
  for (const edge of graph.edges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) throw new Error("Workflow edge references an unknown node");
    dependencies.get(edge.target)!.push(edge.source);
    successors.get(edge.source)!.push(edge.target);
  }

  const outputs = new Map<string, unknown>();
  const pending = new Set(nodeById.keys());
  const completed = new Set<string>();
  outputs.set("__input", input ?? {});
  const deadline = Date.now() + timeoutMs;

  while (pending.size) {
    if (Date.now() >= deadline) throw new Error("Workflow execution timed out");
    const cancelled = await db.query<{ status: string }>("SELECT status FROM execution_runs WHERE id=$1", [runId]);
    if (cancelled.rows[0]?.status === "cancelled") throw new Error("Workflow execution cancelled");
    const ready = [...pending].filter((id) =>
      (dependencies.get(id) ?? []).every((dependency) => completed.has(dependency)),
    );
    if (!ready.length) throw new Error("Workflow dependency cycle detected");

    await Promise.all(ready.map(async (nodeId) => {
      const node = nodeById.get(nodeId)!;
      const enabled = (dependencies.get(nodeId) ?? []).every((sourceId) => {
        const edges = graph.edges.filter((edge) => edge.target === nodeId && edge.source === sourceId);
        return edges.some((edge) => branchEnabled(edge, outputs.get(sourceId)));
      });
      if (!enabled) {
        await saveNodeRun(runId, node, "skipped", input, null, null, 0, 1);
        completed.add(nodeId);
        pending.delete(nodeId);
        return;
      }
      await saveNodeRun(runId, node, "running", mergeNodeInput(nodeId, graph.edges, outputs, input), null, null, 0, 1);
      const nodeInput = mergeNodeInput(nodeId, graph.edges, outputs, input);
      try {
        const output = await executeWorkflowNode(node, nodeInput, userId, Math.max(100, deadline - Date.now()));
        outputs.set(nodeId, output);
        await saveNodeRun(runId, node, "completed", nodeInput, output, null, 1, 1);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Node execution failed";
        await saveNodeRun(runId, node, "failed", nodeInput, null, message, 1, 1);
        throw error;
      }
      completed.add(nodeId);
      pending.delete(nodeId);
    }));
  }

  const outputsNode = [...nodeById.values()].reverse().find((node) => node.data.kind === "output");
  const lastOutput = outputsNode ? outputs.get(outputsNode.id) : Object.fromEntries(outputs);
  await db.query("UPDATE execution_runs SET output=$2 WHERE id=$1", [runId, JSON.stringify(lastOutput ?? {})]);
  return lastOutput ?? {};
}

function branchEnabled(edge: WorkflowGraph["edges"][number], sourceOutput: unknown) {
  const branch = (edge.sourceHandle ?? edge.label)?.toLowerCase();
  if (!branch) return true;
  const condition = typeof sourceOutput === "object" && sourceOutput !== null
    ? Boolean((sourceOutput as { condition?: unknown }).condition)
    : Boolean(sourceOutput);
  if (["true", "yes", "1", "true_branch"].includes(branch)) return condition;
  if (["false", "no", "0", "false_branch"].includes(branch)) return !condition;
  return true;
}

function mergeNodeInput(nodeId: string, edges: WorkflowGraph["edges"], outputs: Map<string, unknown>, runInput: unknown) {
  const parents = edges.filter((edge) => edge.target === nodeId).map((edge) => outputs.get(edge.source));
  if (!parents.length) return runInput ?? {};
  if (parents.length === 1) return parents[0] ?? {};
  return { inputs: parents };
}

async function executeWorkflowNode(node: WorkflowNode, input: unknown, userId: string, timeoutMs: number): Promise<unknown> {
  const kind = node.data.kind;
  if (kind === "input") return input ?? {};
  if (kind === "output") return input ?? {};
  if (kind === "transform") {
    const expression = String(node.data.config?.expression ?? "");
    if (expression) return { result: expression.replace(/\{\{input\}\}/g, JSON.stringify(input)) };
    return input ?? {};
  }
  if (kind === "condition") {
    const field = String(node.data.config?.field ?? "");
    const equals = String(node.data.config?.equals ?? "");
    const value = typeof input === "object" && input !== null ? (input as Record<string, unknown>)[field] : input;
    return { condition: equals === "" ? Boolean(value) : String(value) === equals };
  }
  if (kind === "tool") {
    const id = node.data.toolId;
    if (!id) throw new Error("Tool node has no toolId");
    const response = await authenticatedFetch(`${env.TOOLS_SERVICE_URL.replace(/\/$/, "")}/tools/${id}`, userId);
    if (!response.ok) throw new Error(`Tool returned ${response.status}`);
    return response.json();
  }
  if (kind === "agent" || kind === "llm") {
    const agentId = String(node.data.config?.agentId ?? "");
    if (kind === "agent" && !agentId) throw new Error("Agent node has no agentId");
    const response = await authenticatedFetch(`${env.EXECUTION_SERVICE_URL.replace(/\/$/, "")}/runs`, userId, {
      method: "POST",
      body: JSON.stringify({ sourceType: "agent", sourceId: agentId || "00000000-0000-0000-0000-000000000000", input: typeof input === "string" ? input : JSON.stringify(input), timeoutMs: Math.min(timeoutMs, 300000), maxAttempts: 1 }),
      headers: { "content-type": "application/json" },
    });
    if (!response.ok) throw new Error(`Agent execution returned ${response.status}`);
    const run = await response.json() as { id: string };
    return pollRun(run.id, userId, timeoutMs);
  }
  throw new Error(`Unsupported workflow node kind: ${kind}`);
}

async function authenticatedFetch(url: string, userId: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), "x-user-id": userId },
    signal: AbortSignal.timeout(Math.max(100, 30000)),
  });
}

async function pollRun(runId: string, userId: string, timeoutMs: number) {
  const deadline = Date.now() + Math.min(timeoutMs, 300000);
  while (Date.now() < deadline) {
    const response = await authenticatedFetch(`${env.EXECUTION_SERVICE_URL.replace(/\/$/, "")}/runs/${runId}`, userId);
    if (!response.ok) throw new Error(`Nested run returned ${response.status}`);
    const run = await response.json() as { status: string; output?: unknown; error_message?: string };
    if (run.status === "completed") return run.output ?? {};
    if (run.status === "failed" || run.status === "cancelled") throw new Error(run.error_message ?? `Nested run ${run.status}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Agent execution timed out");
}

async function saveNodeRun(runId: string, node: WorkflowNode, status: string, input: unknown, output: unknown, error: string | null, attempt: number, maxAttempts: number) {
  await db.query(
    `INSERT INTO workflow_node_runs (run_id,node_id,node_kind,status,input,output,error_message,attempt,max_attempts,started_at,completed_at,updated_at)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,
       CASE WHEN $4 IS NOT NULL THEN now() ELSE NULL END,
       CASE WHEN $4 IN ('completed','failed','cancelled','skipped') THEN now() ELSE NULL END,now())
     ON CONFLICT (run_id,node_id) DO UPDATE SET status=$4,node_kind=$3,input=$5,output=$6::jsonb,error_message=$7,
       attempt=$8,completed_at=CASE WHEN $4 IN ('completed','failed','cancelled','skipped') THEN COALESCE(workflow_node_runs.completed_at,now()) ELSE workflow_node_runs.completed_at END,updated_at=now()`,
    [runId, node.id, node.data.kind, status, JSON.stringify(input ?? {}), output === null ? null : JSON.stringify(output), error, attempt, maxAttempts],
  );
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    stopping = true;
    void Promise.all([
      redis.quit(),
      db.end(),
      knowledgeDb ? knowledgeDb.end() : Promise.resolve(),
    ]).then(() => process.exit(0));
  });
}
