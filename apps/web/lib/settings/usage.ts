import { useMemo } from "react";
import { useAgents } from "@/lib/agents/store";
import { ANALYTICS_END, dailyRows } from "@/lib/analytics/data";
import { useKnowledgeDocs } from "@/lib/knowledge/store";
import { useRuns } from "@/lib/runs/store";
import { plansById, type Plan } from "./plans";
import { useBilling, useMembers } from "./store";

/** Runs seeded into the demo end here; anything newer was started in this browser. */
const SAMPLE_DATA_END = `${ANALYTICS_END}T10:00:00.000Z`;
const PERIOD_START = `${ANALYTICS_END.slice(0, 7)}-01`;

const sampleMonth = (() => {
  const days = new Map<string, number>();
  let runs = 0;
  let tokens = 0;
  for (const row of dailyRows) {
    if (row.date < PERIOD_START || row.date > ANALYTICS_END) continue;
    runs += row.runs;
    tokens += row.promptTokens + row.completionTokens;
    days.set(row.date, (days.get(row.date) ?? 0) + row.runs);
  }
  return { runs, tokens, days: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)) };
})();

export type Meter = { used: number; limit: number | null };

/** Current billing-period usage measured against the workspace plan. */
export function useUsage() {
  const billing = useBilling();
  const runs = useRuns();
  const agents = useAgents();
  const members = useMembers();
  const docs = useKnowledgeDocs();
  const plan: Plan = plansById[billing.planId];

  return useMemo(() => {
    const liveRuns = runs.filter((run) => run.startedAt > SAMPLE_DATA_END);
    const liveTokens = liveRuns.reduce((sum, run) => sum + run.promptTokens + run.completionTokens, 0);
    const storageBytes = docs.reduce((sum, doc) => sum + doc.sizeBytes, 0);
    return {
      plan,
      periodStart: PERIOD_START,
      dailyRuns: sampleMonth.days,
      liveRuns: liveRuns.length,
      runs: { used: sampleMonth.runs + liveRuns.length, limit: plan.limits.runs } satisfies Meter,
      tokens: sampleMonth.tokens + liveTokens,
      agents: { used: agents.filter((agent) => agent.status !== "archived").length, limit: plan.limits.agents } satisfies Meter,
      seats: { used: members.length, limit: plan.limits.seats } satisfies Meter,
      storage: { used: storageBytes / 1024 ** 3, limit: plan.limits.storageGb } satisfies Meter,
    };
  }, [plan, runs, agents, members, docs]);
}

export function meterPercent(meter: Meter) {
  if (meter.limit === null) return 0;
  return Math.min(100, (meter.used / Math.max(meter.limit, 1)) * 100);
}
