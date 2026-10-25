import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CurrentUserProvider } from "@/lib/auth/current-user";
import { getCurrentUser } from "@/lib/auth/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <CurrentUserProvider user={user}>
      <DashboardLayout>{children}</DashboardLayout>
    </CurrentUserProvider>
  );
}
