"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarRange,
  CircleCheck,
  CirclePlay,
  Coins,
  DollarSign,
  Download,
  FileJson,
  FileSpreadsheet,
  Gauge,
  Lightbulb,
  RefreshCw,
  SearchX,
  Timer,
  TrendingUp,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { AgentAvatar } from "@/components/agents/AgentVisuals";
import { Card, CardHeader } from "@/components/dashboard/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarList, TokenSplit } from "@/components/runs/RunCharts";
import { ToolIcon } from "@/components/tools/ToolVisuals";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Select, inputClass } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/PageKit";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { models, toolsById } from "@/lib/agents/catalog";
import { useAgents } from "@/lib/agents/store";
import type { AgentColor, AgentIconKey } from "@/lib/agents/types";
import {
  ANALYTICS_END,
  EARLIEST_DAY,
  addDays,
  analyticsSources,
  byModel,
  bySource,
  byTool,
  change,
  dailySeries,
  dayLabel,
  daysBetween,
  failureReasons,
  filterRows,
  formatPercent,
  formatUsd,
  previousRange,
  summarize,
  type AnalyticsFilters,
  type DailyPoint,
  type ModelStats,
  type Scope,
  type SourceStats,
  type ToolStats,
} from "@/lib/analytics/data";
import { cn } from "@/lib/cn";
import { downloadFile } from "@/lib/download";
import { formatCompact } from "@/lib/format";
import type { Stat } from "@/lib/mock-data";
import { formatDuration } from "@/lib/runs/format";
import { useRuns } from "@/lib/runs/store";
import { toast } from "@/lib/toast";
import { useWorkflows } from "@/lib/workflows/store";
import { DonutChart, Legend, LineChart, Sparkline, StackedBarChart, ChartSkeleton } from "./charts";
import { SortableTable, type Column } from "./SortableTable";

/* --------------------------------------------------------------------------
 * Filters & simulated query
 * ------------------------------------------------------------------------ */

type Preset = "7d" | "14d" | "30d" | "90d" | "custom";
const presets: { value: Exclude<Preset, "custom">; label: string; days: number }[] = [
  { value: "7d", label: "7D", days: 7 },
  { value: "14d", label: "14D", days: 14 },
  { value: "30d", label: "30D", days: 30 },
  { value: "90d", label: "90D", days: 90 },
];

type Metric = "runs" | "success" | "latency" | "tokens" | "cost";
type Breakdown = "agent" | "workflow" | "model" | "tool";

/** Pretends each filter change is a network query so loading states are visible. */
function useSimulatedQuery(key: string, delay = 450) {
  const [settled, setSettled] = useState(key);
  useEffect(() => {
    if (settled === key) return;
    const id = window.setTimeout(() => setSettled(key), delay);
    return () => window.clearTimeout(id);
  }, [key, settled, delay]);
  return settled !== key;
}

/** Days without runs inherit the previous rate instead of dropping to zero. */
function carryForward(points: DailyPoint[], pick: (point: DailyPoint) => number) {
  let last = 0;
  const first = points.find((point) => point.runs > 0);
  if (first) last = pick(first);
  return points.map((point) => (point.runs > 0 ? (last = pick(point)) : last));
}

const formatTokens = (value: number) => formatCompact(Math.round(value));
const formatLatency = (value: number) => formatDuration(value);
const formatCount = (value: number) => Math.round(value).toLocaleString("en-US");

type SourceDisplay = { name: string; icon: AgentIconKey; color: AgentColor; href: string };

export function AnalyticsPage({ initialRange, initialSource }: { initialRange?: string; initialSource?: string }) {
  const agents = useAgents();
  const workflows = useWorkflows();
  const runs = useRuns();

  const [preset, setPreset] = useState<Preset>(presets.some((item) => item.value === initialRange) ? (initialRange as Preset) : "14d");
  const [customFrom, setCustomFrom] = useState(addDays(ANALYTICS_END, -20));
  const [customTo, setCustomTo] = useState(ANALYTICS_END);
  const [scope, setScope] = useState<Scope>("all");
  const [model, setModel] = useState("all");
  const [source, setSource] = useState(analyticsSources.some((item) => item.id === initialSource) ? initialSource! : "all");
  const [metric, setMetric] = useState<Metric>("runs");
  const [breakdown, setBreakdown] = useState<Breakdown>("agent");
  const [refreshes, setRefreshes] = useState(0);

  const range = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    const days = presets.find((item) => item.value === preset)!.days;
    return { from: addDays(ANALYTICS_END, -(days - 1)), to: ANALYTICS_END };
  }, [preset, customFrom, customTo]);
  const days = daysBetween(range.from, range.to) + 1;

  const filters: AnalyticsFilters = useMemo(() => ({ ...range, scope, model, source }), [range, scope, model, source]);
  const loading = useSimulatedQuery(`${JSON.stringify(filters)}:${refreshes}`);

  // Keep shareable state in the URL (range + source), like the Tools tabs do.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (preset === "14d" || preset === "custom") url.searchParams.delete("range");
    else url.searchParams.set("range", preset);
    if (source === "all") url.searchParams.delete("source");
    else url.searchParams.set("source", source);
    window.history.replaceState(null, "", url);
  }, [preset, source]);

  const data = useMemo(() => {
    const previous = previousRange(filters.from, filters.to);
    const rows = filterRows(filters);
    const previousRows = filterRows(filters, previous);
    return {
      previous,
      summary: summarize(rows),
      previousSummary: summarize(previousRows),
      daily: dailySeries(rows, filters.from, filters.to),
      previousDaily: dailySeries(previousRows, previous.from, previous.to),
      sources: bySource(rows, filters.from, filters.to),
      previousSources: bySource(previousRows, previous.from, previous.to),
      models: byModel(rows),
      tools: byTool(rows),
    };
  }, [filters]);

  // Live names/appearance from the agent and workflow stores (renames show up here).
  const display = (id: string): SourceDisplay => {
    const agent = agents.find((item) => item.id === id);
    if (agent) return { name: agent.name, icon: agent.icon, color: agent.color, href: `/agents/${id}/builder` };
    const workflow = workflows.find((item) => item.id === id);
    if (workflow) return { name: workflow.name, icon: workflow.icon, color: workflow.color, href: `/workflows/${id}/builder` };
    const fallback = analyticsSources.find((item) => item.id === id);
    return { name: fallback?.name ?? id, icon: "bot", color: "violet", href: `/runs?source=${id}` };
  };

  const sourceOptions = analyticsSources.filter((item) => scope === "all" || item.type === scope);
  const filtered = scope !== "all" || model !== "all" || source !== "all";
  const empty = data.summary.runs === 0;

  const resetFilters = () => {
    setScope("all");
    setModel("all");
    setSource("all");
  };

  /* ---------------- Export ---------------- */

  const fileBase = `agentflow-analytics_${range.from}_${range.to}`;

  const exportDaily = () => {
    const header = "date,runs,successful,failed,success_rate_pct,avg_latency_ms,p95_latency_ms,prompt_tokens,completion_tokens,est_cost_usd";
    const lines = data.daily.map((point) =>
      [point.date, point.runs, point.success, point.failed, point.successRate.toFixed(2), Math.round(point.avgLatencyMs), Math.round(point.p95Ms), point.promptTokens, point.completionTokens, point.costUsd.toFixed(4)].join(","),
    );
    downloadFile(`${fileBase}_daily.csv`, [header, ...lines].join("\n"), "text/csv");
    toast({ title: "Daily series exported", description: `${fileBase}_daily.csv · ${lines.length} rows of sample data` });
  };

  const csvCell = (value: string | number) => (typeof value === "string" && /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : String(value));

  const exportBreakdown = () => {
    let header: string[];
    let lines: (string | number)[][];
    if (breakdown === "model") {
      header = ["model", "provider", "runs", "success_rate_pct", "avg_latency_ms", "tokens", "est_cost_usd"];
      lines = data.models.map((item) => [item.name, item.provider, item.runs, item.successRate.toFixed(2), Math.round(item.avgLatencyMs), item.tokens, item.costUsd.toFixed(4)]);
    } else if (breakdown === "tool") {
      header = ["tool", "calls", "errors", "error_rate_pct", "avg_latency_ms", "used_by"];
      lines = data.tools.map((item) => [item.name, item.calls, item.errors, item.errorRate.toFixed(2), Math.round(item.avgLatencyMs), item.sources]);
    } else {
      header = ["name", "type", "model", "runs", "successful", "failed", "success_rate_pct", "avg_latency_ms", "p95_latency_ms", "tokens", "est_cost_usd"];
      lines = data.sources
        .filter((item) => item.type === breakdown)
        .map((item) => [display(item.id).name, item.type, item.model, item.runs, item.success, item.failed, item.successRate.toFixed(2), Math.round(item.avgLatencyMs), Math.round(item.p95Ms), item.tokens, item.costUsd.toFixed(4)]);
    }
    const name = `${fileBase}_by-${breakdown}.csv`;
    downloadFile(name, [header, ...lines.map((line) => line.map(csvCell))].map((line) => line.join(",")).join("\n"), "text/csv");
    toast({ title: "Breakdown exported", description: `${name} · ${lines.length} rows` });
  };

  const exportJson = () => {
    const report = {
      note: "Sample analytics generated by the AgentFlow demo — not real usage data.",
      generatedAt: new Date().toISOString(),
      filters,
      comparedTo: data.previous,
      summary: data.summary,
      previousSummary: data.previousSummary,
      daily: data.daily,
      bySource: data.sources.map(({ trend, ...item }) => ({ ...item, name: display(item.id).name, dailyRuns: trend })),
      byModel: data.models,
      byTool: data.tools,
    };
    downloadFile(`${fileBase}.json`, JSON.stringify(report, null, 2), "application/json");
    toast({ title: "Report exported", description: `${fileBase}.json` });
  };

  /* ---------------- KPIs ---------------- */

  const comparison = `vs previous ${days} day${days === 1 ? "" : "s"}`;
  const kpi = (
    label: string,
    value: string,
    current: number,
    previous: number,
    goodWhenUp: boolean,
    icon: Stat["icon"],
    iconClass: string,
    mode: "percent" | "points" = "percent",
  ): Stat => {
    const delta = mode === "points" ? (previous ? current - previous : null) : change(current, previous);
    const up = (delta ?? 0) >= 0;
    return {
      label,
      value,
      change: delta === null ? "No data in the previous period" : `${up ? "+" : "−"}${Math.abs(delta).toFixed(1)}${mode === "points" ? " pts" : "%"} ${comparison}`,
      direction: up ? "up" : "down",
      sentiment: delta === null || Math.abs(delta) < 0.05 || up === goodWhenUp ? "positive" : "negative",
      icon,
      iconClass,
    };
  };

  const { summary, previousSummary } = data;
  const kpis: { stat: Stat; series: number[]; color: string }[] = [
    {
      stat: kpi("Total runs", formatCount(summary.runs), summary.runs, previousSummary.runs, true, CirclePlay, "bg-primary-soft text-primary-soft-foreground"),
      series: data.daily.map((point) => point.runs),
      color: "var(--chart-1)",
    },
    {
      stat: kpi("Success rate", formatPercent(summary.successRate), summary.successRate, previousSummary.successRate, true, CircleCheck, "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", "points"),
      series: carryForward(data.daily, (point) => point.successRate),
      color: "var(--success)",
    },
    {
      stat: kpi("Avg latency", formatLatency(summary.avgLatencyMs), summary.avgLatencyMs, previousSummary.avgLatencyMs, false, Timer, "bg-sky-500/10 text-sky-600 dark:text-sky-400"),
      series: carryForward(data.daily, (point) => point.avgLatencyMs),
      color: "var(--chart-completion)",
    },
    {
      stat: kpi("Tokens used", formatTokens(summary.tokens), summary.tokens, previousSummary.tokens, false, Coins, "bg-amber-500/10 text-amber-600 dark:text-amber-400"),
      series: data.daily.map((point) => point.tokens),
      color: "var(--chart-4)",
    },
    {
      stat: kpi("Est. cost", formatUsd(summary.costUsd), summary.costUsd, previousSummary.costUsd, false, DollarSign, "bg-violet-500/10 text-violet-600 dark:text-violet-400"),
      series: data.daily.map((point) => point.costUsd),
      color: "var(--chart-1)",
    },
    {
      stat: kpi("Cost per run", formatUsd(summary.costPerRun), summary.costPerRun, previousSummary.costPerRun, false, Gauge, "bg-rose-500/10 text-rose-600 dark:text-rose-400"),
      series: carryForward(data.daily, (point) => point.costPerRun),
      color: "var(--chart-5)",
    },
  ];

  /* ---------------- Render ---------------- */

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 animate-fade-up sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Analytics</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Performance, reliability and spend across your agents and workflows.{" "}
            <span className="whitespace-nowrap text-subtle-foreground">Sample data through {dayLabel(ANALYTICS_END, true)}.</span>
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setRefreshes((value) => value + 1);
              toast({ tone: "info", title: "Analytics refreshed", description: "Re-ran the sample queries for this range." });
            }}
            disabled={loading}
            className={buttonVariants({ variant: "secondary" })}
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
            Refresh
          </button>
          <DropdownMenu
            label="Export analytics"
            trigger={
              <>
                <Download size={16} />
                Export
              </>
            }
            triggerClassName={buttonVariants()}
            items={[
              { label: "Daily series (CSV)", icon: FileSpreadsheet, onSelect: exportDaily, disabled: empty },
              { label: "Current breakdown (CSV)", icon: FileSpreadsheet, onSelect: exportBreakdown, disabled: empty },
              { label: "Full report (JSON)", icon: FileJson, onSelect: exportJson, disabled: empty },
            ]}
          />
        </div>
      </header>

      {/* Filters — one row above all charts */}
      <section aria-label="Filters" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm shadow-black/[0.02] animate-fade-up xl:flex-row xl:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Date range" className="flex rounded-xl border border-border bg-muted p-0.5">
            {[...presets, { value: "custom" as const, label: "Custom" }].map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={preset === item.value}
                onClick={() => setPreset(item.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  preset === item.value ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          {preset === "custom" ? (
            <div className="flex flex-wrap items-center gap-2 animate-fade-in">
              <input
                type="date"
                aria-label="Start date"
                value={customFrom}
                min={EARLIEST_DAY}
                max={ANALYTICS_END}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) return;
                  setCustomFrom(value);
                  if (value > customTo) setCustomTo(value);
                }}
                className={cn(inputClass, "h-9 w-[150px]")}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                aria-label="End date"
                value={customTo}
                min={EARLIEST_DAY}
                max={ANALYTICS_END}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) return;
                  setCustomTo(value);
                  if (value < customFrom) setCustomFrom(value);
                }}
                className={cn(inputClass, "h-9 w-[150px]")}
              />
            </div>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarRange size={14} />
              {dayLabel(range.from)} – {dayLabel(range.to, true)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:ml-auto xl:w-[560px]">
          <Select
            aria-label="Source type"
            value={scope}
            onChange={(event) => {
              const next = event.target.value as Scope;
              setScope(next);
              if (next !== "all" && analyticsSources.find((item) => item.id === source)?.type !== next) setSource("all");
            }}
          >
            <option value="all">Agents & workflows</option>
            <option value="agent">Agents only</option>
            <option value="workflow">Workflows only</option>
          </Select>
          <Select aria-label="Agent or workflow" value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="all">{scope === "workflow" ? "All workflows" : scope === "agent" ? "All agents" : "All sources"}</option>
            {(["agent", "workflow"] as const)
              .filter((type) => scope === "all" || scope === type)
              .map((type) => (
                <optgroup key={type} label={type === "agent" ? "Agents" : "Workflows"}>
                  {sourceOptions
                    .filter((item) => item.type === type)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {display(item.id).name}
                      </option>
                    ))}
                </optgroup>
              ))}
          </Select>
          <Select aria-label="Model" value={model} onChange={(event) => setModel(event.target.value)}>
            <option value="all">All models</option>
            {models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
      </section>

      {empty && !loading ? (
        <EmptyState
          icon={SearchX}
          title="No runs match these filters"
          description={
            model !== "all"
              ? `No agent or workflow ran on ${models.find((item) => item.id === model)?.name ?? model} in this period. Try another model or a wider date range.`
              : "Nothing ran in this period for the selected agents and workflows. Try a wider date range."
          }
          action={
            <>
              {filtered && (
                <button type="button" onClick={resetFilters} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Clear filters
                </button>
              )}
              <button type="button" onClick={() => setPreset("90d")} className={buttonVariants({ size: "sm" })}>
                <CalendarRange size={14} />
                Show last 90 days
              </button>
            </>
          }
        />
      ) : (
        <>
          <section aria-label="Key metrics" aria-busy={loading} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {kpis.map((item, index) =>
              loading ? (
                <div key={item.stat.label} className="h-[172px] animate-pulse rounded-2xl border border-border bg-card p-5">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="mt-4 h-7 w-28 rounded bg-muted" />
                  <div className="mt-4 h-3 w-36 rounded bg-muted" />
                  <div className="mt-5 h-8 rounded bg-muted/70" />
                </div>
              ) : (
                <StatCard key={item.stat.label} stat={item.stat} index={index} chart={<Sparkline values={item.series} color={item.color} />} />
              ),
            )}
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <MainChart metric={metric} onMetric={setMetric} daily={data.daily} previousDaily={data.previousDaily} loading={loading} summary={summary} />
            </Card>
            <InsightsCard loading={loading} sources={data.sources} previousSources={data.previousSources} tools={data.tools} summary={summary} previousSummary={previousSummary} display={display} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            <Card>
              <CardHeader
                title="Success & failures"
                subtitle={`${formatCount(summary.failed)} failed of ${formatCount(summary.runs)} runs`}
                action={
                  <Link href="/runs" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    View runs <ArrowRight size={12} />
                  </Link>
                }
              />
              {loading ? (
                <ChartSkeleton height={180} className="px-0" />
              ) : (
                <>
                  <div className="mb-5 flex items-end gap-6">
                    <div>
                      <p className="text-3xl font-bold tabular-nums tracking-tight">{formatPercent(summary.successRate)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">success rate</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold tabular-nums tracking-tight text-danger">{formatPercent(100 - summary.successRate)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">failure rate</p>
                    </div>
                  </div>
                  <div className="mb-5 flex h-2.5 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${summary.success} successful and ${summary.failed} failed runs`}>
                    <span className="h-full rounded-l-full bg-chart-success" style={{ width: `${summary.successRate}%` }} />
                    <span className="h-full rounded-r-full bg-chart-failed" style={{ width: `${100 - summary.successRate}%` }} />
                  </div>
                  <p className="mb-3 text-xs font-semibold text-muted-foreground">Failures by cause</p>
                  {summary.failed === 0 ? (
                    <p className="text-sm text-muted-foreground">No failures in this period. 🎉</p>
                  ) : (
                    <BarList
                      label="Failures by cause"
                      format={formatCount}
                      items={failureReasons
                        .map((reason, index) => ({ id: reason, label: reason, value: summary.failures[index] ?? 0, failed: true }))
                        .filter((item) => item.value > 0)
                        .sort((a, b) => b.value - a.value)}
                    />
                  )}
                </>
              )}
            </Card>

            <Card>
              <CardHeader title="Cost by model" subtitle="Estimated from sample list prices per 1M tokens" />
              {loading ? (
                <ChartSkeleton height={180} className="px-0" />
              ) : (
                <DonutChart
                  ariaLabel="Estimated cost by model"
                  centerLabel="Total est. cost"
                  format={formatUsd}
                  items={[...data.models]
                    .sort((a, b) => b.costUsd - a.costUsd)
                    .map((item) => ({ id: item.id, label: item.name, hint: `${formatCompact(item.runs)} runs`, value: item.costUsd, color: item.color }))}
                />
              )}
            </Card>

            <Card className="lg:col-span-2 2xl:col-span-1">
              <CardHeader title="Token usage" subtitle={`${formatTokens(summary.runs ? summary.tokens / summary.runs : 0)} tokens per run on average`} />
              {loading ? (
                <ChartSkeleton height={180} className="px-0" />
              ) : (
                <div className="space-y-6">
                  <TokenSplit prompt={summary.promptTokens} completion={summary.completionTokens} />
                  <div>
                    <p className="mb-3 text-xs font-semibold text-muted-foreground">Top consumers</p>
                    <BarList
                      label="Tokens by agent or workflow"
                      format={formatTokens}
                      items={[...data.sources]
                        .sort((a, b) => b.tokens - a.tokens)
                        .slice(0, 5)
                        .map((item) => ({ id: item.id, label: display(item.id).name, value: item.tokens }))}
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Performance breakdown"
              subtitle="Click a column to sort. Names link to the builder; run counts link to execution history."
              action={
                <button type="button" onClick={exportBreakdown} disabled={loading} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  <Download size={14} />
                  CSV
                </button>
              }
            />
            <div role="tablist" aria-label="Breakdown dimension" className="-mt-1 mb-4 flex gap-1 overflow-x-auto">
              {(
                [
                  { value: "agent", label: "Agents", count: data.sources.filter((item) => item.type === "agent").length },
                  { value: "workflow", label: "Workflows", count: data.sources.filter((item) => item.type === "workflow").length },
                  { value: "model", label: "Models", count: data.models.length },
                  { value: "tool", label: "Tools", count: data.tools.length },
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={breakdown === item.value}
                  onClick={() => setBreakdown(item.value)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    breakdown === item.value ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                  <span className={cn("rounded-md px-1.5 text-[11px] tabular-nums", breakdown === item.value ? "bg-card/70" : "bg-muted")}>{item.count}</span>
                </button>
              ))}
            </div>
            {loading ? (
              <div className="space-y-2" aria-hidden>
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="h-11 animate-pulse rounded-xl bg-muted/70" />
                ))}
              </div>
            ) : breakdown === "model" ? (
              <SortableTable key="model" rows={data.models} columns={modelColumns(summary.costUsd)} caption="Performance by model" initialSort="runs" />
            ) : breakdown === "tool" ? (
              <SortableTable key="tool" rows={data.tools} columns={toolColumns} caption="Performance by tool" initialSort="calls" emptyMessage="No tool calls in this period." />
            ) : (
              <SortableTable
                key={breakdown}
                rows={data.sources.filter((item) => item.type === breakdown)}
                columns={sourceColumns(display)}
                caption={`Performance by ${breakdown}`}
                initialSort="runs"
                emptyMessage={`No ${breakdown} runs match these filters.`}
              />
            )}
          </Card>

          <RecentFailures runs={runs} scope={scope} source={source} display={display} />
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Main trend chart
 * ------------------------------------------------------------------------ */

/** Tall enough to sit level with the Insights card beside it. */
const MAIN_CHART_HEIGHT = 300;

const metricTabs: { value: Metric; label: string }[] = [
  { value: "runs", label: "Runs" },
  { value: "success", label: "Success rate" },
  { value: "latency", label: "Latency" },
  { value: "tokens", label: "Tokens" },
  { value: "cost", label: "Cost" },
];

function MainChart({
  metric,
  onMetric,
  daily,
  previousDaily,
  loading,
  summary,
}: {
  metric: Metric;
  onMetric: (metric: Metric) => void;
  daily: DailyPoint[];
  previousDaily: DailyPoint[];
  loading: boolean;
  summary: ReturnType<typeof summarize>;
}) {
  const labels = daily.map((point) => point.label);
  const previousLabels = previousDaily.map((point) => point.label);
  const previousColor = "var(--subtle-foreground)";

  const chart: { subtitle: string; legend: { label: string; color: string }[]; body: ReactNode } = (() => {
    switch (metric) {
      case "success":
        return {
          subtitle: `${formatPercent(summary.successRate)} of runs succeeded`,
          legend: [
            { label: "This period", color: "var(--success)" },
            { label: "Previous period", color: previousColor },
          ],
          body: (
            <LineChart
              ariaLabel="Daily success rate"
              height={MAIN_CHART_HEIGHT}
              labels={labels}
              zeroBased={false}
              format={(value) => formatPercent(value)}
              axisFormat={(value) => `${Math.round(value)}%`}
              series={[
                { key: "current", label: "This period", color: "var(--success)", values: carryForward(daily, (point) => point.successRate), area: true },
                { key: "previous", label: "Previous", color: previousColor, values: carryForward(previousDaily, (point) => point.successRate), pointLabels: previousLabels, muted: true },
              ]}
            />
          ),
        };
      case "latency":
        return {
          subtitle: `Average ${formatLatency(summary.avgLatencyMs)} · p95 ${formatLatency(summary.p95Ms)}`,
          legend: [
            { label: "Average", color: "var(--chart-1)" },
            { label: "p95", color: "var(--chart-2)" },
          ],
          body: (
            <LineChart
              ariaLabel="Daily run latency, average and 95th percentile"
              height={MAIN_CHART_HEIGHT}
              labels={labels}
              format={formatLatency}
              axisFormat={(value) => `${Math.round(value / 1000)}s`}
              series={[
                { key: "avg", label: "Average", color: "var(--chart-1)", values: carryForward(daily, (point) => point.avgLatencyMs), area: true },
                { key: "p95", label: "p95", color: "var(--chart-2)", values: carryForward(daily, (point) => point.p95Ms) },
              ]}
            />
          ),
        };
      case "tokens":
        return {
          subtitle: `${formatTokens(summary.tokens)} tokens · ${Math.round((summary.promptTokens / (summary.tokens || 1)) * 100)}% prompt`,
          legend: [
            { label: "Prompt", color: "var(--primary)" },
            { label: "Completion", color: "var(--chart-completion)" },
          ],
          body: (
            <StackedBarChart
              ariaLabel="Daily token usage by prompt and completion"
              height={MAIN_CHART_HEIGHT}
              labels={labels}
              format={formatTokens}
              series={[
                { key: "prompt", label: "Prompt", color: "var(--primary)", values: daily.map((point) => point.promptTokens) },
                { key: "completion", label: "Completion", color: "var(--chart-completion)", values: daily.map((point) => point.completionTokens) },
              ]}
            />
          ),
        };
      case "cost":
        return {
          subtitle: `${formatUsd(summary.costUsd)} estimated · ${formatUsd(summary.costPerRun)} per run`,
          legend: [
            { label: "This period", color: "var(--chart-1)" },
            { label: "Previous period", color: previousColor },
          ],
          body: (
            <LineChart
              ariaLabel="Daily estimated cost"
              height={MAIN_CHART_HEIGHT}
              labels={labels}
              format={formatUsd}
              axisFormat={(value) => `$${value < 10 ? value.toFixed(1) : Math.round(value)}`}
              series={[
                { key: "current", label: "This period", color: "var(--chart-1)", values: daily.map((point) => point.costUsd), area: true },
                { key: "previous", label: "Previous", color: previousColor, values: previousDaily.map((point) => point.costUsd), pointLabels: previousLabels, muted: true },
              ]}
            />
          ),
        };
      default:
        return {
          subtitle: `${formatCount(summary.runs)} runs · ${formatPercent(summary.successRate)} successful`,
          legend: [
            { label: "Success", color: "var(--chart-success)" },
            { label: "Failed", color: "var(--chart-failed)" },
          ],
          body: (
            <StackedBarChart
              ariaLabel="Daily runs by outcome"
              height={MAIN_CHART_HEIGHT}
              labels={labels}
              format={formatCount}
              series={[
                { key: "success", label: "Success", color: "var(--chart-success)", values: daily.map((point) => point.success) },
                { key: "failed", label: "Failed", color: "var(--chart-failed)", values: daily.map((point) => point.failed) },
              ]}
            />
          ),
        };
    }
  })();

  return (
    <>
      <CardHeader
        title="Execution volume & performance"
        subtitle={loading ? "Loading…" : chart.subtitle}
        action={
          <div role="tablist" aria-label="Chart metric" className="flex max-w-full overflow-x-auto rounded-lg border border-border bg-muted p-0.5">
            {metricTabs.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={metric === item.value}
                onClick={() => onMetric(item.value)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
                  metric === item.value ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="mb-4">
        <Legend items={chart.legend} />
      </div>
      {loading ? <ChartSkeleton height={MAIN_CHART_HEIGHT} /> : <div key={metric} className="animate-fade-in">{chart.body}</div>}
    </>
  );
}

/* --------------------------------------------------------------------------
 * Insights
 * ------------------------------------------------------------------------ */

type Insight = { id: string; icon: typeof Lightbulb; tone: string; text: ReactNode; href: string; cta: string };

function InsightsCard({
  loading,
  sources,
  previousSources,
  tools,
  summary,
  previousSummary,
  display,
}: {
  loading: boolean;
  sources: SourceStats[];
  previousSources: SourceStats[];
  tools: ToolStats[];
  summary: ReturnType<typeof summarize>;
  previousSummary: ReturnType<typeof summarize>;
  display: (id: string) => SourceDisplay;
}) {
  const insights: Insight[] = [];

  // Biggest reliability regression.
  const regressions = sources
    .filter((item) => item.runs >= 5)
    .map((item) => {
      const before = previousSources.find((previous) => previous.id === item.id);
      return { item, delta: before ? before.successRate - item.successRate : 0 };
    })
    .sort((a, b) => b.delta - a.delta);
  const worst = regressions[0];
  if (worst && worst.delta > 2) {
    const reasonIndex = worst.item.failures.indexOf(Math.max(...worst.item.failures));
    const reason = failureReasons[reasonIndex] ?? "Timeout";
    const warehouse = reason === "Auth error" && ["data-analyst", "data-analysis", "sql-copilot"].includes(worst.item.id);
    insights.push({
      id: "regression",
      icon: TriangleAlert,
      tone: "bg-danger-soft text-danger",
      text: (
        <>
          <strong>{display(worst.item.id).name}</strong> success rate fell to {formatPercent(worst.item.successRate)} (−{worst.delta.toFixed(1)} pts). Most failures are{" "}
          <strong>{reason.toLowerCase()}s</strong>
          {warehouse ? " — the PostgreSQL connection is rejecting its password." : "."}
        </>
      ),
      href: warehouse ? "/integrations?connect=postgresql" : `/runs?source=${worst.item.id}`,
      cta: warehouse ? "Fix PostgreSQL integration" : "Inspect runs",
    });
  }

  // Volume trend and the source driving it.
  const runChange = change(summary.runs, previousSummary.runs);
  if (runChange !== null) {
    const growth = sources
      .map((item) => ({ item, delta: item.runs - (previousSources.find((previous) => previous.id === item.id)?.runs ?? 0) }))
      .sort((a, b) => (runChange >= 0 ? b.delta - a.delta : a.delta - b.delta))[0];
    insights.push({
      id: "volume",
      icon: TrendingUp,
      tone: "bg-primary-soft text-primary-soft-foreground",
      text: (
        <>
          Runs are {runChange >= 0 ? "up" : "down"} <strong>{Math.abs(runChange).toFixed(1)}%</strong> vs the previous period
          {growth && growth.delta !== 0 && (
            <>
              , {runChange >= 0 ? "led" : "dragged"} by <strong>{display(growth.item.id).name}</strong> ({growth.delta > 0 ? "+" : ""}
              {growth.delta} runs)
            </>
          )}
          .
        </>
      ),
      href: growth ? `/runs?source=${growth.item.id}` : "/runs",
      cta: "View runs",
    });
  }

  // Biggest spender.
  const spender = [...sources].sort((a, b) => b.costUsd - a.costUsd)[0];
  if (spender && summary.costUsd > 0) {
    insights.push({
      id: "cost",
      icon: DollarSign,
      tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      text: (
        <>
          <strong>{display(spender.id).name}</strong> drives {Math.round((spender.costUsd / summary.costUsd) * 100)}% of estimated spend ({formatUsd(spender.costUsd)}) at{" "}
          {formatUsd(spender.costPerRun)} per run.
        </>
      ),
      href: display(spender.id).href,
      cta: "Review model settings",
    });
  }

  // Slowest tool.
  const slowest = [...tools].sort((a, b) => b.avgLatencyMs - a.avgLatencyMs)[0];
  if (slowest) {
    insights.push({
      id: "tool",
      icon: Zap,
      tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      text: (
        <>
          <strong>{slowest.name}</strong> is the slowest tool at {formatLatency(slowest.avgLatencyMs)} per call across {slowest.sources} agent
          {slowest.sources === 1 ? "" : "s"}/workflow{slowest.sources === 1 ? "" : "s"}.
        </>
      ),
      href: `/tools/${slowest.id}`,
      cta: "Open tool",
    });
  }

  return (
    <Card>
      <CardHeader title="Insights" subtitle="Generated from the selected period" />
      {loading ? (
        <div className="space-y-3" aria-hidden>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-muted/70" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nothing notable — everything is steady.</p>
      ) : (
        <ul className="space-y-3">
          {insights.slice(0, 4).map((insight) => (
            <li key={insight.id} className="flex gap-3 rounded-xl border border-border p-3 animate-fade-in">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", insight.tone)}>
                <insight.icon size={15} />
              </span>
              <div className="min-w-0 text-[13px] leading-5">
                <p className="text-foreground/90 [&_strong]:font-semibold [&_strong]:text-foreground">{insight.text}</p>
                <Link href={insight.href} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  {insight.cta}
                  <ArrowRight size={12} />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* --------------------------------------------------------------------------
 * Breakdown columns
 * ------------------------------------------------------------------------ */

function RateCell({ value, danger = false }: { value: number; danger?: boolean }) {
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block">
        <span className={cn("block h-full rounded-full", danger ? "bg-danger" : value >= 95 ? "bg-success" : value >= 90 ? "bg-amber-500" : "bg-danger")} style={{ width: `${Math.min(100, value)}%` }} />
      </span>
      {formatPercent(value)}
    </span>
  );
}

function sourceColumns(display: (id: string) => SourceDisplay): Column<SourceStats>[] {
  return [
    {
      key: "name",
      label: "Name",
      sortValue: (row) => display(row.id).name,
      render: (row) => {
        const item = display(row.id);
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <AgentAvatar icon={item.icon} color={item.color} size="sm" />
            <span className="min-w-0">
              <Link href={item.href} className="block truncate font-medium hover:text-primary">
                {item.name}
              </Link>
              <span className="block text-[11px] text-muted-foreground">{models.find((model) => model.id === row.model)?.name ?? row.model}</span>
            </span>
          </span>
        );
      },
    },
    {
      key: "runs",
      label: "Runs",
      align: "right",
      sortValue: (row) => row.runs,
      render: (row) => (
        <Link href={`/runs?source=${row.id}`} className="font-semibold hover:text-primary">
          {formatCount(row.runs)}
        </Link>
      ),
    },
    { key: "success", label: "Success", align: "right", sortValue: (row) => row.successRate, render: (row) => <RateCell value={row.successRate} /> },
    { key: "latency", label: "Avg latency", align: "right", sortValue: (row) => row.avgLatencyMs, render: (row) => formatLatency(row.avgLatencyMs) },
    { key: "p95", label: "p95", align: "right", sortValue: (row) => row.p95Ms, render: (row) => <span className="text-muted-foreground">{formatLatency(row.p95Ms)}</span> },
    { key: "tokens", label: "Tokens", align: "right", sortValue: (row) => row.tokens, render: (row) => formatTokens(row.tokens) },
    { key: "cost", label: "Est. cost", align: "right", sortValue: (row) => row.costUsd, render: (row) => formatUsd(row.costUsd) },
    {
      key: "trend",
      label: "Daily runs",
      align: "right",
      render: (row) => (
        <span className="ml-auto block w-24">
          <Sparkline values={row.trend} className="h-6" />
        </span>
      ),
    },
  ];
}

function modelColumns(totalCost: number): Column<ModelStats>[] {
  return [
    {
      key: "name",
      label: "Model",
      sortValue: (row) => row.name,
      render: (row) => (
        <span className="flex items-center gap-2.5">
          <span className="size-2.5 shrink-0 rounded-sm" style={{ background: row.color }} />
          <span>
            <span className="block font-medium">{row.name}</span>
            <span className="block text-[11px] text-muted-foreground">{row.provider}</span>
          </span>
        </span>
      ),
    },
    { key: "runs", label: "Runs", align: "right", sortValue: (row) => row.runs, render: (row) => <span className="font-semibold">{formatCount(row.runs)}</span> },
    { key: "success", label: "Success", align: "right", sortValue: (row) => row.successRate, render: (row) => <RateCell value={row.successRate} /> },
    { key: "latency", label: "Avg latency", align: "right", sortValue: (row) => row.avgLatencyMs, render: (row) => formatLatency(row.avgLatencyMs) },
    { key: "tokens", label: "Tokens", align: "right", sortValue: (row) => row.tokens, render: (row) => formatTokens(row.tokens) },
    { key: "costPerRun", label: "Cost / run", align: "right", sortValue: (row) => row.costPerRun, render: (row) => formatUsd(row.costPerRun) },
    { key: "cost", label: "Est. cost", align: "right", sortValue: (row) => row.costUsd, render: (row) => formatUsd(row.costUsd) },
    {
      key: "share",
      label: "Share of spend",
      align: "right",
      sortValue: (row) => row.costUsd,
      render: (row) => <span className="text-muted-foreground">{totalCost ? Math.round((row.costUsd / totalCost) * 100) : 0}%</span>,
    },
  ];
}

const toolColumns: Column<ToolStats>[] = [
  {
    key: "name",
    label: "Tool",
    sortValue: (row) => row.name,
    render: (row) => {
      const tool = toolsById.get(row.id);
      return (
        <span className="flex items-center gap-2.5">
          {tool && <ToolIcon tool={tool} size="sm" />}
          <Link href={`/tools/${row.id}`} className="font-medium hover:text-primary">
            {row.name}
          </Link>
        </span>
      );
    },
  },
  { key: "calls", label: "Calls", align: "right", sortValue: (row) => row.calls, render: (row) => <span className="font-semibold">{formatCount(row.calls)}</span> },
  { key: "errors", label: "Errors", align: "right", sortValue: (row) => row.errors, render: (row) => formatCount(row.errors) },
  {
    key: "errorRate",
    label: "Error rate",
    align: "right",
    sortValue: (row) => row.errorRate,
    render: (row) => <span className={cn(row.errorRate >= 2 ? "font-semibold text-danger" : "text-muted-foreground")}>{formatPercent(row.errorRate, 2)}</span>,
  },
  { key: "latency", label: "Avg latency", align: "right", sortValue: (row) => row.avgLatencyMs, render: (row) => formatLatency(row.avgLatencyMs) },
  { key: "sources", label: "Used by", align: "right", sortValue: (row) => row.sources, render: (row) => `${row.sources} source${row.sources === 1 ? "" : "s"}` },
];

/* --------------------------------------------------------------------------
 * Recent failures (live runs store)
 * ------------------------------------------------------------------------ */

function RecentFailures({
  runs,
  scope,
  source,
  display,
}: {
  runs: ReturnType<typeof useRuns>;
  scope: Scope;
  source: string;
  display: (id: string) => SourceDisplay;
}) {
  const failures = runs
    .filter((run) => run.status === "failed" && (scope === "all" || run.source.type === scope) && (source === "all" || run.source.id === source))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader
        title="Recent failed runs"
        subtitle="Live from your run history"
        action={
          <Link href={source === "all" ? "/runs" : `/runs?source=${source}`} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            All runs <ArrowRight size={12} />
          </Link>
        }
      />
      {failures.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
          <CircleCheck size={16} />
          No failed runs for this selection.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {failures.map((run) => {
            const item = display(run.source.id);
            return (
              <li key={run.id}>
                <Link href={`/runs/${run.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/60">
                  <AgentAvatar icon={item.icon} color={item.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{item.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{run.id}</span>
                    </p>
                    <p className="truncate text-xs text-danger">{run.error ?? "Run failed"}</p>
                  </div>
                  <RelativeTime iso={run.startedAt} className="shrink-0 text-xs text-muted-foreground" />
                  <ArrowRight size={14} className="hidden shrink-0 text-subtle-foreground sm:block" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
