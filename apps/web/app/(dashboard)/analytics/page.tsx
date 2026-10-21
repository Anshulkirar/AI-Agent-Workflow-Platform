import { AnalyticsPage } from "@/components/analytics/AnalyticsPage";

export const metadata = { title: "Analytics" };

export default async function Page({ searchParams }: { searchParams: Promise<{ range?: string; source?: string }> }) {
  const { range, source } = await searchParams;
  return <AnalyticsPage initialRange={range} initialSource={source} />;
}
