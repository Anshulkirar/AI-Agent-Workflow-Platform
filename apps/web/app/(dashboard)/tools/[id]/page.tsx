import { ToolDetailPage } from "@/components/tools/ToolDetail";

export const metadata = { title: "Tool" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ToolDetailPage id={id} />;
}
