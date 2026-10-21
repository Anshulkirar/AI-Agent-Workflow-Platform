"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { ArrowLeft, Workflow as WorkflowIcon } from "lucide-react";
import { AgentPageSkeleton } from "@/components/agents/AgentNotFound";
import { AgentAvatar } from "@/components/agents/AgentVisuals";
import { WorkflowBuilder } from "@/components/agents/builder/WorkflowBuilder";
import { buttonVariants } from "@/components/ui/button";
import { useHydrated } from "@/components/ui/use-hydrated";
import { agentNodeTemplates } from "@/lib/agents/catalog";
import { useAgents } from "@/lib/agents/store";
import { useWorkflow, workflowStore } from "@/lib/workflows/store";
import type { WorkflowRecord } from "@/lib/workflows/types";
import { toWorkflowInput } from "@/lib/workflows/catalog";
import { WorkflowForm } from "./WorkflowForm";
import { WorkflowStatusBadge } from "./WorkflowVisuals";

function WorkflowNotFound() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-20 text-center animate-fade-in">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <WorkflowIcon size={26} />
      </span>
      <h1 className="mt-4 text-lg font-semibold">Workflow not found</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">It may have been deleted, or the link is incorrect.</p>
      <Link href="/workflows" className={buttonVariants({ variant: "secondary", className: "mt-6" })}>
        <ArrowLeft size={16} />
        Back to workflows
      </Link>
    </div>
  );
}

/** Waits for client data (workflows can live in localStorage) before rendering. */
function useLoadedWorkflow(id: string) {
  const hydrated = useHydrated();
  const workflow = useWorkflow(id);
  return { hydrated, workflow };
}

export function EditWorkflowPage({ id }: { id: string }) {
  const { hydrated, workflow } = useLoadedWorkflow(id);
  if (!hydrated) return <AgentPageSkeleton />;
  if (!workflow) return <WorkflowNotFound />;
  return <WorkflowForm key={workflow.id} mode="edit" workflowId={workflow.id} initial={toWorkflowInput(workflow)} />;
}

export function WorkflowBuilderPage({ id }: { id: string }) {
  const { hydrated, workflow } = useLoadedWorkflow(id);
  if (!hydrated) return <AgentPageSkeleton />;
  if (!workflow) return <WorkflowNotFound />;
  return (
    <ReactFlowProvider>
      <WorkflowCanvas key={workflow.id} workflow={workflow} />
    </ReactFlowProvider>
  );
}

function WorkflowCanvas({ workflow }: { workflow: WorkflowRecord }) {
  const agents = useAgents();
  const agentTemplates = useMemo(() => agentNodeTemplates(agents.filter((agent) => agent.status !== "archived")), [agents]);
  // Read once on mount so later store updates (e.g. run counts) don't reset the canvas.
  const [initialGraph] = useState(workflow.graph);

  return (
    <WorkflowBuilder
      title={workflow.name}
      avatar={<AgentAvatar icon={workflow.icon} color={workflow.color} />}
      badge={<WorkflowStatusBadge status={workflow.status} className="max-sm:hidden" />}
      breadcrumbs={[
        { label: "Workflows", href: "/workflows" },
        { label: workflow.name, href: `/workflows/${workflow.id}/edit` },
        { label: "Builder" },
      ]}
      tabs={[
        { label: "Builder", href: null },
        { label: "Details", href: `/workflows/${workflow.id}/edit` },
        { label: "Runs", href: `/runs?source=${workflow.id}` },
      ]}
      initialGraph={initialGraph}
      initialSettings={workflow.settings}
      savedAt={workflow.updatedAt}
      advancedSettingsHref={`/workflows/${workflow.id}/edit`}
      runSource={{ type: "workflow", id: workflow.id, name: workflow.name }}
      settingsTitle="Workflow Settings"
      extraTemplates={agentTemplates}
      onSave={(graph, settings) => workflowStore.saveGraph(workflow.id, graph, settings)}
      onRunComplete={(run) => workflowStore.recordRun(workflow.id, run.status === "success", run.durationMs)}
    />
  );
}
