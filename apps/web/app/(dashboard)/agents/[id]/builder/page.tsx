import { AgentBuilderPage } from "@/components/agents/builder/AgentBuilder";

export const metadata = { title: "Agent builder" };

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgentBuilderPage id={id} />;
}
