import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden px-4 py-6 sm:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-130 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl"
      />
      <header className="flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center text-center animate-fade-up">
        <p className="bg-linear-to-br from-primary to-sky-500 bg-clip-text text-7xl font-extrabold tracking-tight text-transparent sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          This page isn&apos;t here yet
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          It may have moved, or it&apos;s still on the roadmap. Head back and
          keep building.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            <ArrowLeft size={16} />
            Back home
          </Link>
          <Link href="/dashboard" className={buttonVariants()}>
            <LayoutDashboard size={16} />
            Go to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
