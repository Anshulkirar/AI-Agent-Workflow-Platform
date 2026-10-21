"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { models } from "@/lib/agents/catalog";
import { useAgents } from "@/lib/agents/store";
import type { Agent } from "@/lib/agents/types";
import { cn } from "@/lib/cn";
import type { IntegrationDefinition } from "@/lib/integrations/catalog";
import { integrationStore } from "@/lib/integrations/store";
import type { IntegrationConnection } from "@/lib/integrations/types";
import { toast } from "@/lib/toast";
import { statusMeta } from "@/lib/tools/catalog";
import type { WorkflowRecord } from "@/lib/workflows/types";
import { useWorkflows } from "@/lib/workflows/store";

const providerOf = (modelId: string) => models.find((model) => model.id === modelId)?.provider;

/** Whether an agent or workflow relies on an integration (through a tool or its model). */
export function dependsOn(definition: IntegrationDefinition, item: { toolIds: string[]; model: string }) {
  return (
    item.toolIds.some((id) => definition.toolIds.includes(id)) ||
    (definition.modelProvider !== undefined && providerOf(item.model) === definition.modelProvider)
  );
}

const agentDeps = (agent: Agent) => ({ toolIds: agent.tools, model: agent.settings.model });
const workflowDeps = (workflow: WorkflowRecord) => ({
  toolIds: workflow.graph.nodes.flatMap((node) => (node.data.toolId ? [node.data.toolId] : [])),
  model: workflow.settings.model,
});

/** Agents and workflows that would be affected if this integration stopped working. */
export function useIntegrationUsage(definition: IntegrationDefinition | undefined) {
  const agents = useAgents();
  const workflows = useWorkflows();
  if (!definition) return { agents: [], workflows: [] };
  return {
    agents: agents.filter((agent) => agent.status !== "archived" && dependsOn(definition, agentDeps(agent))),
    workflows: workflows.filter((workflow) => workflow.status !== "archived" && dependsOn(definition, workflowDeps(workflow))),
  };
}

/** Tool ids used by live agents and workflows — drives "Recommended" integrations. */
export function useToolDemand() {
  const agents = useAgents().filter((agent) => agent.status !== "archived");
  const workflows = useWorkflows().filter((workflow) => workflow.status !== "archived");
  const demand = new Map<string, number>();
  for (const deps of [...agents.map(agentDeps), ...workflows.map(workflowDeps)]) {
    for (const id of new Set(deps.toolIds)) demand.set(id, (demand.get(id) ?? 0) + 1);
  }
  return demand;
}

export function IntegrationStatusBadge({ connection, className }: { connection?: IntegrationConnection; className?: string }) {
  if (!connection) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground", className)}>
        <span className="size-1.5 rounded-full bg-subtle-foreground" />
        Not connected
      </span>
    );
  }
  const meta = statusMeta[connection.status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold", meta.badge, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

/** Disconnect with a dependency warning and an undo toast. */
export function useDisconnect() {
  const [pending, setPending] = useState<IntegrationDefinition | null>(null);
  const [open, setOpen] = useState(false);
  const usage = useIntegrationUsage(pending ?? undefined);

  const request = (definition: IntegrationDefinition) => {
    setPending(definition);
    setOpen(true);
  };

  const affected = usage.agents.length + usage.workflows.length;

  const dialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title={`Disconnect ${pending?.name ?? "integration"}?`}
      description={
        <>
          Saved credentials and granted permissions for {pending?.name} will be removed from this workspace.
          {affected > 0 && (
            <span className="mt-2 block font-medium text-danger">
              {usage.agents.length} agent{usage.agents.length === 1 ? "" : "s"} and {usage.workflows.length} workflow
              {usage.workflows.length === 1 ? "" : "s"} rely on it — their runs will fail until you reconnect.
            </span>
          )}
        </>
      }
      confirmLabel="Disconnect"
      onConfirm={() => {
        if (!pending) return;
        const removed = integrationStore.remove(pending.id);
        if (!removed) return;
        toast({
          tone: "info",
          title: `${pending.name} disconnected`,
          description: "Credentials were removed from this browser.",
          action: { label: "Undo", onClick: () => integrationStore.restore(removed.item, removed.index) },
        });
      }}
    />
  );

  return { request, dialog };
}
