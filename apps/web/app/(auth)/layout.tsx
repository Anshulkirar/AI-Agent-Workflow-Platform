import type { ReactNode } from "react";
import { AuthShowcase } from "@/components/auth/AuthShowcase";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
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
          Demo experience — no real authentication or data is stored.
        </p>
      </div>

      <AuthShowcase />
    </div>
  );
}
