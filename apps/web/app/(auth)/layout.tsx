import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AuthShowcase } from "@/components/auth/AuthShowcase";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { getCurrentUser } from "@/lib/auth/server";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  // Already signed in (verified, not just "has a cookie") → skip the forms.
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex flex-col overflow-hidden px-4 py-6 sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 -z-10 size-105 rounded-full bg-primary/10 blur-3xl"
        />
        <header className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px] animate-fade-up">{children}</div>
        </main>

        <p className="text-center text-xs text-subtle-foreground">
          Sign-in is secured by the AgentFlow server. Workspace data in this preview stays in your browser.
        </p>
      </div>

      <AuthShowcase />
    </div>
  );
}
