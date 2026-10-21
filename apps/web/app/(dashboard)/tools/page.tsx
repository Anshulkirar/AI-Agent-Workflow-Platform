import { ToolsPage } from "@/components/tools/ToolsPage";

export const metadata = { title: "Tools" };

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <ToolsPage initialView={tab === "marketplace" ? "marketplace" : "installed"} />;
}
