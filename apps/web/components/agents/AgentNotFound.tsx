import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function AgentNotFound() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-20 text-center animate-fade-in">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Bot size={26} />
      </span>
      <h1 className="mt-4 text-lg font-semibold">Agent not found</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        It may have been deleted, or the link is incorrect.
      </p>
      <Link href="/agents" className={buttonVariants({ variant: "secondary", className: "mt-6" })}>
        <ArrowLeft size={16} />
        Back to agents
      </Link>
    </div>
  );
}

/** Placeholder while client-side agent data loads. */
export function AgentPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading agent" className="space-y-6">
      <div className="space-y-3">
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
        <div className="h-7 w-64 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-[480px] animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
