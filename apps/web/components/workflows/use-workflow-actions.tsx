"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, Archive, ArchiveRestore, Copy, Pause, Pencil, Play, Rocket, Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { MenuItem } from "@/components/ui/DropdownMenu";
import { planExecution } from "@/lib/agents/workflow";
import { formatDuration } from "@/lib/runs/format";
import { recordSourceRun } from "@/lib/runs/record";
import { startSimulatedRun, templatesFromGraph } from "@/lib/runs/simulator";
import { toast } from "@/lib/toast";
import { workflowStatusMeta } from "@/lib/workflows/catalog";
import { workflowStore } from "@/lib/workflows/store";
import type { WorkflowRecord, WorkflowStatus } from "@/lib/workflows/types";

/** Shared CRUD, status and run actions for workflow rows, cards and pages. */
export function useWorkflowActions() {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<WorkflowRecord[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canRun = (workflow: WorkflowRecord) => workflow.status === "active" || workflow.status === "paused";

  const runNow = (workflow: WorkflowRecord) => {
    const plan = planExecution(workflow.graph.nodes, workflow.graph.edges);
    if (plan.errors.length) {
      toast({
        tone: "error",
        title: `${workflow.name} can't run yet`,
        description: plan.errors[0],
        action: { label: "Fix in builder", onClick: () => router.push(`/workflows/${workflow.id}/builder`) },
      });
      return;
    }
    const inputNode = workflow.graph.nodes.find((node) => node.data.kind === "input");
    const input = String(inputNode?.data.config.sampleInput ?? "") || `Run ${workflow.name}`;
    const { templates, output } = templatesFromGraph(workflow.graph, input);
    const id = startSimulatedRun({
      source: { type: "workflow", id: workflow.id, name: workflow.name },
      input,
      model: workflow.settings.model,
      trigger: "manual",
      templates,
      output: output(workflow.name),
      onFinish: (run) => {
        recordSourceRun(run);
        toast({
          title: `${workflow.name} finished`,
          description: `${run.id} succeeded in ${formatDuration(run.durationMs)}.`,
          action: { label: "View", onClick: () => router.push(`/runs/${run.id}`) },
        });
      },
    });
    toast({
      tone: "info",
      title: `${workflow.name} started`,
      description: `Run ${id} is in progress.`,
      action: { label: "View run", onClick: () => router.push(`/runs/${id}`) },
    });
  };

  const setStatus = (workflows: WorkflowRecord[], status: WorkflowStatus) => {
    const previous = workflows.map((workflow) => [workflow.id, workflow.status] as const);
    workflowStore.updateMany(workflows.map((workflow) => workflow.id), { status });
    toast({
      tone: "info",
      title:
        workflows.length === 1
          ? `${workflows[0]!.name} is now ${workflowStatusMeta[status].label.toLowerCase()}`
          : `${workflows.length} workflows set to ${workflowStatusMeta[status].label.toLowerCase()}`,
      action: {
        label: "Undo",
        onClick: () => previous.forEach(([id, value]) => workflowStore.update(id, { status: value })),
      },
    });
  };

  const requestDelete = (workflows: WorkflowRecord[]) => {
    setPendingDelete(workflows);
    setDeleteOpen(true);
  };

  const menuItems = (workflow: WorkflowRecord): MenuItem[] => [
    { label: "Open builder", icon: WorkflowIcon, onSelect: () => router.push(`/workflows/${workflow.id}/builder`) },
    { label: "Edit details", icon: Pencil, onSelect: () => router.push(`/workflows/${workflow.id}/edit`) },
    { label: "Run now", icon: Play, disabled: !canRun(workflow), onSelect: () => runNow(workflow) },
    { label: "View runs", icon: Activity, onSelect: () => router.push(`/runs?source=${workflow.id}`) },
    {
      label: "Duplicate",
      icon: Copy,
      onSelect: () => {
        const copy = workflowStore.duplicate(workflow.id);
        if (copy) toast({ title: "Workflow duplicated", description: `“${copy.name}” was saved as a draft.` });
      },
    },
    "separator",
    ...(workflow.status === "active"
      ? [{ label: "Pause", icon: Pause, onSelect: () => setStatus([workflow], "paused") }]
      : workflow.status === "archived"
        ? []
        : [{ label: workflow.status === "draft" ? "Publish" : "Activate", icon: Rocket, onSelect: () => setStatus([workflow], "active") }]),
    workflow.status === "archived"
      ? { label: "Restore", icon: ArchiveRestore, onSelect: () => setStatus([workflow], "paused") }
      : { label: "Archive", icon: Archive, onSelect: () => setStatus([workflow], "archived") },
    { label: "Delete", icon: Trash2, danger: true, onSelect: () => requestDelete([workflow]) },
  ];

  const dialog = (
    <ConfirmDialog
      open={deleteOpen}
      onOpenChange={setDeleteOpen}
      title={
        pendingDelete.length === 1
          ? `Delete “${pendingDelete[0]!.name}”?`
          : `Delete ${pendingDelete.length} workflows?`
      }
      description="Their graphs and settings will be removed. Past runs stay in your run history. You can undo right after."
      confirmLabel="Delete"
      onConfirm={() => {
        const removed = workflowStore.removeMany(pendingDelete.map((workflow) => workflow.id));
        toast({
          title: removed.length === 1 ? "Workflow deleted" : `${removed.length} workflows deleted`,
          action: { label: "Undo", onClick: () => workflowStore.restoreMany(removed) },
        });
      }}
    />
  );

  return { menuItems, runNow, canRun, setStatus, requestDelete, dialog };
}
