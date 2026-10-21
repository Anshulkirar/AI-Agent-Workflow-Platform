import { KnowledgePage } from "@/components/knowledge/KnowledgePage";

export const metadata = { title: "Knowledge" };

export default async function Page({ searchParams }: { searchParams: Promise<{ collection?: string }> }) {
  const { collection } = await searchParams;
  return <KnowledgePage initialCollection={collection} />;
}
