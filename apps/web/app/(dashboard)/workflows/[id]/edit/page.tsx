import { EditWorkflowPage } from "@/components/workflows/WorkflowPages";

export const metadata = { title: "Edit workflow" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditWorkflowPage id={id} />;
}
