import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { StoredEdge, StoredNode, Workflow, WorkflowNodeData } from "@/lib/agents/types";

export type AppNode = Node<WorkflowNodeData, "workflow">;
export type AppEdge = Edge;

export const DND_MIME = "application/agentflow-node";

/** Applied to every edge, including ones restored from storage. */
export const edgeDefaults = {
  type: "smoothstep",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color: "var(--subtle-foreground)",
  },
} satisfies Partial<Edge>;

export function toFlowNodes(workflow: Workflow): AppNode[] {
  return workflow.nodes.map((node) => ({
    id: node.id,
    type: "workflow",
    position: node.position,
    data: node.data,
  }));
}

export function toFlowEdges(workflow: Workflow): AppEdge[] {
  return workflow.edges.map((edge) => ({ ...edgeDefaults, ...edge }));
}

/** Strips React Flow runtime fields and transient run status. */
export function toWorkflow(nodes: AppNode[], edges: AppEdge[]): Workflow {
  return {
    nodes: nodes.map<StoredNode>(({ id, position, data }) => ({
      id,
      position: { x: Math.round(position.x), y: Math.round(position.y) },
      data: { kind: data.kind, label: data.label, toolId: data.toolId, config: data.config },
    })),
    edges: edges.map<StoredEdge>(({ id, source, target, sourceHandle, label }) => ({
      id,
      source,
      target,
      sourceHandle: sourceHandle ?? null,
      label: typeof label === "string" ? label : undefined,
    })),
  };
}
