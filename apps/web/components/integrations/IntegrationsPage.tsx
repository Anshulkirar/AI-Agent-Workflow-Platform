"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Activity,
  ChartNoAxesCombined,
  CircleAlert,
  FlaskConical,
  Info,
  Lightbulb,
  PackageSearch,
  PlugZap,
  Settings2,
  Store,
  TriangleAlert,
  Unplug,
  Wrench,
} from "lucide-react";
import { ToolIcon } from "@/components/tools/ToolVisuals";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Select } from "@/components/ui/Field";
import { EmptyState, FilterTabs, SearchInput, StatTile } from "@/components/ui/PageKit";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { toolsById } from "@/lib/agents/catalog";
import { cn } from "@/lib/cn";
import { formatCompact } from "@/lib/format";
import {
  accountLabel,
  authLabels,
  integrationCategories,
  integrations,
  integrationsById,
  type IntegrationCategory,
  type IntegrationDefinition,
} from "@/lib/integrations/catalog";
import { useConnections } from "@/lib/integrations/store";
import type { IntegrationConnection } from "@/lib/integrations/types";
import { IntegrationSheet } from "./IntegrationSheet";
import { IntegrationStatusBadge, useDisconnect, useToolDemand } from "./use-integration-actions";

type StatusFilter = "all" | "connected" | "attention" | "available";
type Sort = "popular" | "name";
type SheetState = { id: string; autoTest: boolean; open: boolean; nonce: number };

const needsAttention = (connection?: IntegrationConnection) => connection !== undefined && connection.status !== "connected";

export function IntegrationsPage({ initialOpen, initialCategory }: { initialOpen?: string; initialCategory?: string }) {
  const connections = useConnections();
  const demand = useToolDemand();
  const disconnect = useDisconnect();
  const [query, setQuery] = useState("");
  const term = useDeferredValue(query.trim().toLowerCase());
  const [category, setCategory] = useState<IntegrationCategory | "All">(
    integrationCategories.find((item) => item === initialCategory) ?? "All",
  );
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<Sort>("popular");
  const [sheet, setSheet] = useState<SheetState | null>(
    initialOpen && integrationsById.has(initialOpen) ? { id: initialOpen, autoTest: false, open: true, nonce: 0 } : null,
  );

  const byId = useMemo(() => new Map(connections.map((connection) => [connection.id, connection])), [connections]);

  const openSheet = (id: string, autoTest = false) => setSheet((current) => ({ id, autoTest, open: true, nonce: (current?.nonce ?? 0) + 1 }));

  const counts = {
    all: integrations.length,
    connected: integrations.filter((item) => byId.get(item.id)?.status === "connected").length,
    attention: integrations.filter((item) => needsAttention(byId.get(item.id))).length,
    available: integrations.filter((item) => !byId.has(item.id)).length,
  };
  const requests = connections.reduce((sum, connection) => sum + connection.requests7d, 0);

  const statusMatch = (item: IntegrationDefinition) => {
    const connection = byId.get(item.id);
    if (status === "connected") return connection?.status === "connected";
    if (status === "attention") return needsAttention(connection);
    if (status === "available") return !connection;
    return true;
  };

  const searchable = (item: IntegrationDefinition) =>
    `${item.name} ${item.description} ${item.publisher} ${item.category} ${item.features.join(" ")}`.toLowerCase();

  const visible = integrations
    .filter((item) => (category === "All" || item.category === category) && statusMatch(item) && (!term || searchable(item).includes(term)))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : Number(Boolean(b.popular)) - Number(Boolean(a.popular))));

  const groups = integrationCategories
    .map((name) => ({ name, items: visible.filter((item) => item.category === name) }))
    .filter((group) => group.items.length > 0);

  const categoryCount = (name: IntegrationCategory | "All") =>
    integrations.filter((item) => (name === "All" || item.category === name) && statusMatch(item)).length;

  // Tools agents depend on that no connection powers yet. A failing connection
  // is surfaced under "needs attention" instead of suggesting an alternative.
  const recommended = integrations
    .filter((item) => !byId.has(item.id) && item.toolIds.length > 0)
    .map((item) => {
      const covered = item.toolIds.every((toolId) => integrations.some((other) => other.toolIds.includes(toolId) && byId.has(other.id)));
      const users = Math.max(0, ...item.toolIds.map((toolId) => demand.get(toolId) ?? 0));
      return { item, covered, users };
    })
    .filter((entry) => !entry.covered && entry.users > 0)
    .sort((a, b) => b.users - a.users || Number(Boolean(b.item.popular)) - Number(Boolean(a.item.popular)))
    .slice(0, 3);

  const attention = integrations.filter((item) => needsAttention(byId.get(item.id)));
  const filtered = Boolean(term) || category !== "All" || status !== "all";

  const clearFilters = () => {
    setQuery("");
    setCategory("All");
    setStatus("all");
  };

  const sheetDefinition = sheet ? integrationsById.get(sheet.id) : undefined;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 animate-fade-up sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Integrations</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Connect the models, apps and data sources your agents and workflows rely on.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Link href="/tools" className={buttonVariants({ variant: "secondary" })}>
            <Wrench size={16} />
            Manage tools
          </Link>
          <button type="button" onClick={() => openSheet("rest-api")} className={buttonVariants()}>
            <PlugZap size={16} />
            Connect an API
          </button>
        </div>
      </header>

      <p className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary-soft/50 px-4 py-3 text-sm text-foreground/80 animate-fade-up">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <span>
          <strong className="font-semibold text-foreground">Demo workspace:</strong> connections, OAuth consent and tests are simulated in your browser. No credentials are sent to
          any third-party service.
        </span>
      </p>

      <section aria-label="Integration statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile index={0} label="Connected" value={counts.connected} icon={PlugZap} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatTile
          index={1}
          label="Needs attention"
          value={counts.attention}
          icon={TriangleAlert}
          tone={counts.attention ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"}
        />
        <StatTile index={2} label="Available" value={counts.available} icon={Store} tone="bg-primary-soft text-primary-soft-foreground" />
        <StatTile index={3} label="Requests (7 days)" value={formatCompact(requests)} icon={Activity} tone="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
      </section>

      {!filtered && (attention.length > 0 || recommended.length > 0) && (
        <div className={cn("grid gap-4", attention.length > 0 && recommended.length > 0 && "xl:grid-cols-2")}>
          {attention.length > 0 && (
            <section aria-labelledby="attention-title" className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 animate-fade-up">
              <h2 id="attention-title" className="flex items-center gap-2 text-sm font-semibold">
                <CircleAlert size={16} className="text-amber-600 dark:text-amber-400" />
                {attention.length} connection{attention.length === 1 ? " needs" : "s need"} attention
              </h2>
              <ul className="mt-3 space-y-2">
                {attention.map((item) => {
                  const connection = byId.get(item.id)!;
                  return (
                    <li key={item.id} className="flex items-center gap-3 rounded-xl bg-card p-2.5 ring-1 ring-border">
                      <ToolIcon tool={item} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{connection.status === "error" ? connection.error : "Setup isn't finished — credentials missing."}</p>
                      </div>
                      <button type="button" onClick={() => openSheet(item.id)} className={buttonVariants({ variant: "secondary", size: "sm", className: "h-8 shrink-0" })}>
                        {connection.status === "error" ? "Fix" : "Finish setup"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {recommended.length > 0 && (
            <section aria-labelledby="recommended-title" className="rounded-2xl border border-border bg-linear-to-br from-primary-soft/60 to-card p-4 animate-fade-up">
              <h2 id="recommended-title" className="flex items-center gap-2 text-sm font-semibold">
                <Lightbulb size={16} className="text-primary" />
                Recommended for your agents
              </h2>
              <ul className="mt-3 space-y-2">
                {recommended.map(({ item, users }) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-xl bg-card p-2.5 ring-1 ring-border">
                    <ToolIcon tool={item} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Powers {item.toolIds.map((id) => toolsById.get(id)?.name ?? id).join(", ")} · used by {users} agent{users === 1 ? "" : "s"}/workflow{users === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button type="button" onClick={() => openSheet(item.id)} className={buttonVariants({ size: "sm", className: "h-8 shrink-0" })}>
                      Connect
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <FilterTabs
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "connected", label: "Connected", count: counts.connected, dot: "bg-success" },
              { value: "attention", label: "Needs attention", count: counts.attention, dot: "bg-amber-500" },
              { value: "available", label: "Available", count: counts.available, dot: "bg-subtle-foreground" },
            ]}
          />
          <div className="flex gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search integrations…" label="Search integrations" className="flex-1 lg:w-72" />
            <Select aria-label="Sort integrations" value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="w-36 shrink-0">
              <option value="popular">Popular first</option>
              <option value="name">Name A–Z</option>
            </Select>
          </div>
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by category">
          {(["All", ...integrationCategories] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                category === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {item}
              <span className={cn("tabular-nums", category === item ? "text-primary-foreground/80" : "text-subtle-foreground")}>{categoryCount(item)}</span>
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No integrations match"
          description="Try a different search, category or status — or connect any HTTP API directly."
          action={
            <>
              <button type="button" onClick={clearFilters} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Clear filters
              </button>
              <button type="button" onClick={() => openSheet("rest-api")} className={buttonVariants({ size: "sm" })}>
                <PlugZap size={14} />
                Connect an API
              </button>
            </>
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.name} aria-labelledby={`group-${group.name}`}>
              <h2 id={`group-${group.name}`} className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
                {group.name}
                <span className="text-xs font-medium text-subtle-foreground">{group.items.length}</span>
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {group.items.map((item, index) => (
                  <IntegrationCard
                    key={item.id}
                    definition={item}
                    connection={byId.get(item.id)}
                    index={index}
                    onOpen={(autoTest) => openSheet(item.id, autoTest)}
                    onDisconnect={() => disconnect.request(item)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {sheet && sheetDefinition && (
        <IntegrationSheet
          key={`${sheet.id}-${sheet.nonce}`}
          definition={sheetDefinition}
          connection={byId.get(sheet.id)}
          open={sheet.open}
          autoTest={sheet.autoTest}
          onOpenChange={(open) => setSheet((current) => (current ? { ...current, open } : current))}
          onDisconnect={() => {
            setSheet((current) => (current ? { ...current, open: false } : current));
            disconnect.request(sheetDefinition);
          }}
        />
      )}
      {disconnect.dialog}
    </div>
  );
}

function IntegrationCard({
  definition,
  connection,
  index,
  onOpen,
  onDisconnect,
}: {
  definition: IntegrationDefinition;
  connection?: IntegrationConnection;
  index: number;
  onOpen: (autoTest?: boolean) => void;
  onDisconnect: () => void;
}) {
  const router = useRouter();
  const poweredTools = definition.toolIds.flatMap((id) => toolsById.get(id)?.name ?? []);

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card p-5 shadow-sm shadow-black/[0.02] transition-all duration-300 animate-fade-up hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 has-[[aria-expanded=true]]:z-20",
        connection?.status === "error" ? "border-danger/40" : "border-border hover:border-primary/40",
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex items-start gap-3">
        <ToolIcon tool={definition} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 font-semibold">
            <button
              type="button"
              onClick={() => onOpen()}
              className="truncate text-left outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {definition.name}
            </button>
            {definition.isNew && <span className="shrink-0 rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-soft-foreground">New</span>}
            {definition.popular && !connection && (
              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Popular</span>
            )}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {definition.publisher} · {authLabels[definition.auth]}
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-1">
          <IntegrationStatusBadge connection={connection} />
          {connection && (
            <DropdownMenu
              label={`Actions for ${definition.name}`}
              items={[
                { label: "Configure", icon: Settings2, onSelect: () => onOpen() },
                { label: "Test connection", icon: FlaskConical, onSelect: () => onOpen(true) },
                { label: "View analytics", icon: ChartNoAxesCombined, onSelect: () => router.push("/analytics") },
                "separator",
                { label: "Disconnect", icon: Unplug, danger: true, onSelect: onDisconnect },
              ]}
            />
          )}
        </div>
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{definition.description}</p>

      {connection && connection.status !== "connected" && (
        <p
          className={cn(
            "mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs",
            connection.status === "error" ? "bg-danger-soft text-danger" : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
          )}
        >
          <CircleAlert size={14} className="mt-px shrink-0" />
          <span className="line-clamp-2">{connection.status === "error" ? connection.error : "Finish setup to start using this integration."}</span>
        </p>
      )}

      <div className="mb-4 mt-3 flex flex-wrap gap-1.5">
        {(poweredTools.length ? poweredTools.map((name) => `Powers ${name}`) : definition.modelProvider ? [`${definition.modelProvider} models`] : definition.features.slice(0, 2)).map(
          (chip) => (
            <span key={chip} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {chip}
            </span>
          ),
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {connection ? (
            <>
              <span className="font-medium text-foreground">{accountLabel(definition, connection)}</span>
              {connection.lastSyncAt && (
                <>
                  {" · "}synced <RelativeTime iso={connection.lastSyncAt} />
                </>
              )}
            </>
          ) : (
            definition.category
          )}
        </p>
        <button
          type="button"
          onClick={() => onOpen()}
          className={buttonVariants({
            variant: connection?.status === "connected" ? "secondary" : "primary",
            size: "sm",
            className: "relative z-10 h-8 shrink-0",
          })}
        >
          {!connection ? (
            <>
              <PlugZap size={14} />
              Connect
            </>
          ) : connection.status === "connected" ? (
            <>
              <Settings2 size={14} />
              Configure
            </>
          ) : connection.status === "error" ? (
            "Fix connection"
          ) : (
            "Finish setup"
          )}
        </button>
      </div>
    </article>
  );
}
