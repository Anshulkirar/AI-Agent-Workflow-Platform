"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/dashboard/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { MarkdownLite } from "@/components/ui/MarkdownLite";
import { cn } from "@/lib/cn";
import type { Run } from "@/lib/runs/types";

type View = "preview" | "markdown" | "json";

/** The run as an API would return it (logs omitted for brevity). */
function toPayload(run: Run) {
  return JSON.stringify(
    {
      id: run.id,
      status: run.status,
      source: run.source,
      trigger: run.trigger,
      model: run.model,
      input: run.input,
      output: run.output,
      error: run.error ?? null,
      started_at: run.startedAt,
      completed_at: run.completedAt,
      duration_ms: run.durationMs,
      usage: { prompt_tokens: run.promptTokens, completion_tokens: run.completionTokens },
      steps: run.steps.map(({ id, name, kind, status, durationMs, tokens }) => ({ id, name, kind, status, duration_ms: durationMs, tokens })),
    },
    null,
    2,
  );
}

export function RunInputOutput({ run }: { run: Run }) {
  const [view, setView] = useState<View>("preview");
  const payload = toPayload(run);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
      <Card className="h-fit">
        <CardHeader title="Input" subtitle="Prompt sent to the agent" action={<CopyButton value={run.input} label="Copy input" />} />
        <p className="whitespace-pre-wrap rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm leading-6">{run.input}</p>
      </Card>

      <Card>
        <CardHeader
          title="Output"
          subtitle={run.output ? `${run.output.split(/\s+/).length} words` : undefined}
          action={
            <div className="flex items-center gap-2">
              <div role="radiogroup" aria-label="Output view" className="flex rounded-lg border border-border bg-muted p-0.5">
                {(["preview", "markdown", "json"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={view === item}
                    onClick={() => setView(item)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition-all",
                      view === item ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item === "json" ? "JSON" : item}
                  </button>
                ))}
              </div>
              <CopyButton value={view === "json" ? payload : (run.output ?? "")} label="Copy" />
            </div>
          }
        />
        {view === "json" ? (
          <pre className="max-h-[560px] overflow-auto rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs leading-5">{payload}</pre>
        ) : !run.output ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            {run.status === "running" ? "Output will appear when the run finishes." : "This run produced no output."}
          </p>
        ) : view === "markdown" ? (
          <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs leading-5">
            {run.output}
          </pre>
        ) : (
          <div className="rounded-xl border border-border bg-muted/40 px-5 py-4 text-sm leading-7">
            <MarkdownLite source={run.output} />
          </div>
        )}
      </Card>
    </div>
  );
}
