"use client";

import { Gauge, Layers, Timer, Wrench, Zap } from "lucide-react";
import { Card, CardHeader } from "@/components/dashboard/Card";
import { formatDuration } from "@/lib/runs/format";
import { useRuns } from "@/lib/runs/store";
import type { Run } from "@/lib/runs/types";
import { BarList, RecentRunsComparison, TokenSplit } from "./RunCharts";

export function RunMetrics({ run, elapsedMs }: { run: Run; elapsedMs: number }) {
  const runs = useRuns();
  const running = run.status === "running";
  const duration = running ? elapsedMs : run.durationMs;
  const tokens = run.steps.reduce((sum, step) => sum + step.tokens, 0);
  const executed = run.steps.filter((step) => step.status === "success" || step.status === "failed");
  const toolCalls = run.steps.filter((step) => step.kind === "tool" && step.status !== "pending" && step.status !== "skipped").length;
  const slowest = [...executed].sort((a, b) => b.durationMs - a.durationMs)[0];
  // Chronological, oldest first, last 12 runs of the same source.
  const history = runs
    .filter((item) => item.source.id === run.source.id && item.status !== "running")
    .slice(0, 12)
    .reverse();

  const tiles = [
    { icon: Timer, label: "Total duration", value: formatDuration(duration) },
    { icon: Zap, label: "Throughput", value: `${duration ? Math.round(tokens / (duration / 1000)).toLocaleString("en-US") : 0} tok/s` },
    { icon: Layers, label: "Steps executed", value: `${executed.length} / ${run.steps.length}` },
    { icon: Wrench, label: "Tool calls", value: String(toolCalls) },
    { icon: Gauge, label: "Slowest step", value: slowest ? slowest.name : "—", hint: slowest ? formatDuration(slowest.durationMs) : undefined },
  ];

  return (
    <div className="space-y-6">
      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/[0.02]">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Icon size={13} />
              {label}
            </p>
            <p className="mt-2 truncate text-lg font-bold tabular-nums tracking-tight" title={value}>
              {value}
            </p>
            {hint && <p className="text-[11px] text-subtle-foreground">{hint}</p>}
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Duration by step" subtitle="Where the time went" />
          <BarList
            label="Duration by step"
            format={formatDuration}
            items={executed.map((step) => ({ id: step.id, label: step.name, value: step.durationMs, failed: step.status === "failed" }))}
          />
        </Card>

        <Card>
          <CardHeader title="Token usage" subtitle={`${tokens.toLocaleString("en-US")} tokens in total`} />
          <TokenSplit
            prompt={running ? Math.round(tokens * 0.68) : run.promptTokens}
            completion={running ? tokens - Math.round(tokens * 0.68) : run.completionTokens}
          />
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">By step</p>
            <BarList
              label="Tokens by step"
              format={(value) => value.toLocaleString("en-US")}
              items={executed.map((step) => ({ id: step.id, label: step.name, value: step.tokens }))}
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={`Compared with recent runs of ${run.source.name}`} subtitle="Duration of the last runs, oldest to newest" />
        <RecentRunsComparison runs={history} currentId={run.id} />
      </Card>
    </div>
  );
}
