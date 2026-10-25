import { HelpCenter } from "@/components/help/HelpCenter";

export const metadata = { title: "Help & Docs" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <HelpCenter initialQuery={q} />;
}
