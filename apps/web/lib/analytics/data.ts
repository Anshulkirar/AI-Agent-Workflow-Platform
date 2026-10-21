import { models, toolsById } from "@/lib/agents/catalog";
import { profileFor } from "@/lib/runs/profiles";
import type { RunSourceType } from "@/lib/runs/types";

/*
 * Sample analytics history. Generated deterministically (no Math.random) so the
 * server and client render identical markup. Replace `dailyRows` with an API
 * call once a backend aggregates real runs.
 */

/** Last full day of data — matches the "now" used by the runs seed. */
export const ANALYTICS_END = "2026-10-18";
const HISTORY_DAYS = 180;
/** Custom ranges stay within the last 90 days so a previous period always exists. */
export const MAX_RANGE_DAYS = 90;

const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function dayLabel(date: string, withYear = false) {
  const value = new Date(`${date}T00:00:00Z`);
  return `${MONTHS[value.getUTCMonth()]} ${value.getUTCDate()}${withYear ? `, ${value.getUTCFullYear()}` : ""}`;
}

export const EARLIEST_DAY = addDays(ANALYTICS_END, -(MAX_RANGE_DAYS - 1));

/* --------------------------------------------------------------------------
 * Sources and pricing
 * ------------------------------------------------------------------------ */

export type FailureReason = "Timeout" | "Rate limited" | "Auth error" | "Model error" | "Tool error";
export const failureReasons: FailureReason[] = ["Timeout", "Rate limited", "Auth error", "Model error", "Tool error"];

type SourceSpec = {
  id: string;
  type: RunSourceType;
  name: string;
  model: string;
  /** Average runs per weekday at the end of the period. */
  volume: number;
  successRate: number;
  /** Share of today's volume the source had 180 days ago. */
  startShare: number;
  /** Failure mix, in the order of `failureReasons`. */
  failures: [number, number, number, number, number];
};

export const analyticsSources: SourceSpec[] = [
  { id: "research-agent", type: "agent", name: "Research Agent", model: "gpt-4o", volume: 11, successRate: 0.975, startShare: 0.55, failures: [3, 2, 0, 1, 4] },
  { id: "code-assistant", type: "agent", name: "Code Assistant", model: "claude-sonnet-5-5", volume: 9, successRate: 0.955, startShare: 0.4, failures: [4, 1, 1, 2, 2] },
  { id: "customer-support", type: "agent", name: "Customer Support", model: "claude-haiku-5-5", volume: 10, successRate: 0.985, startShare: 0.7, failures: [1, 2, 0, 3, 1] },
  { id: "content-generator", type: "agent", name: "Content Generator", model: "gpt-4o", volume: 6, successRate: 0.965, startShare: 0.6, failures: [2, 1, 0, 5, 1] },
  { id: "data-analyst", type: "agent", name: "Data Analyst", model: "gpt-4o", volume: 5, successRate: 0.92, startShare: 0.5, failures: [5, 0, 3, 1, 2] },
  { id: "email-assistant", type: "agent", name: "Email Assistant", model: "gpt-4o", volume: 4, successRate: 0.97, startShare: 0.8, failures: [1, 1, 2, 1, 1] },
  { id: "web-research", type: "agent", name: "Web Research", model: "gpt-4o", volume: 3, successRate: 0.94, startShare: 0.9, failures: [2, 4, 0, 0, 3] },
  { id: "meeting-summarizer", type: "agent", name: "Meeting Summarizer", model: "gpt-4o", volume: 2, successRate: 0.98, startShare: 0.3, failures: [1, 0, 0, 2, 1] },
  { id: "sql-copilot", type: "agent", name: "SQL Copilot", model: "gpt-4o-mini", volume: 2, successRate: 0.93, startShare: 0.2, failures: [3, 0, 3, 1, 1] },
  { id: "research-workflow", type: "workflow", name: "Research Workflow", model: "gpt-4o", volume: 4, successRate: 0.965, startShare: 0.6, failures: [2, 2, 0, 1, 3] },
  { id: "content-pipeline", type: "workflow", name: "Content Pipeline", model: "claude-sonnet-5-5", volume: 3, successRate: 0.955, startShare: 0.45, failures: [2, 1, 0, 3, 1] },
  { id: "data-analysis", type: "workflow", name: "Data Analysis", model: "gpt-4o", volume: 2, successRate: 0.93, startShare: 0.6, failures: [4, 0, 3, 0, 2] },
  { id: "support-workflow", type: "workflow", name: "Customer Support", model: "claude-haiku-5-5", volume: 3, successRate: 0.98, startShare: 0.5, failures: [1, 2, 0, 2, 1] },
  { id: "lead-generation", type: "workflow", name: "Lead Generation", model: "gpt-4o-mini", volume: 2, successRate: 0.9, startShare: 0.8, failures: [2, 5, 0, 0, 3] },
  { id: "email-automation", type: "workflow", name: "Email Automation", model: "gpt-4o", volume: 2, successRate: 0.975, startShare: 0.9, failures: [1, 1, 1, 1, 1] },
  { id: "weekly-digest", type: "workflow", name: "Weekly Digest", model: "gpt-4o", volume: 0.4, successRate: 0.99, startShare: 1, failures: [1, 0, 0, 1, 0] },
];

export const sourcesById = new Map(analyticsSources.map((source) => [source.id, source]));

/** Sample list prices in USD per 1M tokens (input / output), used for estimates only. */
export const modelPricing: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "claude-opus-5-5": { input: 15, output: 75 },
  "claude-sonnet-5-5": { input: 3, output: 15 },
  "claude-haiku-5-5": { input: 1, output: 5 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
};

/** Fixed color slot per model so a filter never repaints the survivors. */
export const modelColors: Record<string, string> = {
  "gpt-4o": "var(--chart-1)",
  "claude-sonnet-5-5": "var(--chart-2)",
  "claude-haiku-5-5": "var(--chart-3)",
  "gpt-4o-mini": "var(--chart-4)",
  "claude-opus-5-5": "var(--chart-5)",
  "gemini-2.5-pro": "var(--subtle-foreground)",
};

/* --------------------------------------------------------------------------
 * Daily rows
 * ------------------------------------------------------------------------ */

export type DailyRow = {
  date: string;
  sourceId: string;
  runs: number;
  success: number;
  failed: number;
  promptTokens: number;
  completionTokens: number;
  /** Sum of run durations, for averages. */
  latencyTotalMs: number;
  p95Ms: number;
  costUsd: number;
  failures: number[];
};

function noise(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Story beats: the warehouse password expired on Oct 17, and an OpenAI rate-limit spike on Sep 23. */
function incident(source: SourceSpec, date: string) {
  const warehouse = ["data-analyst", "data-analysis", "sql-copilot"].includes(source.id);
  if (warehouse && date >= "2026-10-17") return { extraFailure: 0.34, latency: 1.35, reason: 2 };
  if (source.model.startsWith("gpt-4o") && date === "2026-09-23") return { extraFailure: 0.12, latency: 1.6, reason: 1 };
  return null;
}

function buildRows(): DailyRow[] {
  const rows: DailyRow[] = [];
  const start = addDays(ANALYTICS_END, -(HISTORY_DAYS - 1));
  analyticsSources.forEach((source, sourceIndex) => {
    const profile = profileFor(source.id);
    const baseLatency = profile.steps.reduce((sum, step) => sum + step.seconds, 0) * 1000;
    const baseTokens = profile.steps.reduce((sum, step) => sum + step.tokens, 0);
    const price = modelPricing[source.model] ?? modelPricing["gpt-4o"]!;
    const failureTotal = source.failures.reduce((sum, value) => sum + value, 0) || 1;

    for (let day = 0; day < HISTORY_DAYS; day++) {
      const date = addDays(start, day);
      const seed = sourceIndex * 1000 + day;
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      const weekend = weekday === 0 || weekday === 6;
      const seasonal = weekend ? (source.type === "workflow" ? 0.8 : 0.45) : 1;
      const growth = source.startShare + (1 - source.startShare) * (day / (HISTORY_DAYS - 1));
      const expected = source.volume * seasonal * growth * (0.75 + noise(seed) * 0.5);
      const runs = Math.max(0, Math.round(expected + (noise(seed + 7) - 0.5)));
      const event = incident(source, date);
      const failRate = Math.min(0.9, (1 - source.successRate) * (0.4 + noise(seed + 13) * 1.2) + (event?.extraFailure ?? 0));
      const expectedFailures = runs * failRate;
      const failed = Math.min(runs, Math.floor(expectedFailures) + (noise(seed + 17) < expectedFailures % 1 ? 1 : 0));
      const latencyFactor = (0.82 + noise(seed + 23) * 0.36) * (event?.latency ?? 1);
      const avgLatency = baseLatency * latencyFactor;
      const tokensPerRun = baseTokens * (0.8 + noise(seed + 29) * 0.4);
      const promptTokens = Math.round(runs * tokensPerRun * 0.64);
      const completionTokens = Math.round(runs * tokensPerRun * 0.36);

      const failures = source.failures.map((weight) => (failed * weight) / failureTotal);
      if (event) {
        const moved = failures.reduce((sum, value) => sum + value, 0) * 0.7;
        for (let i = 0; i < failures.length; i++) failures[i] = failures[i]! * 0.3;
        failures[event.reason] = failures[event.reason]! + moved;
      }

      rows.push({
        date,
        sourceId: source.id,
        runs,
        success: runs - failed,
        failed,
        promptTokens,
        completionTokens,
        latencyTotalMs: Math.round(avgLatency * runs),
        p95Ms: Math.round(avgLatency * (1.55 + noise(seed + 31) * 0.5)),
        costUsd: (promptTokens * price.input + completionTokens * price.output) / 1_000_000,
        failures,
      });
    }
  });
  return rows;
}

export const dailyRows: DailyRow[] = buildRows();

/* --------------------------------------------------------------------------
 * Filtering and aggregation
 * ------------------------------------------------------------------------ */

export type Scope = "all" | RunSourceType;

export type AnalyticsFilters = {
  from: string;
  to: string;
  scope: Scope;
  model: string;
  source: string;
};

export function previousRange(from: string, to: string) {
  const length = daysBetween(from, to) + 1;
  return { from: addDays(from, -length), to: addDays(from, -1) };
}

export function filterRows(filters: AnalyticsFilters, range: { from: string; to: string } = filters) {
  return dailyRows.filter((row) => {
    if (row.date < range.from || row.date > range.to) return false;
    const source = sourcesById.get(row.sourceId)!;
    if (filters.scope !== "all" && source.type !== filters.scope) return false;
    if (filters.model !== "all" && source.model !== filters.model) return false;
    if (filters.source !== "all" && source.id !== filters.source) return false;
    return true;
  });
}

export type Summary = {
  runs: number;
  success: number;
  failed: number;
  successRate: number;
  avgLatencyMs: number;
  p95Ms: number;
  promptTokens: number;
  completionTokens: number;
  tokens: number;
  costUsd: number;
  costPerRun: number;
  failures: number[];
};

export function summarize(rows: DailyRow[]): Summary {
  let runs = 0;
  let success = 0;
  let failed = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let latency = 0;
  let p95Weighted = 0;
  let costUsd = 0;
  const failures = failureReasons.map(() => 0);
  for (const row of rows) {
    runs += row.runs;
    success += row.success;
    failed += row.failed;
    promptTokens += row.promptTokens;
    completionTokens += row.completionTokens;
    latency += row.latencyTotalMs;
    p95Weighted += row.p95Ms * row.runs;
    costUsd += row.costUsd;
    row.failures.forEach((value, index) => (failures[index]! += value));
  }
  return {
    runs,
    success,
    failed,
    successRate: runs ? (success / runs) * 100 : 0,
    avgLatencyMs: runs ? latency / runs : 0,
    p95Ms: runs ? p95Weighted / runs : 0,
    promptTokens,
    completionTokens,
    tokens: promptTokens + completionTokens,
    costUsd,
    costPerRun: runs ? costUsd / runs : 0,
    failures: failures.map(Math.round),
  };
}

export type DailyPoint = Summary & { date: string; label: string };

/** One summary per day in the range, including empty days. */
export function dailySeries(rows: DailyRow[], from: string, to: string): DailyPoint[] {
  const byDate = new Map<string, DailyRow[]>();
  for (const row of rows) byDate.set(row.date, [...(byDate.get(row.date) ?? []), row]);
  const length = daysBetween(from, to) + 1;
  return Array.from({ length }, (_, index) => {
    const date = addDays(from, index);
    return { ...summarize(byDate.get(date) ?? []), date, label: dayLabel(date) };
  });
}

export type SourceStats = Summary & { id: string; type: RunSourceType; name: string; model: string; trend: number[] };

export function bySource(rows: DailyRow[], from: string, to: string): SourceStats[] {
  const groups = new Map<string, DailyRow[]>();
  for (const row of rows) groups.set(row.sourceId, [...(groups.get(row.sourceId) ?? []), row]);
  return [...groups.entries()]
    .map(([id, group]) => {
      const source = sourcesById.get(id)!;
      return {
        ...summarize(group),
        id,
        type: source.type,
        name: source.name,
        model: source.model,
        trend: dailySeries(group, from, to).map((point) => point.runs),
      };
    })
    .filter((item) => item.runs > 0);
}

export type ModelStats = Summary & { id: string; name: string; provider: string; color: string; share: number };

export function byModel(rows: DailyRow[]): ModelStats[] {
  const total = rows.reduce((sum, row) => sum + row.costUsd, 0) || 1;
  return models
    .map((model) => {
      const summary = summarize(rows.filter((row) => sourcesById.get(row.sourceId)!.model === model.id));
      return {
        ...summary,
        id: model.id,
        name: model.name,
        provider: model.provider,
        color: modelColors[model.id] ?? "var(--subtle-foreground)",
        share: (summary.costUsd / total) * 100,
      };
    })
    .filter((item) => item.runs > 0);
}

export type ToolStats = {
  id: string;
  name: string;
  calls: number;
  errors: number;
  errorRate: number;
  avgLatencyMs: number;
  sources: number;
};

/** Tool calls follow each source's run profile; tool errors follow its "Tool error" failures. */
export function byTool(rows: DailyRow[]): ToolStats[] {
  const stats = new Map<string, { calls: number; errors: number; latency: number; sources: Set<string> }>();
  const toolErrorIndex = failureReasons.indexOf("Tool error");
  for (const row of rows) {
    const steps = profileFor(row.sourceId).steps.filter((step) => step.toolId);
    if (!steps.length || !row.runs) continue;
    const errorsPerStep = row.failures[toolErrorIndex]! / steps.length;
    steps.forEach((step) => {
      const entry = stats.get(step.toolId!) ?? { calls: 0, errors: 0, latency: 0, sources: new Set<string>() };
      const calls = row.runs;
      entry.calls += calls;
      entry.errors += errorsPerStep;
      entry.latency += calls * step.seconds * 1000;
      entry.sources.add(row.sourceId);
      stats.set(step.toolId!, entry);
    });
  }
  return [...stats.entries()].map(([id, entry]) => ({
    id,
    name: toolsById.get(id)?.name ?? id,
    calls: Math.round(entry.calls),
    errors: Math.round(entry.errors),
    errorRate: entry.calls ? (entry.errors / entry.calls) * 100 : 0,
    avgLatencyMs: entry.calls ? entry.latency / entry.calls : 0,
    sources: entry.sources.size,
  }));
}

/** Percentage change, or null when there's nothing to compare against. */
export function change(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

/* --------------------------------------------------------------------------
 * Formatting
 * ------------------------------------------------------------------------ */

export function formatUsd(value: number) {
  if (value > 0 && value < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value >= 1000 ? 0 : 2 }).format(value);
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}
