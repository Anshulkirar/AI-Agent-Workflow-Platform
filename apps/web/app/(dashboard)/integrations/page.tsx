import { IntegrationsPage } from "@/components/integrations/IntegrationsPage";

export const metadata = { title: "Integrations" };

export default async function Page({ searchParams }: { searchParams: Promise<{ connect?: string; category?: string }> }) {
  const { connect, category } = await searchParams;
  return <IntegrationsPage initialOpen={connect} initialCategory={category} />;
}
