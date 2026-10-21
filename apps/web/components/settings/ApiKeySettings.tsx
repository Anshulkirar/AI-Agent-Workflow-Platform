"use client";

import { useState } from "react";
import { ChevronDown, KeyRound, Plus, ShieldAlert, TriangleAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Select, inputClass } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/PageKit";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useHydrated } from "@/components/ui/use-hydrated";
import { cn } from "@/lib/cn";
import { makeId } from "@/lib/create-store";
import { formatCompact, formatDate } from "@/lib/format";
import { apiKeySecret } from "@/lib/settings/totp";
import { apiKeyStore, audit, profileStore, useApiKeys } from "@/lib/settings/store";
import type { ApiKey, ApiScope } from "@/lib/settings/types";
import { toast } from "@/lib/toast";
import { DemoNote, Section, SettingsHeader } from "./SettingsKit";

const scopeMeta: Record<ApiScope, { label: string; description: string }> = {
  "agents:run": { label: "Run agents", description: "Start agent runs and read their results." },
  "workflows:run": { label: "Run workflows", description: "Trigger workflows from your systems." },
  "runs:read": { label: "Read runs", description: "List runs, steps, logs and token usage." },
  "agents:write": { label: "Manage agents", description: "Create and update agents and workflows." },
  "knowledge:write": { label: "Write knowledge", description: "Upload documents to knowledge sources." },
};

const expiryOptions = [
  { value: 0, label: "Never expires" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
];

const BASE_URL = "https://api.agentflow.example/v1";
const DAY = 86_400_000;

function maskedKey(key: ApiKey) {
  return `${key.prefix}••••••••${key.last4}`;
}

export function ApiKeySettings() {
  const keys = useApiKeys();
  const hydrated = useHydrated();
  const [createOpen, setCreateOpen] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);

  const active = keys.filter((key) => !key.revokedAt);
  const revoked = keys.filter((key) => key.revokedAt);
  const example = `curl ${BASE_URL}/agents/research-agent/runs \\
  -H "Authorization: Bearer $AGENTFLOW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "input": "Summarize recent AI agent news" }'`;

  const expiry = (key: ApiKey) => {
    if (!key.expiresAt) return { label: "Never", tone: "text-muted-foreground" };
    if (!hydrated) return { label: formatDate(key.expiresAt), tone: "text-muted-foreground" };
    const days = Math.ceil((Date.parse(key.expiresAt) - Date.now()) / DAY);
    if (days <= 0) return { label: "Expired", tone: "font-semibold text-danger" };
    if (days <= 14) return { label: `In ${days} day${days === 1 ? "" : "s"}`, tone: "font-semibold text-amber-600 dark:text-amber-400" };
    return { label: formatDate(key.expiresAt), tone: "text-muted-foreground" };
  };

  return (
    <>
      <SettingsHeader
        title="API keys"
        description="Authenticate requests from your backend, CI or automation tools."
        actions={
          <button type="button" onClick={() => setCreateOpen(true)} className={buttonVariants()}>
            <Plus size={16} />
            Create API key
          </button>
        }
      />

      <Section title={`Active keys · ${active.length}`} description="Keys are shown once at creation. Store them in a secrets manager — never in client-side code.">
        {active.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No active API keys"
            description="Create a key to call AgentFlow from your own code."
            className="py-10"
            action={
              <button type="button" onClick={() => setCreateOpen(true)} className={buttonVariants({ size: "sm" })}>
                <Plus size={14} />
                Create API key
              </button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {active.map((key) => {
              const expires = expiry(key);
              return (
                <li key={key.id} className="rounded-xl border border-border p-4 transition-colors hover:border-primary/30">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {key.name}
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            key.environment === "live" ? "bg-success-soft text-success" : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {key.environment}
                        </span>
                      </p>
                      <code className="mt-1 block font-mono text-xs text-muted-foreground">{maskedKey(key)}</code>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRevoking(key);
                        setRevokeOpen(true);
                      }}
                      className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 text-danger hover:bg-danger-soft hover:text-danger" })}
                    >
                      Revoke
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {key.scopes.map((scope) => (
                      <span key={scope} title={scopeMeta[scope].description} className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {scope}
                      </span>
                    ))}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-xs sm:grid-cols-4">
                    <div>
                      <dt className="text-subtle-foreground">Created</dt>
                      <dd className="mt-0.5">
                        <RelativeTime iso={key.createdAt} /> · {key.createdBy}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-subtle-foreground">Last used</dt>
                      <dd className="mt-0.5">{key.lastUsedAt ? <RelativeTime iso={key.lastUsedAt} /> : "Never"}</dd>
                    </div>
                    <div>
                      <dt className="text-subtle-foreground">Requests · 30d</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">{formatCompact(key.requests30d)}</dd>
                    </div>
                    <div>
                      <dt className="text-subtle-foreground">Expires</dt>
                      <dd className={cn("mt-0.5", expires.tone)}>{expires.label}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        )}

        {revoked.length > 0 && (
          <div className="mt-5">
            <button
              type="button"
              aria-expanded={showRevoked}
              onClick={() => setShowRevoked((value) => !value)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ChevronDown size={14} className={cn("transition-transform", showRevoked && "rotate-180")} />
              Revoked keys ({revoked.length})
            </button>
            {showRevoked && (
              <ul className="mt-3 space-y-2 animate-fade-in">
                {revoked.map((key) => (
                  <li key={key.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground line-through decoration-subtle-foreground">{key.name}</span>{" "}
                      <code className="font-mono">{maskedKey(key)}</code>
                    </span>
                    <span>
                      Revoked <RelativeTime iso={key.revokedAt!} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Section>

      <Section title="Quick start" description="Call an agent over HTTP with your key in the Authorization header.">
        <div className="relative">
          <pre className="overflow-x-auto rounded-xl border border-border bg-muted/60 p-4 pr-12 font-mono text-xs leading-5">{example}</pre>
          <CopyButton value={example} label="Copy example request" className="absolute right-2 top-2" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Base URL <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{BASE_URL}</code> is a placeholder — this demo doesn&apos;t include the
          AgentFlow API server.
        </p>
      </Section>

      <DemoNote>
        Keys are generated securely in your browser and only a masked copy is stored, but there&apos;s no API server in this demo to accept them —
        usage numbers are sample data.
      </DemoNote>

      {createOpen && <CreateKeyDialog open={createOpen} onOpenChange={setCreateOpen} existing={active.map((key) => key.name.toLowerCase())} />}

      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title={`Revoke “${revoking?.name ?? "key"}”?`}
        description={
          <>
            Requests using <code className="font-mono text-xs">{revoking ? maskedKey(revoking) : ""}</code> will be rejected immediately. This can&apos;t be
            undone — create a new key if you need access again.
          </>
        }
        confirmLabel="Revoke key"
        onConfirm={() => {
          if (!revoking) return;
          apiKeyStore.update(revoking.id, { revokedAt: new Date().toISOString() });
          audit("api", "Revoked API key", revoking.name);
          toast({ tone: "info", title: "API key revoked", description: revoking.name });
        }}
      />
    </>
  );
}

function CreateKeyDialog({ open, onOpenChange, existing }: { open: boolean; onOpenChange: (open: boolean) => void; existing: string[] }) {
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<ApiKey["environment"]>("live");
  const [scopes, setScopes] = useState<ApiScope[]>(["agents:run", "runs:read"]);
  const [expiresIn, setExpiresIn] = useState(90);
  const [submitted, setSubmitted] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  const errors: Partial<Record<"name" | "scopes", string>> = {};
  if (name.trim().length < 3) errors.name = "Name the key after where it's used (3+ characters).";
  else if (existing.includes(name.trim().toLowerCase())) errors.name = "An active key already has this name.";
  if (!scopes.length) errors.scopes = "Choose at least one permission.";
  const shown = submitted ? errors : {};

  const create = () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const prefix = environment === "live" ? "af_live_" : "af_test_";
    const value = apiKeySecret(prefix);
    const timestamp = new Date();
    const key: ApiKey = {
      id: makeId(name),
      name: name.trim(),
      environment,
      prefix,
      last4: value.slice(-4),
      scopes,
      createdAt: timestamp.toISOString(),
      createdBy: profileStore.read().name,
      lastUsedAt: null,
      expiresAt: expiresIn ? new Date(timestamp.getTime() + expiresIn * DAY).toISOString() : null,
      revokedAt: null,
      requests30d: 0,
    };
    apiKeyStore.write([key, ...apiKeyStore.read()]);
    audit("api", "Created API key", key.name);
    setSecret(value);
  };

  if (secret) {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Copy your new API key"
        description={name.trim()}
        footer={
          <button type="button" onClick={() => onOpenChange(false)} className={buttonVariants()}>
            I&apos;ve saved my key
          </button>
        }
      >
        <div className="space-y-4">
          <p className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            This is the only time the full key is shown. AgentFlow keeps just the last four characters.
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-xs">{secret}</code>
            <CopyButton value={secret} label="Copy API key" />
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldAlert size={14} className="mt-px shrink-0" />
            Store it as an environment variable such as AGENTFLOW_API_KEY. Revoke it right away if it&apos;s ever exposed.
          </p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create API key"
      description="Grant only the permissions this integration needs."
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className={buttonVariants({ variant: "secondary" })}>
            Cancel
          </button>
          <button type="button" onClick={create} className={buttonVariants()}>
            <KeyRound size={15} />
            Create key
          </button>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
        className="space-y-5"
      >
        <Field label="Name" htmlFor="key-name" error={shown.name}>
          <input
            id="key-name"
            autoFocus
            value={name}
            placeholder="e.g. Production backend"
            onChange={(event) => setName(event.target.value)}
            aria-invalid={shown.name ? true : undefined}
            aria-describedby={shown.name ? "key-name-error" : undefined}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Environment</legend>
            <div role="radiogroup" aria-label="Environment" className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted p-1">
              {(["live", "test"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={environment === item}
                  onClick={() => setEnvironment(item)}
                  className={cn(
                    "h-8 rounded-lg text-xs font-semibold capitalize transition-all",
                    environment === item ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
          <Field label="Expiration" htmlFor="key-expiry">
            <Select id="key-expiry" value={expiresIn} onChange={(event) => setExpiresIn(Number(event.target.value))}>
              {expiryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Permissions</legend>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {(Object.keys(scopeMeta) as ApiScope[]).map((scope) => (
              <li key={scope}>
                <label className="flex cursor-pointer items-start gap-3 px-3.5 py-2.5">
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={(event) => setScopes((current) => (event.target.checked ? [...current, scope] : current.filter((item) => item !== scope)))}
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {scopeMeta[scope].label} <code className="ml-1 font-mono text-[11px] text-muted-foreground">{scope}</code>
                    </span>
                    <span className="block text-xs text-muted-foreground">{scopeMeta[scope].description}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {shown.scopes && <p className="mt-1.5 text-xs font-medium text-danger">{shown.scopes}</p>}
        </fieldset>
        <button type="submit" className="sr-only">
          Create
        </button>
      </form>
    </Dialog>
  );
}
