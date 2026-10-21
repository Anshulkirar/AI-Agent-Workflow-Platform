import { RunDetailsPage } from "@/components/runs/RunDetails";
import { isRunTab } from "@/components/runs/run-tabs";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Run ${id}` };
}

export default async function RunPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  return <RunDetailsPage id={id} initialTab={isRunTab(tab) ? tab : undefined} />;
}
