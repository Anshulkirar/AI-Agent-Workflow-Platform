import { AgentWizard } from "@/components/agents/wizard/AgentWizard";
import { emptyDraft } from "@/components/agents/wizard/wizard-config";

export const metadata = { title: "Create agent" };

export default function NewAgentPage() {
  return <AgentWizard mode="create" initial={emptyDraft} />;
}
