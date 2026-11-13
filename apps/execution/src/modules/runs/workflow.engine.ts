export type WorkflowGraph = {
  nodes: Array<{ id: string; data: { kind: string; label?: string; toolId?: string; config?: Record<string, unknown> } }>;
  edges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; label?: string }>;
};

export type ExecutionPlan = { layers: string[][]; predecessors: Map<string, string[]> };

export function createExecutionPlan(graph: WorkflowGraph): ExecutionPlan {
  const ids = new Set(graph.nodes.map((node) => node.id));
  if (ids.size !== graph.nodes.length) throw new Error("Workflow node ids must be unique.");
  const predecessors = new Map<string, string[]>(graph.nodes.map((node) => [node.id, []]));
  const successors = new Map<string, string[]>(graph.nodes.map((node) => [node.id, []]));
  for (const edge of graph.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) throw new Error("Workflow edge references an unknown node.");
    predecessors.get(edge.target)?.push(edge.source);
    successors.get(edge.source)?.push(edge.target);
  }

  const remaining = new Set(ids);
  const completed = new Set<string>();
  const layers: string[][] = [];
  while (remaining.size) {
    const layer = [...remaining].filter((id) => (predecessors.get(id) ?? []).every((parent) => completed.has(parent)));
    if (!layer.length) throw new Error("Workflow dependency cycle detected.");
    layers.push(layer);
    for (const id of layer) {
      remaining.delete(id);
      completed.add(id);
    }
  }

  return { layers, predecessors };
}

export function edgeAllowsExecution(
  graph: WorkflowGraph,
  sourceId: string,
  sourceHandle: string | null | undefined,
  label: string | undefined,
  condition: boolean,
) {
  const handle = sourceHandle ?? label;
  if (!handle) return true;
  const normalized = handle.toLowerCase();
  if (normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "true_branch") return condition;
  if (normalized === "false" || normalized === "no" || normalized === "0" || normalized === "false_branch") return !condition;
  return true;
}
