"use client";

import { useHydrated } from "@/components/ui/use-hydrated";
import { useAgent } from "@/lib/agents/store";
import { AgentNotFound, AgentPageSkeleton } from "../AgentNotFound";
import { AgentWizard } from "./AgentWizard";
import { toDraft, type StepId } from "./wizard-config";

export function EditAgent({ id, initialStep }: { id: string; initialStep?: StepId }) {
  const hydrated = useHydrated();
  const agent = useAgent(id);

  // Agents can live in localStorage, so wait for the client before deciding.
  if (!hydrated) return <AgentPageSkeleton />;
  if (!agent) return <AgentNotFound />;

  return (
    <AgentWizard
      key={agent.id}
      mode="edit"
      agentId={agent.id}
      initial={toDraft(agent)}
      initialStep={initialStep}
    />
  );
}
