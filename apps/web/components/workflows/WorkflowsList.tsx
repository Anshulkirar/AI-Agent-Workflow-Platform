"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CircleCheck,
  LayoutGrid,
  List,
  Pause,
  Play,
  Plus,
  Rocket,
  Search,
  SearchX,
  Trash2,
  Workflow as WorkflowIcon,
  X,
} from "lucide-react";
import { AgentAvatar } from "@/components/agents/AgentVisuals";
import { buttonVariants } from "@/components/ui/button";
import { StatTile } from "@/components/ui/PageKit";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Select } from "@/components/ui/Field";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/runs/format";
import { triggerMeta } from "@/lib/workflows/catalog";
import { useWorkflows } from "@/lib/workflows/store";
import type { TriggerType, WorkflowRecord, WorkflowStatus } from "@/lib/workflows/types";
import { useWorkflowActions } from "./use-workflow-actions";
import { SuccessMeter, TriggerLabel, WorkflowStatusBadge } from "./WorkflowVisuals";

type Filter = "all" | WorkflowStatus;
type SortKey = "name" | "runs" | "success" | "updated";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];

const sorters: Record<SortKey, (a: WorkflowRecord, b: WorkflowRecord) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  runs: (a, b) => a.runs - b.runs,
  success: (a, b) => a.successRate - b.successRate,
  updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
};

const columns = "lg:grid-cols-[28px_minmax(0,1.5fr)_minmax(0,1.3fr)_96px_minmax(0,1fr)_64px_100px_96px_72px]";

export function WorkflowsList() {
  const workflows = useWorkflows();
  const { menuItems, runNow, canRun, setStatus, requestDelete, dialog } = useWorkflowActions();
  const [filter, setFilter] = useState<Filter>("all");
  const [trigger, setTrigger] = useState<"all" | TriggerType>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "updated", dir: "desc" });
  const [view, setView] = useState<"table" | "cards">("table");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const term = useDeferredValue(query.trim().toLowerCase());

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: workflows.length, active: 0, paused: 0, draft: 0, archived: 0 };
    workflows.forEach((workflow) => result[workflow.status]++);
    return result;
  }, [workflows]);

  const visible = useMemo(() => {
    const list = workflows.filter(
      (workflow) =>
        (filter === "all" || workflow.status === filter) &&
        (trigger === "all" || workflow.trigger.type === trigger) &&
        (!term || `${workflow.name} ${workflow.description} ${workflow.tags.join(" ")}`.toLowerCase().includes(term)),
    );
    const direction = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => sorters[sort.key](a, b) * direction);
  }, [workflows, filter, trigger, term, sort]);

  const selectedItems = workflows.filter((workflow) => selected.has(workflow.id));
  const allVisibleSelected = visible.length > 0 && visible.every((workflow) => selected.has(workflow.id));
  const totalRuns = workflows.reduce((sum, workflow) => sum + workflow.runs, 0);
  const weightedSuccess = totalRuns
    ? workflows.reduce((sum, workflow) => sum + workflow.successRate * workflow.runs, 0) / totalRuns
    : 0;

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulk = (action: "active" | "paused" | "archived" | "delete") => {
    if (action === "delete") requestDelete(selectedItems);
    else setStatus(selectedItems, action);
    setSelected(new Set());
  };

  const sortHeader = (key: SortKey, label: string, align: "left" | "right" = "left") => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        aria-label={`Sort by ${label}${active ? (sort.dir === "asc" ? ", ascending" : ", descending") : ""}`}
        onClick={() => setSort({ key, dir: active && sort.dir === "desc" ? "asc" : "desc" })}
        className={cn("flex items-center gap-1 uppercase hover:text-foreground", align === "right" && "justify-end", active && "text-foreground")}
      >
        {label}
        <Icon size={11} />
      </button>
    );
  };

  const stats = [
    { label: "Workflows", value: String(workflows.length), icon: WorkflowIcon, tone: "bg-primary-soft text-primary-soft-foreground" },
    { label: "Active", value: String(counts.active), icon: Rocket, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "Total runs", value: totalRuns.toLocaleString("en-US"), icon: Activity, tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
    { label: "Avg. success", value: `${weightedSuccess.toFixed(1)}%`, icon: CircleCheck, tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 animate-fade-up sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Workflows</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Orchestrate agents, tools and logic into automated pipelines.</p>
        </div>
        <Link href="/workflows/new" className={buttonVariants({ className: "self-start sm:self-auto" })}>
          <Plus size={16} />
          Create Workflow
        </Link>
      </header>

      <section aria-label="Workflow statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatTile key={stat.label} index={index} {...stat} />
        ))}
      </section>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div role="tablist" aria-label="Filter by status" className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {filters.map((item) => {
            const active = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.value)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
                <span className={cn("rounded-md px-1.5 text-[11px] tabular-nums", active ? "bg-card/70" : "bg-muted")}>{counts[item.value]}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 xl:w-64 xl:flex-none">
            <Search size={15} className="shrink-0 text-subtle-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search workflows…"
              aria-label="Search workflows"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
            />
          </label>
          <Select
            aria-label="Filter by trigger"
            value={trigger}
            onChange={(event) => setTrigger(event.target.value as typeof trigger)}
            className="w-36 shrink-0 max-sm:hidden"
          >
            <option value="all">All triggers</option>
            {(Object.keys(triggerMeta) as TriggerType[]).map((type) => (
              <option key={type} value={type}>
                {triggerMeta[type].label}
              </option>
            ))}
          </Select>
          <div role="radiogroup" aria-label="Layout" className="flex shrink-0 rounded-xl border border-border bg-muted p-1">
            {(
              [
                { value: "table", label: "Table view", icon: List },
                { value: "cards", label: "Card view", icon: LayoutGrid },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={view === value}
                aria-label={label}
                title={label}
                onClick={() => setView(value)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg transition-all",
                  view === value ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="sticky top-20 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-card p-2.5 pl-4 shadow-lg shadow-primary/10 animate-fade-up"
        >
          <span className="mr-auto text-sm font-semibold">{selected.size} selected</span>
          {[
            { action: "active" as const, label: "Activate", icon: Rocket },
            { action: "paused" as const, label: "Pause", icon: Pause },
            { action: "archived" as const, label: "Archive", icon: Archive },
          ].map(({ action, label, icon: Icon }) => (
            <button key={action} type="button" onClick={() => bulk(action)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Icon size={14} />
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => bulk("delete")}
            className={buttonVariants({ variant: "secondary", size: "sm", className: "text-danger hover:border-danger/40" })}
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            aria-label="Clear selection"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center animate-fade-in">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <SearchX size={22} />
          </span>
          <h2 className="mt-4 font-semibold">No workflows found</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Try another search or filter — or create a new workflow.</p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
                setTrigger("all");
              }}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Clear filters
            </button>
            <Link href="/workflows/new" className={buttonVariants({ size: "sm" })}>
              <Plus size={14} />
              New workflow
            </Link>
          </div>
        </div>
      ) : view === "table" ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm shadow-black/[0.02]">
          <div className={cn("hidden items-center gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground lg:grid", columns)}>
            <input
              type="checkbox"
              aria-label="Select all workflows"
              checked={allVisibleSelected}
              onChange={() =>
                setSelected(allVisibleSelected ? new Set() : new Set(visible.map((workflow) => workflow.id)))
              }
              className="size-4 accent-[var(--primary)]"
            />
            {sortHeader("name", "Name")}
            <span>Description</span>
            <span>Status</span>
            <span>Trigger</span>
            {sortHeader("runs", "Runs", "right")}
            {sortHeader("success", "Success")}
            {sortHeader("updated", "Updated")}
            <span />
          </div>
          <ul className="divide-y divide-border">
            {visible.map((workflow) => (
              <li
                key={workflow.id}
                className={cn(
                  "group relative grid grid-cols-[28px_1fr_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3.5 transition-colors hover:bg-muted/50 has-[[aria-expanded=true]]:z-20 sm:px-5",
                  columns,
                  selected.has(workflow.id) && "bg-primary-soft/40",
                )}
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${workflow.name}`}
                  checked={selected.has(workflow.id)}
                  onChange={() => toggle(workflow.id)}
                  className="relative z-10 size-4 accent-[var(--primary)]"
                />
                <div className="flex min-w-0 items-center gap-3">
                  <AgentAvatar icon={workflow.icon} color={workflow.color} size="sm" />
                  <div className="min-w-0">
                    <Link
                      href={`/workflows/${workflow.id}/builder`}
                      className="block truncate text-sm font-semibold outline-none after:absolute after:inset-0 group-hover:text-primary focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                    >
                      {workflow.name}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {workflow.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                      <span className="text-[10px] text-subtle-foreground lg:hidden">· {workflow.runs} runs</span>
                    </div>
                  </div>
                </div>
                <p className="hidden truncate text-sm text-muted-foreground lg:block">{workflow.description}</p>
                <div className="hidden lg:block">
                  <WorkflowStatusBadge status={workflow.status} />
                </div>
                <TriggerLabel trigger={workflow.trigger} className="max-lg:hidden" />
                <span className="hidden text-right text-sm font-medium tabular-nums lg:block">{workflow.runs}</span>
                <span className="hidden lg:block">
                  <SuccessMeter value={workflow.successRate} runs={workflow.runs} />
                </span>
                <span className="hidden text-xs text-muted-foreground lg:block">
                  <RelativeTime iso={workflow.updatedAt} />
                </span>
                <div className="relative z-10 col-start-3 row-start-1 flex items-center justify-end gap-1 lg:col-start-auto lg:row-start-auto">
                  <span className="lg:hidden">
                    <WorkflowStatusBadge status={workflow.status} />
                  </span>
                  <button
                    type="button"
                    onClick={() => runNow(workflow)}
                    disabled={!canRun(workflow)}
                    aria-label={`Run ${workflow.name} now`}
                    title={canRun(workflow) ? "Run now" : "Publish the workflow to run it"}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-primary-soft hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Play size={14} className="fill-current" />
                  </button>
                  <DropdownMenu label={`Actions for ${workflow.name}`} items={menuItems(workflow)} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((workflow, index) => (
            <article
              key={workflow.id}
              className={cn(
                "group relative flex flex-col rounded-2xl border bg-card p-5 shadow-sm shadow-black/[0.02] transition-all duration-300 animate-fade-up hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 has-[[aria-expanded=true]]:z-20",
                selected.has(workflow.id) ? "border-primary/50" : "border-border",
              )}
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <AgentAvatar icon={workflow.icon} color={workflow.color} />
                <div className="relative z-10 flex items-center gap-1">
                  <WorkflowStatusBadge status={workflow.status} />
                  <input
                    type="checkbox"
                    aria-label={`Select ${workflow.name}`}
                    checked={selected.has(workflow.id)}
                    onChange={() => toggle(workflow.id)}
                    className="ml-1 size-4 accent-[var(--primary)]"
                  />
                  <DropdownMenu label={`Actions for ${workflow.name}`} items={menuItems(workflow)} />
                </div>
              </div>
              <h3 className="mt-4 truncate text-[15px] font-semibold">
                <Link href={`/workflows/${workflow.id}/builder`} className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
                  {workflow.name}
                </Link>
              </h3>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{workflow.description}</p>
              <TriggerLabel trigger={workflow.trigger} className="mt-3" />
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                {[
                  ["Runs", workflow.runs.toLocaleString("en-US")],
                  ["Success", workflow.runs ? `${workflow.successRate.toFixed(0)}%` : "—"],
                  ["Avg. time", workflow.runs ? formatDuration(workflow.avgDurationMs) : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col-reverse">
                    <dt className="text-[11px] text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-bold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="relative z-10 mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => runNow(workflow)}
                  disabled={!canRun(workflow)}
                  className={buttonVariants({ variant: "secondary", size: "sm", className: "flex-1" })}
                >
                  <Play size={13} className="fill-current" />
                  Run now
                </button>
                <Link href={`/workflows/${workflow.id}/builder`} className={buttonVariants({ size: "sm", className: "flex-1" })}>
                  Open builder
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {dialog}
    </div>
  );
}
