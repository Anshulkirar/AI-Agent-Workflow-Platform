"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Activity, ArrowRight, CircleAlert, CircleCheck, Clock3, FlaskConical, Info, KeyRound, PlugZap, ShieldCheck, Unplug } from "lucide-react";
import { AgentAvatar } from "@/components/agents/AgentVisuals";
import { ConfigField } from "@/components/agents/builder/ConfigField";
import { TestPanel } from "@/components/tools/TestPanel";
import { ToolIcon } from "@/components/tools/ToolVisuals";
import { useConnectionTest } from "@/components/tools/use-connection-test";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dialog } from "@/components/ui/Dialog";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Switch } from "@/components/ui/Switch";
import { toolsById } from "@/lib/agents/catalog";
import type { NodeConfigValue } from "@/lib/agents/types";
import { cn } from "@/lib/cn";
import { formatCompact } from "@/lib/format";
import {
  accountLabel,
  authLabels,
  defaultIntegrationConfig,
  defaultScopes,
  webhookUrl,
  type IntegrationDefinition,
} from "@/lib/integrations/catalog";
import { integrationStore } from "@/lib/integrations/store";
import type { IntegrationConnection } from "@/lib/integrations/types";
import { toast } from "@/lib/toast";
import { validateConnection } from "@/lib/tools/connection";
import { useToolInstalls } from "@/lib/tools/store";
import { IntegrationStatusBadge, useIntegrationUsage } from "./use-integration-actions";

type Tab = "setup" | "usage" | "activity";
const noop = () => {};

export function IntegrationSheet({
  definition,
  connection,
  open,
  onOpenChange,
  autoTest = false,
  onDisconnect,
}: {
  definition: IntegrationDefinition;
  connection?: IntegrationConnection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autoTest?: boolean;
  onDisconnect: () => void;
}) {
  const [initialConfig, setInitialConfig] = useState<Record<string, NodeConfigValue>>(() => ({ ...defaultIntegrationConfig(definition), ...connection?.config }));
  const [values, setValues] = useState<Record<string, NodeConfigValue>>(initialConfig);
  const [scopes, setScopes] = useState<string[]>(() => connection?.scopes ?? defaultScopes(definition));
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState<Tab>("setup");
  // Results are recorded below (after the test) instead of on a tool install.
  const test = useConnectionTest(definition.id, definition.name, noop);
  const errors = validateConnection(definition.fields, values);
  const shown = submitted ? errors : {};
  const dirty = JSON.stringify(values) !== JSON.stringify(initialConfig);
  const isOAuth = definition.auth === "oauth";
  const busy = test.running;

  const focusFirstError = () => {
    setTab("setup");
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>("dialog[open] [aria-invalid=true]")?.focus());
  };

  const connect = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return focusFirstError();
    const outcome = await test.run(values);
    if (!outcome) return;
    if (!outcome.ok) {
      toast({ tone: "error", title: `Couldn't connect ${definition.name}`, description: outcome.message });
      return;
    }
    const label = accountLabel(definition, { config: values });
    integrationStore.connect(
      definition.id,
      values,
      scopes,
      outcome.latencyMs,
      isOAuth ? `Authorized ${label} (simulated OAuth).` : `Connected ${label} (simulated).`,
    );
    toast({ title: `${definition.name} connected`, description: `Simulated in demo mode — ${label} is ready for your agents.` });
  };

  const retest = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return focusFirstError();
    if (dirty) {
      integrationStore.saveConfig(definition.id, values);
      setInitialConfig(values);
    }
    const outcome = await test.run(values);
    if (!outcome) return;
    integrationStore.recordTest(definition.id, outcome.ok, outcome.message, outcome.latencyMs);
    toast(
      outcome.ok
        ? { title: `${definition.name} is healthy`, description: dirty ? "Settings saved and verified (simulated)." : outcome.message }
        : { tone: "error", title: `${definition.name} test failed`, description: outcome.message },
    );
  };

  // Opened from "Test connection": run once as soon as the sheet appears.
  const autoRan = useRef(false);
  useEffect(() => {
    if (!autoTest || !connection || autoRan.current) return;
    autoRan.current = true;
    void retest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleScope = (key: string, granted: boolean) => {
    const next = granted ? [...scopes, key] : scopes.filter((item) => item !== key);
    setScopes(next);
    if (connection) {
      const label = definition.scopes.find((item) => item.key === key)?.label ?? key;
      integrationStore.update(definition.id, { scopes: next }, { tone: "info", message: `${granted ? "Granted" : "Revoked"} “${label}”.` });
      toast({ tone: "info", title: granted ? "Permission granted" : "Permission revoked", description: `${label} · ${definition.name}` });
    }
  };

  const tabs: { value: Tab; label: string }[] = connection
    ? [
        { value: "setup", label: "Setup" },
        { value: "usage", label: "Usage" },
        { value: "activity", label: "Activity" },
      ]
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      title={
        <span className="flex items-center gap-3">
          <ToolIcon tool={definition} size="sm" />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              {connection ? definition.name : `Connect ${definition.name}`}
              <IntegrationStatusBadge connection={connection} />
            </span>
            <span className="block text-xs font-normal text-muted-foreground">
              {definition.publisher} · {authLabels[definition.auth]} · {definition.category}
            </span>
          </span>
        </span>
      }
      footer={
        connection ? (
          <>
            <button type="button" onClick={onDisconnect} disabled={busy} className={buttonVariants({ variant: "ghost", className: "mr-auto text-danger hover:bg-danger-soft hover:text-danger" })}>
              <Unplug size={15} />
              Disconnect
            </button>
            {dirty && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setValues(initialConfig);
                  setSubmitted(false);
                }}
                className={buttonVariants({ variant: "secondary" })}
              >
                Discard
              </button>
            )}
            <button type="button" onClick={() => void retest()} disabled={busy} className={buttonVariants({ className: "min-w-36" })}>
              <FlaskConical size={15} />
              {busy ? "Testing…" : dirty ? "Save & test" : "Test connection"}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onOpenChange(false)} disabled={busy} className={buttonVariants({ variant: "secondary" })}>
              Cancel
            </button>
            <button type="button" onClick={() => void connect()} disabled={busy} className={buttonVariants({ className: "min-w-36" })}>
              {isOAuth ? <KeyRound size={15} /> : <PlugZap size={15} />}
              {busy ? (isOAuth ? "Authorizing…" : "Connecting…") : isOAuth ? `Authorize ${definition.name}` : "Connect"}
            </button>
          </>
        )
      }
    >
      <div className="space-y-5">
        <p className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary-soft/60 px-3.5 py-3 text-xs leading-5 text-foreground/80">
          <Info size={15} className="mt-0.5 shrink-0 text-primary" />
          <span>
            <strong className="font-semibold text-foreground">Demo mode.</strong> AgentFlow has no backend here, so connections are simulated: nothing is sent to{" "}
            {definition.name}, and credentials are kept only in this browser.
          </span>
        </p>

        {tabs.length > 0 && (
          <div role="tablist" aria-label="Integration sections" className="flex gap-1 border-b border-border">
            {tabs.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={tab === item.value}
                onClick={() => setTab(item.value)}
                className={cn(
                  "relative px-3 pb-2.5 pt-1 text-sm font-semibold transition-colors",
                  tab === item.value ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {tab === item.value && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        )}

        {tab === "setup" && (
          <SetupTab
            definition={definition}
            connection={connection}
            values={values}
            setValues={setValues}
            errors={shown}
            scopes={scopes}
            onToggleScope={toggleScope}
            test={test}
            onSubmit={() => void (connection ? retest() : connect())}
          />
        )}
        {tab === "usage" && connection && <UsageTab definition={definition} connection={connection} onNavigate={() => onOpenChange(false)} />}
        {tab === "activity" && connection && <ActivityTab connection={connection} />}
      </div>
    </Dialog>
  );
}

function SetupTab({
  definition,
  connection,
  values,
  setValues,
  errors,
  scopes,
  onToggleScope,
  test,
  onSubmit,
}: {
  definition: IntegrationDefinition;
  connection?: IntegrationConnection;
  values: Record<string, NodeConfigValue>;
  setValues: (update: (current: Record<string, NodeConfigValue>) => Record<string, NodeConfigValue>) => void;
  errors: Partial<Record<string, string>>;
  scopes: string[];
  onToggleScope: (key: string, granted: boolean) => void;
  test: ReturnType<typeof useConnectionTest>;
  onSubmit: () => void;
}) {
  const started = test.running || test.result !== null;

  return (
    <>
      {connection?.status === "error" && !started && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft p-3.5">
          <CircleAlert size={17} className="mt-0.5 shrink-0 text-danger" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-danger">Connection failing</p>
            <p className="mt-0.5 text-foreground/80">{connection.error}</p>
          </div>
        </div>
      )}
      {connection?.status === "needs_setup" && !started && (
        <p className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm">
          <Info size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          Complete the required fields, then run <strong>Save &amp; test</strong> to finish connecting.
        </p>
      )}

      {definition.auth === "oauth" && !connection && (
        <ol className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          {["Enter your account", `Approve access in ${definition.name}`, "AgentFlow verifies the token"].map((step, index) => (
            <li key={step} className="flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-card text-[10px] font-bold text-foreground ring-1 ring-border">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      )}

      <section aria-labelledby="int-settings">
        <h3 id="int-settings" className="mb-3 text-sm font-semibold">
          {definition.auth === "oauth" ? "Account" : "Connection settings"}
        </h3>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {definition.fields.map((field) => (
            <div key={field.key} className={cn((field.type === "textarea" || field.type === "switch" || field.type === "password" || definition.fields.length === 1) && "sm:col-span-2")}>
              <ConfigField
                idPrefix={`int-${definition.id}`}
                field={field}
                value={values[field.key]}
                onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
                error={errors[field.key]}
                required={field.required}
              />
            </div>
          ))}
          <button type="submit" className="sr-only">
            Submit
          </button>
        </form>

        {definition.auth === "webhook" && definition.id === "webhooks" && (
          <div className="mt-4 rounded-xl border border-border bg-muted/50 p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Endpoint URL (placeholder — not reachable in demo mode)</p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate font-mono text-xs">{webhookUrl(values.name)}</code>
              <CopyButton value={webhookUrl(values.name)} label="Copy endpoint URL" />
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="int-scopes">
        <h3 id="int-scopes" className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={15} className="text-primary" />
          Permissions
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">Grant only what your agents need. Required permissions can&apos;t be turned off.</p>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {definition.scopes.map((item) => {
            const granted = item.required || scopes.includes(item.key);
            return (
              <li key={item.key} className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {item.label}
                    {item.required && <span className="rounded bg-muted px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Required</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Switch size="sm" checked={granted} disabled={item.required} onCheckedChange={(next) => onToggleScope(item.key, next)} label={item.label} />
              </li>
            );
          })}
        </ul>
      </section>

      {connection && (
        <section className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3">
          <div>
            <p className="text-sm font-medium">Failure alerts</p>
            <p className="text-xs text-muted-foreground">Show a workspace alert when this connection starts failing.</p>
          </div>
          <Switch
            size="sm"
            checked={connection.alerts}
            onCheckedChange={(alerts) => {
              integrationStore.update(connection.id, { alerts });
              toast({ tone: "info", title: alerts ? "Failure alerts on" : "Failure alerts off", description: definition.name });
            }}
            label="Failure alerts"
          />
        </section>
      )}

      <section aria-labelledby="int-test">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 id="int-test" className="text-sm font-semibold">
            Connection test
          </h3>
          {connection?.lastTestedAt && (
            <span className="text-xs text-muted-foreground">
              Last run <RelativeTime iso={connection.lastTestedAt} />
            </span>
          )}
        </div>
        <TestPanel steps={test.steps} result={test.result} running={test.running} />
        <p className="mt-3 text-[11px] leading-4 text-subtle-foreground">
          Demo tip: values containing “invalid” fail to resolve, port 9999 times out, and credentials containing “expired” are rejected.
        </p>
      </section>
    </>
  );
}

function UsageTab({
  definition,
  connection,
  onNavigate,
}: {
  definition: IntegrationDefinition;
  connection: IntegrationConnection;
  onNavigate: () => void;
}) {
  const usage = useIntegrationUsage(definition);
  const installs = useToolInstalls();
  const tools = definition.toolIds.flatMap((id) => {
    const tool = toolsById.get(id);
    return tool ? [{ tool, installed: installs.some((install) => install.id === id) }] : [];
  });

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-3 gap-2">
        {[
          { label: "Requests · 7d", value: formatCompact(connection.requests7d), icon: Activity },
          { label: "Avg latency", value: connection.avgLatencyMs ? `${connection.avgLatencyMs} ms` : "—", icon: Clock3 },
          { label: "Last sync", value: connection.lastSyncAt ? <RelativeTime iso={connection.lastSyncAt} /> : "Never", icon: CircleCheck },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border p-3">
            <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <item.icon size={12} />
              {item.label}
            </dt>
            <dd className="mt-1 truncate text-sm font-bold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Powers tools</h3>
        {tools.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {definition.modelProvider ? `Serves ${definition.modelProvider} models selected in agent settings.` : "Available to workflows as a connection."}
          </p>
        ) : (
          <ul className="space-y-2">
            {tools.map(({ tool, installed }) => (
              <li key={tool.id}>
                <Link
                  href={`/tools/${tool.id}`}
                  onClick={onNavigate}
                  className="flex items-center gap-3 rounded-xl border border-border p-2.5 transition hover:border-primary/40 hover:bg-muted/50"
                >
                  <ToolIcon tool={tool} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{tool.name}</span>
                    <span className="block text-xs text-muted-foreground">{installed ? "Installed" : "Not installed — open to install"}</span>
                  </span>
                  <ArrowRight size={14} className="text-subtle-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">
          Used by {usage.agents.length} agent{usage.agents.length === 1 ? "" : "s"} · {usage.workflows.length} workflow{usage.workflows.length === 1 ? "" : "s"}
        </h3>
        {usage.agents.length + usage.workflows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing depends on this connection yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {[
              ...usage.agents.map((item) => ({ ...item, kind: "Agent", href: `/agents/${item.id}/builder` })),
              ...usage.workflows.map((item) => ({ ...item, kind: "Workflow", href: `/workflows/${item.id}/builder` })),
            ].map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/60">
                <AgentAvatar icon={item.icon} color={item.color} size="sm" />
                <Link href={item.href} onClick={onNavigate} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary">
                  {item.name}
                </Link>
                <span className="text-[11px] text-muted-foreground">{item.kind}</span>
                <Link href={`/runs?source=${item.id}`} onClick={onNavigate} className="text-xs font-semibold text-primary hover:underline">
                  Runs
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/analytics" onClick={onNavigate} className={buttonVariants({ variant: "secondary", size: "sm", className: "w-full" })}>
        <Activity size={14} />
        Open analytics
      </Link>
    </div>
  );
}

function ActivityTab({ connection }: { connection: IntegrationConnection }) {
  if (!connection.events.length) return <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>;
  const tones = { success: "bg-success", error: "bg-danger", info: "bg-primary" } as const;
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {connection.events.map((event, index) => (
        <li key={`${event.at}-${index}`} className="relative">
          <span className={cn("absolute -left-[25px] top-1.5 size-2.5 rounded-full ring-4 ring-card", tones[event.tone])} />
          <p className="text-sm">{event.message}</p>
          <RelativeTime iso={event.at} className="text-xs text-muted-foreground" />
        </li>
      ))}
    </ol>
  );
}
