"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, ArchiveRestore, Copy, Pencil, Trash2, Workflow } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { MenuItem } from "@/components/ui/DropdownMenu";
import { agentStore } from "@/lib/agents/store";
import type { Agent } from "@/lib/agents/types";
import { toast } from "@/lib/toast";

/** Shared CRUD actions for agent cards, rows and pages. */
export function useAgentActions() {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const toggleActive = (agent: Agent) => {
    const status = agent.status === "active" ? "inactive" : "active";
    agentStore.update(agent.id, { status });
    toast({
      tone: "info",
      title: status === "active" ? `${agent.name} is live` : `${agent.name} paused`,
      description: status === "active" ? "The agent will now accept runs." : "New runs are paused until you re-enable it.",
    });
  };

  const setArchived = (agent: Agent, archived: boolean) => {
    const previous = agent.status;
    agentStore.update(agent.id, { status: archived ? "archived" : "inactive" });
    toast({
      tone: "info",
      title: archived ? `${agent.name} archived` : `${agent.name} restored`,
      action: { label: "Undo", onClick: () => agentStore.update(agent.id, { status: previous }) },
    });
  };

  const requestDelete = (agent: Agent) => {
    setDeleteTarget(agent);
    setDeleteOpen(true);
  };

  const menuItems = (agent: Agent, options: { includeOpen?: boolean } = {}): MenuItem[] => [
    ...(options.includeOpen === false
      ? []
      : [{ label: "Open builder", icon: Workflow, onSelect: () => router.push(`/agents/${agent.id}/builder`) }]),
    { label: "Edit details", icon: Pencil, onSelect: () => router.push(`/agents/${agent.id}/edit`) },
    {
      label: "Duplicate",
      icon: Copy,
      onSelect: () => {
        const copy = agentStore.duplicate(agent.id);
        if (copy) toast({ title: "Agent duplicated", description: `“${copy.name}” was saved as a draft.` });
      },
    },
    agent.status === "archived"
      ? { label: "Restore", icon: ArchiveRestore, onSelect: () => setArchived(agent, false) }
      : { label: "Archive", icon: Archive, onSelect: () => setArchived(agent, true) },
    "separator",
    { label: "Delete", icon: Trash2, danger: true, onSelect: () => requestDelete(agent) },
  ];

  const dialog = (
    <ConfirmDialog
      open={deleteOpen}
      onOpenChange={setDeleteOpen}
      title={`Delete “${deleteTarget?.name ?? "agent"}”?`}
      description="This removes the agent, its workflow and settings. You can undo right after deleting."
      confirmLabel="Delete agent"
      onConfirm={() => {
        if (!deleteTarget) return;
        const removed = agentStore.remove(deleteTarget.id);
        if (!removed) return;
        toast({
          title: "Agent deleted",
          description: `“${removed.agent.name}” was removed.`,
          action: { label: "Undo", onClick: () => agentStore.restore(removed.agent, removed.index) },
        });
      }}
    />
  );

  return { menuItems, toggleActive, requestDelete, dialog };
}
