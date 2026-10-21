import { WorkflowBuilderPage } from "@/components/workflows/WorkflowPages";

export const metadata = { title: "Workflow builder" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkflowBuilderPage id={id} />;
}
