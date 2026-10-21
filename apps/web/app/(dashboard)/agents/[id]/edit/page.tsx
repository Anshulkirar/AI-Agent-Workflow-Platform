import { EditAgent } from "@/components/agents/wizard/EditAgent";
import { isStepId } from "@/components/agents/wizard/wizard-config";

export const metadata = { title: "Edit agent" };

export default async function EditAgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const [{ id }, { step }] = await Promise.all([params, searchParams]);
  return <EditAgent id={id} initialStep={isStepId(step) ? step : undefined} />;
}
