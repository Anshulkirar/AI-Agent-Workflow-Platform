import { defaultNodeConfig, modelName, toolsById } from "./catalog";
import type { Agent, ModelSettings, StoredEdge, StoredNode, Workflow, WorkflowNodeData } from "./types";

export const NODE_WIDTH = 224;

let counter = 0;
export function nodeId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/** Builds the starter workflow shown when an agent has none saved yet. */
export function createDefaultWorkflow(agent: Pick<Agent, "name" | "tools" | "settings" | "instructions">): Workflow {
  const toolIds = agent.tools.slice(0, 4);
  const centerX = 0;
  const node = (id: string, x: number, y: number, data: Omit<WorkflowNodeData, "config"> & { config?: WorkflowNodeData["config"] }): StoredNode => ({
    id,
    position: { x: x - NODE_WIDTH / 2, y },
    data: {
      ...data,
      config: data.config ?? defaultNodeConfig(data.kind, data.toolId, agent.settings, agent.instructions),
    },
  });

  const nodes: StoredNode[] = [
    node("input", centerX, 0, { kind: "input", label: "User Input" }),
    node("llm", centerX, 130, { kind: "llm", label: agent.name }),
  ];
  const edges: StoredEdge[] = [{ id: "e-input-llm", source: "input", target: "llm" }];

  const spacing = NODE_WIDTH + 36;
  const startX = centerX - ((toolIds.length - 1) * spacing) / 2;
  toolIds.forEach((toolId, index) => {
    const id = `tool-${toolId}`;
    nodes.push(
      node(id, startX + index * spacing, 280, {
        kind: "tool",
        toolId,
        label: toolsById.get(toolId)?.name ?? "Tool",
      }),
    );
    edges.push({ id: `e-llm-${id}`, source: "llm", target: id });
    edges.push({ id: `e-${id}-summary`, source: id, target: "summary" });
  });

  nodes.push(node("summary", centerX, toolIds.length ? 430 : 280, { kind: "transform", label: "Summarize" }));
  nodes.push(node("output", centerX, toolIds.length ? 560 : 410, { kind: "output", label: "Output" }));
  if (!toolIds.length) edges.push({ id: "e-llm-summary", source: "llm", target: "summary" });
  edges.push({ id: "e-summary-output", source: "summary", target: "output" });

  return { nodes, edges };
}

export type NodeSpec = {
  id: string;
  kind: WorkflowNodeData["kind"];
  label: string;
  toolId?: string;
  config?: WorkflowNodeData["config"];
};

/**
 * Builds a laid-out graph from nodes and [source, target, handle?] links.
 * Used for workflow seeds and creation templates.
 */
export function graphFromSpec(
  specs: NodeSpec[],
  links: [string, string, ("true" | "false")?][],
  settings: ModelSettings,
  instructions = "",
): Workflow {
  const nodes: StoredNode[] = specs.map((spec) => ({
    id: spec.id,
    position: { x: 0, y: 0 },
    data: {
      kind: spec.kind,
      label: spec.label,
      toolId: spec.toolId,
      config: { ...defaultNodeConfig(spec.kind, spec.toolId, settings, instructions), ...spec.config },
    },
  }));
  const edges: StoredEdge[] = links.map(([source, target, handle]) => ({
    id: `e-${source}-${handle ?? "out"}-${target}`,
    source,
    target,
    sourceHandle: handle ?? null,
    label: handle ? (handle === "true" ? "Yes" : "No") : undefined,
  }));
  return { nodes: layoutWorkflow(nodes, edges), edges };
}

type PlanNode = { id: string; data: WorkflowNodeData };
type PlanEdge = { id: string; source: string; target: string; sourceHandle?: string | null };

export type ExecutionPlan = {
  levels: string[][];
  activeEdges: Set<string>;
  reachable: Set<string>;
  errors: string[];
  warnings: string[];
};

/**
 * Plans a simulated run: walks from the input node(s), takes the "true"
 * branch of conditions, and groups nodes into levels that run in parallel.
 */
export function planExecution(nodes: PlanNode[], edges: PlanEdge[]): ExecutionPlan {
  const plan: ExecutionPlan = { levels: [], activeEdges: new Set(), reachable: new Set(), errors: [], warnings: [] };
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const inputs = nodes.filter((node) => node.data.kind === "input");
  const outputs = nodes.filter((node) => node.data.kind === "output");

  if (!inputs.length) plan.errors.push("Add a User Input node to start the workflow.");
  if (!outputs.length) plan.errors.push("Add an Output node to return results.");
  if (plan.errors.length) return plan;

  const followable = (edge: PlanEdge) => {
    const source = byId.get(edge.source);
    return source?.data.kind !== "condition" || edge.sourceHandle !== "false";
  };

  const queue = inputs.map((node) => node.id);
  queue.forEach((id) => plan.reachable.add(id));
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.source !== current || !followable(edge) || !byId.has(edge.target)) continue;
      plan.activeEdges.add(edge.id);
      if (!plan.reachable.has(edge.target)) {
        plan.reachable.add(edge.target);
        queue.push(edge.target);
      }
    }
  }

  if (!outputs.some((node) => plan.reachable.has(node.id))) {
    plan.errors.push("The Output node isn't connected to the User Input. Connect the nodes to complete the flow.");
    return plan;
  }

  const skipped = nodes.length - plan.reachable.size;
  if (skipped > 0) {
    plan.warnings.push(`${skipped} node${skipped === 1 ? " isn't" : "s aren't"} on the active path and will be skipped.`);
  }

  // Kahn's algorithm, level by level, over the active subgraph.
  const active = edges.filter((edge) => plan.activeEdges.has(edge.id));
  const indegree = new Map<string, number>([...plan.reachable].map((id) => [id, 0]));
  active.forEach((edge) => indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1));

  let frontier = [...indegree].filter(([, degree]) => degree === 0).map(([id]) => id);
  let placed = 0;
  while (frontier.length) {
    plan.levels.push(frontier);
    placed += frontier.length;
    const next: string[] = [];
    for (const id of frontier) {
      for (const edge of active) {
        if (edge.source !== id) continue;
        const degree = (indegree.get(edge.target) ?? 0) - 1;
        indegree.set(edge.target, degree);
        if (degree === 0) next.push(edge.target);
      }
    }
    frontier = next;
  }

  if (placed < plan.reachable.size) {
    plan.errors.push("The workflow contains a loop. Remove the circular connection and try again.");
  }

  return plan;
}

/** Positions nodes in tidy top-to-bottom layers. */
export function layoutWorkflow<T extends { id: string; position: { x: number; y: number } }>(
  nodes: T[],
  edges: { source: string; target: string }[],
): T[] {
  const depth = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  // Longest-path layering; bounded iterations keep cycles from looping forever.
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const edge of edges) {
      const next = (depth.get(edge.source) ?? 0) + 1;
      if (depth.has(edge.target) && next > (depth.get(edge.target) ?? 0)) {
        depth.set(edge.target, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const layers = new Map<number, T[]>();
  nodes.forEach((node) => {
    const level = depth.get(node.id) ?? 0;
    layers.set(level, [...(layers.get(level) ?? []), node]);
  });

  const spacing = NODE_WIDTH + 36;
  return nodes.map((node) => {
    const level = depth.get(node.id) ?? 0;
    const layer = layers.get(level) ?? [node];
    const index = layer.indexOf(node);
    return {
      ...node,
      position: {
        x: (index - (layer.length - 1) / 2) * spacing - NODE_WIDTH / 2,
        y: level * 140,
      },
    };
  });
}

/** Plausible log lines for the simulated test run. */
export function mockNodeOutput(data: WorkflowNodeData, input: string) {
  const short = input.length > 48 ? `${input.slice(0, 48)}…` : input;
  switch (data.kind) {
    case "input":
      return `Received input: "${short}"`;
    case "llm":
      return `${modelName(String(data.config.model ?? ""))} planned 3 sub-tasks and selected tools`;
    case "agent":
      return `${data.label} completed its task with 3 tool calls`;
    case "condition":
      return `Condition "${data.config.expression}" evaluated to true → following Yes branch`;
    case "transform":
      return `Condensed findings into ${data.config.maxWords ?? 200} words with citations`;
    case "output":
      return `Returned ${String(data.config.format ?? "Markdown").toLowerCase()} response to the user`;
    case "tool":
      switch (data.toolId) {
        case "web-search":
          return `Found ${data.config.maxResults ?? 8} results for "${short}"`;
        case "web-scraping":
          return "Scraped 5 pages (12.4 KB of text)";
        case "api-request":
          return `${data.config.method ?? "GET"} ${data.config.url || "endpoint"} → 200 OK (142 ms)`;
        case "database-query":
          return `Query returned 24 rows from ${data.config.connection ?? "database"}`;
        case "code-execution":
          return `Executed ${data.config.language ?? "Python"} script in 0.4 s — exit code 0`;
        case "file-processing":
          return "Parsed 3 files (41 pages)";
        case "send-email":
          return data.config.requireApproval ? "Email drafted and queued for approval" : "Email sent";
        case "slack":
          return `Message posted to ${data.config.channel ?? "#general"}`;
        case "github":
          return `${data.config.action ?? "Fetched data"} on ${data.config.repository ?? "repository"} — 6 items`;
        case "notion":
          return "Read 4 pages from Notion";
        case "calculator":
          return "Computed 3 expressions";
        default:
          return `${toolsById.get(data.toolId ?? "")?.name ?? data.label} responded with 200 OK`;
      }
  }
}

export function mockFinalOutput(agentName: string, input: string, toolNames: string[]) {
  const sources = toolNames.length ? toolNames.join(", ") : "the model's own knowledge";
  return [
    `## ${agentName} — result`,
    "",
    `**Request:** ${input}`,
    "",
    "### Key findings",
    "1. Agent frameworks are converging on graph-based orchestration with explicit tool calling.",
    "2. Teams prioritise observability: run traces, token usage and replayable test runs.",
    "3. Human-in-the-loop approval is now standard for actions with side effects.",
    "",
    `_Sources used: ${sources}. This is simulated output — no real model was called._`,
  ].join("\n");
}
