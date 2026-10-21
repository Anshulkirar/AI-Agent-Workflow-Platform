import { RunsList } from "@/components/runs/RunsList";

export const metadata = { title: "Runs" };

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const { source } = await searchParams;
  return <RunsList initialSource={source} />;
}
