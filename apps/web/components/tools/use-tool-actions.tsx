"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAgents } from "@/lib/agents/store";
import { toast } from "@/lib/toast";
import { resolveTool, type ResolvedTool } from "@/lib/tools/catalog";
import { toolStore } from "@/lib/tools/store";
import { useWorkflows } from "@/lib/workflows/store";

/** Who depends on a tool: agents that list it and workflows with a node for it. */
export function useToolUsage(toolId: string) {
  const agents = useAgents().filter((agent) => agent.tools.includes(toolId));
  const workflows = useWorkflows().filter((workflow) => workflow.graph.nodes.some((node) => node.data.toolId === toolId));
  return { agents, workflows };
}

/** Install, remove and enable/disable actions with confirmations and undo. */
export function useToolActions() {
  const router = useRouter();
  const allAgents = useAgents();
  const allWorkflows = useWorkflows();
  const [pendingRemove, setPendingRemove] = useState<ResolvedTool | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  const install = (id: string, options: { openAfter?: boolean } = {}) => {
    const installed = toolStore.install(id);
    const tool = resolveTool(id, installed);
    if (!tool) return;
    if (installed.status === "connected") {
      toast({ title: `${tool.name} installed`, description: "No setup needed — it's ready for your agents." });
    } else {
      toast({
        title: `${tool.name} installed`,
        description: "Add your credentials to finish connecting it.",
        action: options.openAfter ? undefined : { label: "Set up", onClick: () => router.push(`/tools/${id}`) },
      });
    }
    if (options.openAfter) router.push(`/tools/${id}`);
  };

  const setEnabled = (tool: ResolvedTool, enabled: boolean) => {
    toolStore.setEnabled(tool.id, enabled);
    toast({
      tone: "info",
      title: enabled ? `${tool.name} enabled` : `${tool.name} disabled`,
      description: enabled ? "Agents can call this tool again." : "Agents won't be able to call this tool until you re-enable it.",
    });
  };

  const requestRemove = (tool: ResolvedTool) => {
    setPendingRemove(tool);
    setRemoveOpen(true);
  };

  const dependents = pendingRemove
    ? {
        agents: allAgents.filter((agent) => agent.tools.includes(pendingRemove.id)).length,
        workflows: allWorkflows.filter((workflow) => workflow.graph.nodes.some((node) => node.data.toolId === pendingRemove.id)).length,
      }
    : { agents: 0, workflows: 0 };

  const verb = pendingRemove?.isCustom ? "Delete" : "Uninstall";

  const dialog = (
    <ConfirmDialog
      open={removeOpen}
      onOpenChange={setRemoveOpen}
      title={`${verb} ${pendingRemove?.name ?? "tool"}?`}
      description={
        <>
          {pendingRemove?.isCustom
            ? "The tool definition and its credentials will be deleted."
            : "Its saved credentials will be removed. You can reinstall it from the marketplace."}
          {(dependents.agents > 0 || dependents.workflows > 0) && (
            <span className="mt-2 block font-medium text-danger">
              Used by {dependents.agents} agent{dependents.agents === 1 ? "" : "s"} and {dependents.workflows} workflow
              {dependents.workflows === 1 ? "" : "s"} — their calls to it will fail.
            </span>
          )}
        </>
      }
      confirmLabel={verb}
      onConfirm={() => {
        if (!pendingRemove) return;
        const removed = toolStore.remove(pendingRemove.id);
        if (!removed) return;
        if (window.location.pathname !== "/tools") router.push("/tools");
        toast({
          title: `${pendingRemove.name} ${pendingRemove.isCustom ? "deleted" : "uninstalled"}`,
          action: { label: "Undo", onClick: () => toolStore.restore(removed.item, removed.index) },
        });
      }}
    />
  );

  return { install, setEnabled, requestRemove, dialog };
}
