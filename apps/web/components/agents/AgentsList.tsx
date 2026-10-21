"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { LayoutGrid, List, Plus, Search, SearchX, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/Field";
import { toolsById } from "@/lib/agents/catalog";
import { useAgents } from "@/lib/agents/store";
import type { Agent, AgentStatus } from "@/lib/agents/types";
import { cn } from "@/lib/cn";
import { AgentCard, AgentRow, NewAgentCard } from "./AgentCard";
import { useAgentActions } from "./use-agent-actions";

type Filter = "all" | AgentStatus;
type Sort = "updated" | "name" | "runs";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];

const sorters: Record<Sort, (a: Agent, b: Agent) => number> = {
  updated: (a, b) => (b.lastRunAt ?? b.updatedAt).localeCompare(a.lastRunAt ?? a.updatedAt),
  name: (a, b) => a.name.localeCompare(b.name),
  runs: (a, b) => b.runs - a.runs,
};

function matches(agent: Agent, query: string) {
  if (!query) return true;
  const haystack = [
    agent.name,
    agent.description,
    ...agent.tools.map((id) => toolsById.get(id)?.name ?? ""),
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

export function AgentsList() {
  const agents = useAgents();
  const { menuItems, toggleActive, dialog } = useAgentActions();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("updated");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: agents.length, active: 0, inactive: 0, draft: 0, archived: 0 };
    agents.forEach((agent) => result[agent.status]++);
    return result;
  }, [agents]);

  const visible = useMemo(
    () =>
      agents
        .filter((agent) => (filter === "all" || agent.status === filter) && matches(agent, deferredQuery))
        .sort(sorters[sort]),
    [agents, filter, sort, deferredQuery],
  );

  const showCreateCard = filter === "all" && !deferredQuery;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 animate-fade-up sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Agents</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {counts.all} agents · {counts.active} live. Build, manage and monitor your AI agents.
          </p>
        </div>
        <Link href="/agents/new" className={buttonVariants({ className: "self-start sm:self-auto" })}>
          <Plus size={16} />
          Create Agent
        </Link>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filter agents by status"
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:pb-0"
        >
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
                  active
                    ? "bg-primary-soft text-primary-soft-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-md px-1.5 text-[11px] tabular-nums",
                    active ? "bg-card/70" : "bg-muted",
                  )}
                >
                  {counts[item.value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 lg:w-72 lg:flex-none">
            <Search size={15} className="shrink-0 text-subtle-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search agents or tools…"
              aria-label="Search agents"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="rounded p-0.5 text-subtle-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </label>

          <Select
            aria-label="Sort agents"
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            className="w-40 shrink-0 max-sm:hidden"
          >
            <option value="updated">Recently active</option>
            <option value="name">Name (A–Z)</option>
            <option value="runs">Most runs</option>
          </Select>

          <div role="radiogroup" aria-label="Layout" className="flex shrink-0 rounded-xl border border-border bg-muted p-1">
            {(
              [
                { value: "grid", label: "Grid view", icon: LayoutGrid },
                { value: "list", label: "List view", icon: List },
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
                  view === value
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 && !showCreateCard ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center animate-fade-in">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <SearchX size={22} />
          </span>
          <h2 className="mt-4 font-semibold">No agents found</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {deferredQuery
              ? `Nothing matches “${deferredQuery}”. Try another name or tool.`
              : "There are no agents with this status yet."}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-5" })}
          >
            Clear filters
          </button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((agent, index) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              index={index}
              menuItems={menuItems(agent)}
              onToggle={() => toggleActive(agent)}
            />
          ))}
          {showCreateCard && <NewAgentCard />}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm shadow-black/[0.02]">
          <div className="hidden grid-cols-[minmax(0,2.4fr)_110px_120px_90px_120px_auto] gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground md:grid">
            <span>Agent</span>
            <span>Status</span>
            <span>Tools</span>
            <span>Runs</span>
            <span>Last run</span>
            <span className="w-[72px]" />
          </div>
          <ul className="divide-y divide-border">
            {visible.map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                menuItems={menuItems(agent)}
                onToggle={() => toggleActive(agent)}
              />
            ))}
          </ul>
        </div>
      )}

      {dialog}
    </div>
  );
}
