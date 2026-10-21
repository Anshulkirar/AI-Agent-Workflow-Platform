import { WorkflowForm } from "@/components/workflows/WorkflowForm";
import { emptyWorkflow } from "@/lib/workflows/catalog";

export const metadata = { title: "Create workflow" };

export default function NewWorkflowPage() {
  return <WorkflowForm mode="create" initial={emptyWorkflow} />;
}
