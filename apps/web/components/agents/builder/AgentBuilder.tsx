"use client";

import { useMemo, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useHydrated } from "@/components/ui/use-hydrated";
import { agentNodeTemplates } from "@/lib/agents/catalog";
import { agentStore, useAgent, useAgents } from "@/lib/agents/store";
import type { Agent } from "@/lib/agents/types";
import { createDefaultWorkflow } from "@/lib/agents/workflow";
import { AgentNotFound, AgentPageSkeleton } from "../AgentNotFound";
import { AgentAvatar, AgentStatusBadge } from "../AgentVisuals";
import { WorkflowBuilder } from "./WorkflowBuilder";

export function AgentBuilderPage({ id }: { id: string }) {
  const hydrated = useHydrated();
  const agent = useAgent(id);

  if (!hydrated) return <AgentPageSkeleton />;
  if (!agent) return <AgentNotFound />;

  return (
    <ReactFlowProvider>
      <AgentBuilder key={agent.id} agent={agent} />
    </ReactFlowProvider>
  );
}

function AgentBuilder({ agent }: { agent: Agent }) {
  const agents = useAgents();
  // Other agents can be called as sub-agents.
  const subAgents = useMemo(
    () => agentNodeTemplates(agents.filter((item) => item.id !== agent.id && item.status !== "archived")),
    [agents, agent.id],
  );
  // Read once on mount so later store updates (e.g. run counts) don't reset the canvas.
  const [initialGraph] = useState(() => agent.workflow ?? createDefaultWorkflow(agent));

  return (
    <WorkflowBuilder
      title={agent.name}
      avatar={<AgentAvatar icon={agent.icon} color={agent.color} />}
      badge={<AgentStatusBadge status={agent.status} className="max-sm:hidden" />}
      breadcrumbs={[
        { label: "Agents", href: "/agents" },
        { label: agent.name, href: `/agents/${agent.id}/edit` },
        { label: "Builder" },
      ]}
      tabs={[
        { label: "Builder", href: null },
        { label: "Instructions", href: `/agents/${agent.id}/edit?step=instructions` },
        { label: "Tools", href: `/agents/${agent.id}/edit?step=tools` },
        { label: "Knowledge", href: `/agents/${agent.id}/edit?step=knowledge` },
        { label: "Settings", href: `/agents/${agent.id}/edit?step=model` },
        { label: "Runs", href: `/runs?source=${agent.id}` },
      ]}
      initialGraph={initialGraph}
      initialSettings={agent.settings}
      savedAt={agent.workflow ? agent.updatedAt : null}
      instructions={agent.instructions}
      advancedSettingsHref={`/agents/${agent.id}/edit?step=model`}
      runSource={{ type: "agent", id: agent.id, name: agent.name }}
      extraTemplates={subAgents}
      onSave={(graph, settings) => {
        const tools = [
          ...new Set(graph.nodes.flatMap((node) => (node.data.kind === "tool" && node.data.toolId ? [node.data.toolId] : []))),
        ];
        agentStore.update(agent.id, { workflow: graph, settings, tools });
      }}
      onRunComplete={(run) => agentStore.recordRun(agent.id, run.status === "success")}
    />
  );
}
