"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Activity,
  Check,
  CircleAlert,
  PackageSearch,
  Plug,
  PlugZap,
  Plus,
  Settings2,
  Store,
  Trash2,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { EmptyState, FilterTabs, SearchInput, StatTile } from "@/components/ui/PageKit";
import { Switch } from "@/components/ui/Switch";
import { toolCategories } from "@/lib/agents/catalog";
import { cn } from "@/lib/cn";
import { formatCompact } from "@/lib/format";
import { marketplaceTools, resolveTool, type ResolvedTool } from "@/lib/tools/catalog";
import { useToolInstalls } from "@/lib/tools/store";
import { PublisherLine, RatingLine, ToolIcon, ToolStatusBadge } from "./ToolVisuals";
import { useToolActions, useToolUsage } from "./use-tool-actions";

type View = "installed" | "marketplace";
type StatusFilter = "all" | "connected" | "attention" | "disabled";

function matches(tool: ResolvedTool, term: string, category: string) {
  return (
    (category === "All" || tool.category === category) &&
    (!term || `${tool.name} ${tool.description} ${tool.meta?.publisher ?? ""}`.toLowerCase().includes(term))
  );
}

export function ToolsPage({ initialView = "installed" }: { initialView?: View }) {
  const installs = useToolInstalls();
  const { install, setEnabled, requestRemove, dialog } = useToolActions();
  const [view, setViewState] = useState<View>(initialView);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const term = useDeferredValue(query.trim().toLowerCase());

  const setView = (next: View) => {
    setViewState(next);
    const url = new URL(window.location.href);
    if (next === "installed") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };

  const installed = useMemo(
    () => installs.map((item) => resolveTool(item.id, item)).filter((tool): tool is ResolvedTool => tool !== null),
    [installs],
  );
  const installedIds = new Set(installs.map((item) => item.id));
  const marketplace = useMemo(
    () => marketplaceTools.map((tool) => resolveTool(tool.id, installs.find((item) => item.id === tool.id))!),
    [installs],
  );

  const needsAttention = (tool: ResolvedTool) => tool.install?.enabled && tool.install.status !== "connected";
  const counts = {
    all: installed.length,
    connected: installed.filter((tool) => tool.install?.enabled && tool.install.status === "connected").length,
    attention: installed.filter(needsAttention).length,
    disabled: installed.filter((tool) => !tool.install?.enabled).length,
  };

  const visibleInstalled = installed.filter(
    (tool) =>
      matches(tool, term, category) &&
      (status === "all" ||
        (status === "connected" && tool.install?.enabled && tool.install.status === "connected") ||
        (status === "attention" && needsAttention(tool)) ||
        (status === "disabled" && !tool.install?.enabled)),
  );
  const visibleMarket = marketplace.filter((tool) => matches(tool, term, category));
  const featured = marketplace.filter((tool) => tool.meta?.featured);
  const categories = ["All", ...toolCategories.filter((item) => item !== "Custom" || view === "installed")];
  const totalCalls = installs.reduce((sum, item) => sum + item.calls7d, 0);

  const clearFilters = () => {
    setQuery("");
    setCategory("All");
    setStatus("all");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 animate-fade-up sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Tools</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Connect the APIs and services your agents can act with.</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button type="button" onClick={() => setView("marketplace")} className={buttonVariants({ variant: "secondary" })}>
            <Store size={16} />
            Browse marketplace
          </button>
          <Link href="/tools/new" className={buttonVariants()}>
            <Plus size={16} />
            Custom tool
          </Link>
        </div>
      </header>

      <section aria-label="Tool statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile index={0} label="Installed tools" value={installed.length} icon={Wrench} tone="bg-primary-soft text-primary-soft-foreground" />
        <StatTile index={1} label="Connected" value={counts.connected} icon={PlugZap} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatTile
          index={2}
          label="Needs attention"
          value={counts.attention}
          icon={TriangleAlert}
          tone={counts.attention ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"}
        />
        <StatTile index={3} label="Tool calls (7 days)" value={formatCompact(totalCalls)} icon={Activity} tone="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
      </section>

      <div className="flex flex-col gap-4 border-b border-border lg:flex-row lg:items-end lg:justify-between">
        <div role="tablist" aria-label="Tool views" className="flex gap-1">
          {(
            [
              { value: "installed", label: "Installed", count: installed.length, icon: Plug },
              { value: "marketplace", label: "Marketplace", count: marketplace.length, icon: Store },
            ] as const
          ).map((item) => {
            const active = view === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(item.value)}
                className={cn(
                  "relative flex items-center gap-2 px-3 pb-3 pt-1 text-sm font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon size={15} />
                {item.label}
                <span className={cn("rounded-md px-1.5 text-[11px] tabular-nums", active ? "bg-primary-soft" : "bg-muted")}>{item.count}</span>
                {active && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={view === "installed" ? "Search installed tools…" : "Search the marketplace…"}
          label="Search tools"
          className="mb-3 lg:w-80"
        />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by category">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                category === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        {view === "installed" && (
          <FilterTabs
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "connected", label: "Connected", count: counts.connected, dot: "bg-success" },
              { value: "attention", label: "Needs attention", count: counts.attention, dot: "bg-amber-500" },
              { value: "disabled", label: "Disabled", count: counts.disabled, dot: "bg-subtle-foreground" },
            ]}
          />
        )}
      </div>

      {view === "installed" ? (
        visibleInstalled.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={installed.length ? "No tools match" : "No tools installed yet"}
            description={installed.length ? "Try another search, category or status." : "Install tools from the marketplace or build a custom one."}
            action={
              <>
                {installed.length > 0 && (
                  <button type="button" onClick={clearFilters} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    Clear filters
                  </button>
                )}
                <button type="button" onClick={() => setView("marketplace")} className={buttonVariants({ size: "sm" })}>
                  <Store size={14} />
                  Browse marketplace
                </button>
              </>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visibleInstalled.map((tool, index) => (
              <InstalledToolCard
                key={tool.id}
                tool={tool}
                index={index}
                onToggle={(enabled) => setEnabled(tool, enabled)}
                onRemove={() => requestRemove(tool)}
              />
            ))}
            <Link
              href="/tools/new"
              className="group flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-5 text-center transition-all hover:border-primary/50 hover:bg-primary-soft/40"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground transition-transform group-hover:scale-110">
                <Plus size={20} />
              </span>
              <span className="text-sm font-semibold">Build a custom tool</span>
              <span className="max-w-[220px] text-xs text-muted-foreground">Wrap any HTTP API so your agents can call it.</span>
            </Link>
          </div>
        )
      ) : (
        <div className="space-y-6">
          {!term && category === "All" && (
            <section aria-label="Featured tools" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featured.map((tool) => (
                <Link
                  key={tool.id}
                  href={`/tools/${tool.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary-soft/70 to-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Featured</span>
                  <div className="mt-3 flex items-center gap-3">
                    <ToolIcon tool={tool} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{tool.name}</p>
                      <RatingLine tool={tool} compact />
                    </div>
                  </div>
                </Link>
              ))}
            </section>
          )}
          {visibleMarket.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="Nothing in the marketplace matches"
              description="Can't find what you need? Wrap any HTTP API as a custom tool."
              action={
                <Link href="/tools/new" className={buttonVariants({ size: "sm" })}>
                  <Plus size={14} />
                  Build a custom tool
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {visibleMarket.map((tool, index) => (
                <article
                  key={tool.id}
                  className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/[0.02] transition-all duration-300 animate-fade-up hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <ToolIcon tool={tool} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">
                        <Link href={`/tools/${tool.id}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
                          {tool.name}
                        </Link>
                      </h3>
                      <PublisherLine tool={tool} />
                    </div>
                    {installedIds.has(tool.id) ? (
                      <span className="relative z-10 inline-flex items-center gap-1 rounded-lg bg-success-soft px-2.5 py-1.5 text-xs font-semibold text-success">
                        <Check size={13} />
                        Installed
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => install(tool.id, { openAfter: true })}
                        className={buttonVariants({ size: "sm", className: "relative z-10 h-8" })}
                      >
                        Install
                      </button>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{tool.description}</p>
                  <div className="mt-4 border-t border-border pt-3">
                    <RatingLine tool={tool} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {dialog}
    </div>
  );
}

function InstalledToolCard({
  tool,
  index,
  onToggle,
  onRemove,
}: {
  tool: ResolvedTool;
  index: number;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
}) {
  const router = useRouter();
  const install = tool.install!;
  const { agents } = useToolUsage(tool.id);

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card p-5 shadow-sm shadow-black/[0.02] transition-all duration-300 animate-fade-up hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 has-[[aria-expanded=true]]:z-20",
        install.enabled && install.status === "error" ? "border-danger/40" : "border-border hover:border-primary/40",
        !install.enabled && "opacity-80",
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex items-start gap-3">
        <ToolIcon tool={tool} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">
            <Link href={`/tools/${tool.id}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
              {tool.name}
            </Link>
          </h3>
          <PublisherLine tool={tool} />
        </div>
        <div className="relative z-10 flex items-center gap-1">
          <ToolStatusBadge tool={tool} />
          <DropdownMenu
            label={`Actions for ${tool.name}`}
            items={[
              { label: "Configure", icon: Settings2, onSelect: () => router.push(`/tools/${tool.id}`) },
              "separator",
              { label: tool.isCustom ? "Delete tool" : "Uninstall", icon: Trash2, danger: true, onSelect: onRemove },
            ]}
          />
        </div>
      </div>

      <p className="mb-4 mt-3 line-clamp-2 text-sm leading-5 text-muted-foreground">{tool.description}</p>

      {install.enabled && install.status !== "connected" && (
        <p
          className={cn(
            "relative z-10 -mt-1 mb-4 flex items-start gap-2 rounded-xl px-3 py-2 text-xs",
            install.status === "error" ? "bg-danger-soft text-danger" : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
          )}
        >
          <CircleAlert size={14} className="mt-px shrink-0" />
          <span className="line-clamp-2">{install.status === "error" ? install.error : "Add credentials to connect this tool."}</span>
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{formatCompact(install.calls7d)}</span> calls / 7d
          {install.avgLatencyMs > 0 && <> · {install.avgLatencyMs < 1000 ? `${install.avgLatencyMs} ms` : `${(install.avgLatencyMs / 1000).toFixed(1)} s`}</>}
          {agents.length > 0 && <> · {agents.length} agent{agents.length === 1 ? "" : "s"}</>}
        </p>
        <Switch
          size="sm"
          checked={install.enabled}
          onCheckedChange={onToggle}
          label={`${tool.name} enabled`}
          className="relative z-10"
        />
      </div>
    </article>
  );
}
