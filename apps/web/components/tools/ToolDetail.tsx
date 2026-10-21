"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Check, CircleAlert, Info, PackageSearch, PlugZap, Send, ShieldCheck, Trash2 } from "lucide-react";
import { AgentAvatar } from "@/components/agents/AgentVisuals";
import { AgentPageSkeleton } from "@/components/agents/AgentNotFound";
import { ConfigField } from "@/components/agents/builder/ConfigField";
import { Card, CardHeader } from "@/components/dashboard/Card";
import { StepStatusIcon } from "@/components/runs/RunVisuals";
import { buttonVariants } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { textareaClass } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/PageKit";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Switch } from "@/components/ui/Switch";
import { useHydrated } from "@/components/ui/use-hydrated";
import { toolsById } from "@/lib/agents/catalog";
import type { NodeConfigValue } from "@/lib/agents/types";
import { cn } from "@/lib/cn";
import { formatCompact } from "@/lib/format";
import { formatDuration } from "@/lib/runs/format";
import { useRuns } from "@/lib/runs/store";
import { toast } from "@/lib/toast";
import { connectionFieldsFor, defaultConnectionConfig, resolveTool, type ResolvedTool } from "@/lib/tools/catalog";
import { isValidJson, validateConnection } from "@/lib/tools/connection";
import { toolStore, useToolInstall, useToolInstalls } from "@/lib/tools/store";
import type { CustomToolDefinition } from "@/lib/tools/types";
import { CustomToolForm, emptyCustomTool } from "./CustomToolForm";
import { TestPanel } from "./TestPanel";
import { PublisherLine, RatingLine, ToolIcon, ToolStatusBadge } from "./ToolVisuals";
import { useConnectionTest } from "./use-connection-test";
import { useToolActions, useToolUsage } from "./use-tool-actions";

export function ToolDetailPage({ id }: { id: string }) {
  const hydrated = useHydrated();
  const install = useToolInstall(id);
  const tool = resolveTool(id, install);

  if (!hydrated) return <AgentPageSkeleton />;
  if (!tool) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="Tool not found"
        description="It may have been deleted, or the link is incorrect."
        action={
          <Link href="/tools" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <ArrowLeft size={14} />
            Back to tools
          </Link>
        }
      />
    );
  }
  return <ToolDetail key={tool.id} tool={tool} />;
}

function ToolDetail({ tool }: { tool: ResolvedTool }) {
  const router = useRouter();
  const { install: installTool, setEnabled, requestRemove, dialog } = useToolActions();
  const install = tool.install;

  return (
    <div className="space-y-6">
      <header className="space-y-4 animate-fade-up">
        <Breadcrumbs items={[{ label: "Tools", href: install ? "/tools" : "/tools?tab=marketplace" }, { label: tool.name }]} />
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-start gap-4">
            <ToolIcon tool={tool} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{tool.name}</h1>
                <ToolStatusBadge tool={tool} />
              </div>
              <PublisherLine tool={tool} />
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{tool.description}</p>
            </div>
          </div>
          {install ? (
            <div className="flex shrink-0 items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Switch checked={install.enabled} onCheckedChange={(enabled) => setEnabled(tool, enabled)} label={`${tool.name} enabled`} />
                {install.enabled ? "Enabled" : "Disabled"}
              </label>
              <DropdownMenu
                label={`More actions for ${tool.name}`}
                items={[
                  { label: tool.isCustom ? "Delete tool" : "Uninstall", icon: Trash2, danger: true, onSelect: () => requestRemove(tool) },
                ]}
              />
            </div>
          ) : (
            <button type="button" onClick={() => installTool(tool.id)} className={buttonVariants({ className: "shrink-0" })}>
              <PlugZap size={16} />
              Install {tool.name}
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {!install ? (
            <MarketplaceOverview tool={tool} onInstall={() => installTool(tool.id)} />
          ) : tool.isCustom ? (
            <CustomToolSections tool={tool} />
          ) : (
            <ConnectionSection tool={tool} />
          )}
        </div>
        <aside className="space-y-6">
          <AboutCard tool={tool} />
          {install && <UsageCard tool={tool} />}
          <UsedByCard toolId={tool.id} />
          {install && <RecentCallsCard toolId={tool.id} onOpen={(href) => router.push(href)} />}
        </aside>
      </div>
      {dialog}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Catalog tool: connection settings + test
 * ------------------------------------------------------------------------ */

function ConnectionSection({ tool }: { tool: ResolvedTool }) {
  const install = tool.install!;
  const fields = connectionFieldsFor(tool);
  const initial = useMemo(() => ({ ...defaultConnectionConfig(fields), ...install.config }), [fields, install.config]);
  const [values, setValues] = useState<Record<string, NodeConfigValue>>(initial);
  const [submitted, setSubmitted] = useState(false);
  const test = useConnectionTest(tool.id, tool.name);
  const errors = validateConnection(fields, values);
  const shown = submitted ? errors : {};
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  const saveAndTest = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) {
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    if (dirty) toolStore.saveConfig(tool.id, values);
    const outcome = await test.run(values);
    if (!outcome) return;
    toast(
      outcome.ok
        ? { title: `${tool.name} connected`, description: dirty ? "Settings saved and verified." : outcome.message }
        : { tone: "error", title: `${tool.name} couldn't connect`, description: outcome.message },
    );
  };

  return (
    <>
      {install.enabled && install.status === "error" && !test.running && !test.result && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4">
          <CircleAlert size={18} className="mt-0.5 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-danger">Connection failing</p>
            <p className="mt-0.5 text-sm text-foreground/80">{install.error}</p>
          </div>
        </div>
      )}
      {install.status === "needs_setup" && !test.result && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <Info size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>Fill in the required settings below, then <strong>Save &amp; test</strong> to connect {tool.name}.</p>
        </div>
      )}

      <Card>
        <CardHeader title="Connection" subtitle="Credentials stay in your browser in this demo — nothing is sent anywhere." />
        {fields.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            <Check size={16} className="text-success" />
            No configuration needed — this tool runs inside AgentFlow.
          </p>
        ) : (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void saveAndTest();
            }}
            className="grid gap-5 md:grid-cols-2"
          >
            {fields.map((field) => (
              <div key={field.key} className={cn((field.type === "textarea" || field.type === "switch") && "md:col-span-2")}>
                <ConfigField
                  idPrefix={`conn-${tool.id}`}
                  field={field}
                  value={values[field.key]}
                  onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
                  error={shown[field.key]}
                  required={field.required}
                />
              </div>
            ))}
            <button type="submit" className="sr-only">
              Save and test
            </button>
          </form>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
          {dirty && (
            <button
              type="button"
              onClick={() => {
                setValues(initial);
                setSubmitted(false);
              }}
              className={buttonVariants({ variant: "ghost" })}
            >
              Discard changes
            </button>
          )}
          <button type="button" onClick={() => void saveAndTest()} disabled={test.running} className={buttonVariants({ className: "min-w-40" })}>
            <PlugZap size={16} />
            {test.running ? "Testing…" : dirty ? "Save & test" : "Test connection"}
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Connection test"
          subtitle={install.lastTestedAt ? <>Last tested <RelativeTime iso={install.lastTestedAt} /></> : "Not tested yet"}
        />
        <TestPanel steps={test.steps} result={test.result} running={test.running} />
        <p className="mt-4 text-xs text-subtle-foreground">
          Demo tip: values containing “invalid” fail DNS, port 9999 times out, and credentials containing “expired” are rejected.
        </p>
      </Card>
    </>
  );
}

/* --------------------------------------------------------------------------
 * Custom tool: definition + test request
 * ------------------------------------------------------------------------ */

function exampleInput(schema: string) {
  try {
    const parsed = JSON.parse(schema) as { properties?: Record<string, { type?: string }> };
    const entries = Object.entries(parsed.properties ?? {}).map(([key, prop]) => [
      key,
      prop.type === "number" || prop.type === "integer" ? 42 : prop.type === "boolean" ? true : key === "email" ? "jane@acme.com" : `example ${key}`,
    ]);
    return JSON.stringify(Object.fromEntries(entries), null, 2);
  } catch {
    return "{}";
  }
}

function CustomToolSections({ tool }: { tool: ResolvedTool }) {
  const install = tool.install!;
  const definition = install.custom!;
  const installs = useToolInstalls();
  const otherNames = useMemo(
    () => installs.filter((item) => item.id !== tool.id).map((item) => resolveTool(item.id, item)?.name ?? ""),
    [installs, tool.id],
  );
  const [input, setInput] = useState(() => exampleInput(definition.inputSchema));
  const [inputError, setInputError] = useState<string | null>(null);
  const test = useConnectionTest(tool.id, tool.name);

  const sendTest = async () => {
    if (!isValidJson(input)) {
      setInputError("Test input must be valid JSON.");
      return;
    }
    setInputError(null);
    const outcome = await test.run({ endpoint: definition.endpoint, auth: definition.authValue });
    if (outcome?.ok) toast({ title: "Test request succeeded", description: `${definition.method} ${definition.endpoint} → 200 OK` });
    else if (outcome) toast({ tone: "error", title: "Test request failed", description: outcome.message });
  };

  const result =
    test.result && test.result.ok
      ? {
          ...test.result,
          sample: JSON.stringify(
            {
              request: { method: definition.method, url: definition.endpoint, body: JSON.parse(input) as unknown },
              response: { status: 200, body: { ok: true, data: { id: "cus_8f2k", match: true } } },
            },
            null,
            2,
          ),
        }
      : test.result;

  return (
    <>
      {install.status !== "connected" && !test.result && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <Info size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            {install.status === "error" ? install.error : "Send a successful test request to mark this tool as connected."}
          </p>
        </div>
      )}
      <Card>
        <CardHeader title="Test request" subtitle="Simulated — no request leaves your browser." />
        <label htmlFor="custom-test-input" className="mb-1.5 block text-sm font-medium">
          Input arguments (JSON)
        </label>
        <textarea
          id="custom-test-input"
          rows={5}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          aria-invalid={inputError ? true : undefined}
          spellCheck={false}
          className={cn(textareaClass, "font-mono text-xs")}
        />
        {inputError && <p className="mt-1.5 text-xs font-medium text-danger">{inputError}</p>}
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={() => void sendTest()} disabled={test.running} className={buttonVariants()}>
            <Send size={15} />
            {test.running ? "Sending…" : "Send test request"}
          </button>
        </div>
        {(test.running || result) && (
          <div className="mt-5 border-t border-border pt-5">
            <TestPanel steps={test.steps} result={result} running={test.running} />
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Definition" subtitle="How agents see and call this tool" />
        <CustomToolForm
          initial={definition}
          otherNames={otherNames}
          submitLabel="Save changes"
          requireChanges
          onSubmit={(next) => {
            const connectionChanged = next.endpoint !== definition.endpoint || next.authValue !== definition.authValue || next.authType !== definition.authType;
            toolStore.update(tool.id, { custom: next, ...(connectionChanged ? { status: "needs_setup" as const, error: undefined } : {}) });
            test.reset();
            toast({ title: "Tool updated", description: connectionChanged ? "Connection details changed — send a test request." : `${next.name} was saved.` });
          }}
        />
      </Card>
    </>
  );
}

/* --------------------------------------------------------------------------
 * Not installed: marketplace overview
 * ------------------------------------------------------------------------ */

function MarketplaceOverview({ tool, onInstall }: { tool: ResolvedTool; onInstall: () => void }) {
  const definition = toolsById.get(tool.id);
  const fields = connectionFieldsFor(tool);
  return (
    <>
      <Card>
        <CardHeader title="What your agents can do" />
        <ul className="grid gap-2 sm:grid-cols-2">
          {(definition?.fields ?? []).map((field) => (
            <li key={field.key} className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
              <Check size={14} className="shrink-0 text-primary" />
              Configure <span className="font-medium">{field.label.toLowerCase()}</span> per step
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Permissions" subtitle="What this tool is allowed to access once connected" />
        <ul className="space-y-2">
          {(tool.meta?.permissions ?? []).map((permission) => (
            <li key={permission} className="flex items-center gap-2 text-sm">
              <ShieldCheck size={15} className="text-success" />
              {permission}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-primary/20 bg-primary-soft/50 p-4 sm:flex-row sm:items-center">
          <p className="text-sm">
            {fields.some((field) => field.required)
              ? `Requires ${fields.filter((field) => field.required).map((field) => field.label.toLowerCase()).join(", ")}.`
              : "No setup needed — works right after installing."}
          </p>
          <button type="button" onClick={onInstall} className={buttonVariants({ size: "sm", className: "shrink-0" })}>
            <PlugZap size={14} />
            Install
          </button>
        </div>
      </Card>
    </>
  );
}

/* --------------------------------------------------------------------------
 * Side cards
 * ------------------------------------------------------------------------ */

function AboutCard({ tool }: { tool: ResolvedTool }) {
  const install = tool.install;
  const rows: [string, ReactNode][] = [
    ["Category", tool.category],
    ...(tool.meta
      ? ([
          ["Publisher", tool.meta.publisher],
          ["Version", `v${tool.meta.version}`],
          ["Pricing", tool.meta.pricing],
        ] as [string, ReactNode][])
      : []),
    ...(install ? ([["Installed", <RelativeTime key="installed" iso={install.installedAt} />]] as [string, ReactNode][]) : []),
    ...(tool.install?.custom ? ([["Endpoint", <span key="endpoint" className="break-all font-mono text-xs">{tool.install.custom.method} {tool.install.custom.endpoint}</span>]] as [string, ReactNode][]) : []),
  ];
  return (
    <Card>
      <CardHeader title="About" />
      {tool.meta && <RatingLine tool={tool} />}
      <dl className="mt-4 space-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function UsageCard({ tool }: { tool: ResolvedTool }) {
  const install = tool.install!;
  const tiles = [
    ["Calls (7d)", formatCompact(install.calls7d)],
    ["Avg. latency", install.avgLatencyMs ? (install.avgLatencyMs < 1000 ? `${install.avgLatencyMs} ms` : `${(install.avgLatencyMs / 1000).toFixed(1)} s`) : "—"],
    ["Error rate", install.calls7d ? `${install.errorRate}%` : "—"],
  ];
  return (
    <Card>
      <CardHeader title="Usage" subtitle="Last 7 days" />
      <dl className="grid grid-cols-3 gap-2 text-center">
        {tiles.map(([label, value]) => (
          <div key={label} className="flex flex-col-reverse rounded-xl bg-muted/60 px-1 py-3">
            <dt className="text-[11px] text-muted-foreground">{label}</dt>
            <dd className={cn("text-base font-bold tabular-nums", label === "Error rate" && install.errorRate > 5 && "text-danger")}>{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function UsedByCard({ toolId }: { toolId: string }) {
  const { agents, workflows } = useToolUsage(toolId);
  return (
    <Card>
      <CardHeader title="Used by" subtitle={`${agents.length} agents · ${workflows.length} workflows`} />
      {agents.length + workflows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not used yet. Add it to an agent in the agent setup or builder.</p>
      ) : (
        <ul className="space-y-1">
          {[...agents.map((agent) => ({ ...agent, href: `/agents/${agent.id}/builder`, kind: "Agent" })), ...workflows.map((workflow) => ({ ...workflow, href: `/workflows/${workflow.id}/builder`, kind: "Workflow" }))].map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <Link href={item.href} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/60">
                <AgentAvatar icon={item.icon} color={item.color} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{item.kind}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecentCallsCard({ toolId, onOpen }: { toolId: string; onOpen: (href: string) => void }) {
  const runs = useRuns();
  const calls = useMemo(
    () =>
      runs
        .flatMap((run) => run.steps.filter((step) => step.toolId === toolId && step.status !== "pending").map((step) => ({ run, step })))
        .slice(0, 6),
    [runs, toolId],
  );
  return (
    <Card>
      <CardHeader title="Recent calls" subtitle="From your run history" />
      {calls.length === 0 ? (
        <p className="text-sm text-muted-foreground">No calls recorded yet.</p>
      ) : (
        <ul className="space-y-1">
          {calls.map(({ run, step }) => (
            <li key={`${run.id}-${step.id}`}>
              <button
                type="button"
                onClick={() => onOpen(`/runs/${run.id}?tab=steps`)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted/60"
              >
                <StepStatusIcon status={step.status} className="size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{run.source.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {run.id} · <RelativeTime iso={run.startedAt} />
                  </span>
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">{formatDuration(step.durationMs)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* --------------------------------------------------------------------------
 * New custom tool
 * ------------------------------------------------------------------------ */

export function NewCustomToolPage() {
  const router = useRouter();
  const installs = useToolInstalls();
  const otherNames = useMemo(() => installs.map((item) => resolveTool(item.id, item)?.name ?? ""), [installs]);
  const [preview, setPreview] = useState<CustomToolDefinition>(emptyCustomTool);

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <Breadcrumbs items={[{ label: "Tools", href: "/tools" }, { label: "Custom tool" }]} />
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-[28px]">Build a custom tool</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Wrap any HTTP API so your agents can call it like a built-in tool.</p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CustomToolForm
            initial={emptyCustomTool}
            otherNames={otherNames}
            submitLabel="Create tool"
            onCancel={() => router.push("/tools")}
            onValuesChange={setPreview}
            onSubmit={(definition) => {
              const created = toolStore.createCustom(definition);
              toast({ title: `${definition.name} created`, description: "Send a test request to connect it." });
              router.push(`/tools/${created.id}`);
            }}
          />
        </Card>
        <aside className="space-y-6 xl:sticky xl:top-24 xl:h-fit">
          <Card>
            <CardHeader title="How agents see it" />
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
              <p className="font-mono text-sm font-semibold">{preview.name.trim() || "your_tool_name"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{preview.description.trim() || "Your description tells agents when to use this tool."}</p>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              {[
                "Agents choose tools by their name and description.",
                "The JSON schema defines which arguments they must pass.",
                "Test the tool before adding it to an agent.",
              ].map((tip) => (
                <li key={tip} className="flex gap-2">
                  <Check size={15} className="mt-0.5 shrink-0 text-primary" />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
