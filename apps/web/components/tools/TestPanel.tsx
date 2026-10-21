"use client";

import { CircleCheck, CircleDashed, CircleX, LoaderCircle, Timer } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TestResult, TestStep } from "@/lib/tools/connection";

/** Live view of a simulated connection test. */
export function TestPanel({ steps, result, running }: { steps: TestStep[]; result: TestResult | null; running: boolean }) {
  const started = running || result !== null;

  return (
    <div aria-live="polite" className="space-y-4">
      <ol className="grid gap-2 sm:grid-cols-2">
        {steps.map((step) => (
          <li
            key={step.label}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors",
              step.status === "failed" ? "border-danger/40 bg-danger-soft" : step.status === "success" ? "border-success/30" : "border-border",
              !started && "opacity-60",
            )}
          >
            {step.status === "success" ? (
              <CircleCheck size={16} className="shrink-0 text-success" aria-label="Passed" />
            ) : step.status === "failed" ? (
              <CircleX size={16} className="shrink-0 text-danger" aria-label="Failed" />
            ) : step.status === "running" ? (
              <LoaderCircle size={16} className="shrink-0 animate-spin text-primary" aria-label="Running" />
            ) : (
              <CircleDashed size={16} className="shrink-0 text-subtle-foreground" aria-label="Pending" />
            )}
            <span className={cn("font-medium", step.status === "pending" && "text-muted-foreground")}>{step.label}</span>
          </li>
        ))}
      </ol>

      {result && (
        <div
          role={result.ok ? "status" : "alert"}
          className={cn(
            "rounded-xl border p-4 animate-fade-in",
            result.ok ? "border-success/30 bg-success-soft" : "border-danger/30 bg-danger-soft",
          )}
        >
          <p className={cn("flex items-center gap-2 text-sm font-semibold", result.ok ? "text-success" : "text-danger")}>
            {result.ok ? <CircleCheck size={16} /> : <CircleX size={16} />}
            {result.ok ? "Connection successful" : "Connection failed"}
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Timer size={12} />
              {result.latencyMs >= 1000 ? `${(result.latencyMs / 1000).toFixed(1)} s` : `${result.latencyMs} ms`}
            </span>
          </p>
          <p className="mt-1.5 text-sm text-foreground/80">{result.message}</p>
          {result.sample && (
            <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-border bg-card p-3 font-mono text-xs leading-5">{result.sample}</pre>
          )}
        </div>
      )}
    </div>
  );
}
