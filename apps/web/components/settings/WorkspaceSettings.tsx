"use client";

import Link from "next/link";
import { useState } from "react";
import { DatabaseBackup, Download, RotateCcw } from "lucide-react";
import { ModelSettingsFields } from "@/components/agents/wizard/ModelStep";
import { emptyDraft, validateStep } from "@/components/agents/wizard/wizard-config";
import { buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Select, inputClass } from "@/components/ui/Field";
import { defaultSettings } from "@/lib/agents/catalog";
import { downloadFile } from "@/lib/download";
import { plansById } from "@/lib/settings/plans";
import { STORAGE_PREFIX, audit, useBilling, useWorkspaceSettings, workspaceStore } from "@/lib/settings/store";
import type { WorkspaceSettings } from "@/lib/settings/types";
import { toast } from "@/lib/toast";
import { THEME_STORAGE_KEY } from "@/components/theme/theme-script";
import { DemoNote, SaveBar, Section, SettingsHeader, useDraft } from "./SettingsKit";

const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;
const retentionOptions = [7, 30, 90, 365];

function validate(workspace: WorkspaceSettings) {
  const errors: Partial<Record<string, string>> = {};
  if (workspace.name.trim().length < 2) errors.name = "Name your workspace (2+ characters).";
  if (!SLUG.test(workspace.slug)) errors.slug = "Use 3–32 lowercase letters, numbers or dashes (not at the ends).";
  return { ...errors, ...validateStep("model", { ...emptyDraft, settings: workspace.modelDefaults }) };
}

/** Keys owned by AgentFlow in this browser, minus the theme preference. */
function dataKeys() {
  return Object.keys(window.localStorage).filter((key) => key.startsWith(STORAGE_PREFIX) && key !== THEME_STORAGE_KEY);
}

export function WorkspaceSettingsPage() {
  const workspace = useWorkspaceSettings();
  const billing = useBilling();
  const plan = plansById[billing.planId];
  const { draft, patch, dirty, reset } = useDraft(workspace);
  const [submitted, setSubmitted] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const errors = validate(draft);
  const shown = submitted ? errors : {};

  const save = () => {
    setSubmitted(true);
    if (Object.keys(errors).length) {
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    const modelChanged = JSON.stringify(draft.modelDefaults) !== JSON.stringify(workspace.modelDefaults);
    workspaceStore.write({ ...draft, name: draft.name.trim() });
    audit("workspace", modelChanged ? "Changed default model settings" : "Updated workspace settings", draft.name.trim());
    setSubmitted(false);
    toast({ title: "Workspace saved", description: modelChanged ? "New agents and workflows will start with these model settings." : undefined });
  };

  const exportData = () => {
    const data = Object.fromEntries(
      dataKeys().map((key) => {
        try {
          return [key, JSON.parse(window.localStorage.getItem(key) ?? "null")];
        } catch {
          return [key, null];
        }
      }),
    );
    const name = `${workspace.slug}-workspace-export.json`;
    downloadFile(
      name,
      JSON.stringify({ exportedAt: new Date().toISOString(), workspace: workspace.name, note: "Data stored by the AgentFlow demo in this browser.", data }, null, 2),
      "application/json",
    );
    audit("workspace", "Exported workspace data");
    toast({
      title: "Export ready",
      description: Object.keys(data).length ? `${name} · ${Object.keys(data).length} data sets` : `${name} · nothing has been changed from the sample data yet`,
    });
  };

  const resetData = () => {
    dataKeys().forEach((key) => window.localStorage.removeItem(key));
    window.location.reload();
  };

  return (
    <>
      <SettingsHeader title="Workspace" description="General settings and defaults shared by everyone in the workspace." />

      <Section title="General">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          className="grid gap-5 md:grid-cols-2"
        >
          <Field label="Workspace name" htmlFor="ws-name" error={shown.name}>
            <input
              id="ws-name"
              value={draft.name}
              onChange={(event) => patch({ name: event.target.value })}
              aria-invalid={shown.name ? true : undefined}
              aria-describedby={shown.name ? "ws-name-error" : undefined}
              className={inputClass}
            />
          </Field>
          <Field label="Workspace URL" htmlFor="ws-slug" error={shown.slug} hint="Used in invite links and webhook URLs.">
            <div className="flex">
              <span className="flex items-center rounded-l-xl border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">agentflow.example/</span>
              <input
                id="ws-slug"
                value={draft.slug}
                onChange={(event) => patch({ slug: event.target.value.toLowerCase().replace(/\s+/g, "-") })}
                aria-invalid={shown.slug ? true : undefined}
                aria-describedby={shown.slug ? "ws-slug-error" : undefined}
                className={`${inputClass} rounded-l-none`}
              />
            </div>
          </Field>
          <Field
            label="Run history retention"
            htmlFor="ws-retention"
            hint={
              <>
                Your {plan.name} plan keeps up to {plan.limits.historyDays} days.{" "}
                {plan.limits.historyDays < 365 && (
                  <Link href="/settings/billing" className="font-semibold text-primary hover:underline">
                    Compare plans
                  </Link>
                )}
              </>
            }
          >
            <Select id="ws-retention" value={draft.retentionDays} onChange={(event) => patch({ retentionDays: Number(event.target.value) })}>
              {retentionOptions.map((days) => (
                <option key={days} value={days} disabled={days > plan.limits.historyDays}>
                  {days} days{days > plan.limits.historyDays ? " — upgrade required" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <button type="submit" className="sr-only">
            Save
          </button>
        </form>
      </Section>

      <Section
        title="Default model settings"
        description="New agents and workflows start with these. Existing ones keep their own settings."
        action={
          JSON.stringify(draft.modelDefaults) !== JSON.stringify(defaultSettings) ? (
            <button type="button" onClick={() => patch({ modelDefaults: defaultSettings })} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <RotateCcw size={14} />
              Restore AgentFlow defaults
            </button>
          ) : undefined
        }
      >
        <ModelSettingsFields
          settings={draft.modelDefaults}
          errors={shown}
          onChange={(change) => patch({ modelDefaults: { ...draft.modelDefaults, ...change } })}
        />
        <p className="mt-5 text-xs text-muted-foreground">
          Model access comes from your{" "}
          <Link href="/integrations?category=AI%20models" className="font-semibold text-primary hover:underline">
            AI model integrations
          </Link>
          .
        </p>
      </Section>

      <Section
        title="Your data"
        description="Everything in this demo lives in your browser's local storage."
        footer={
          <button type="button" onClick={exportData} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Download size={14} />
            Export workspace data
          </button>
        }
      >
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <DatabaseBackup size={18} className="mt-0.5 shrink-0 text-primary" />
          <p>Download a JSON copy of the agents, workflows, runs, tools, knowledge, integrations and settings you&apos;ve changed in this browser.</p>
        </div>
      </Section>

      <Section
        tone="danger"
        title="Reset demo data"
        description="Restore every section to the original sample data. Your theme preference is kept."
        footer={
          <button
            type="button"
            onClick={() => {
              setConfirmText("");
              setResetOpen(true);
            }}
            className={buttonVariants({ variant: "secondary", size: "sm", className: "border-danger/40 text-danger hover:border-danger hover:bg-danger-soft" })}
          >
            <RotateCcw size={14} />
            Reset demo data
          </button>
        }
      >
        <p className="text-sm text-muted-foreground">
          Agents and workflows you created, run history, installed tools, connected integrations, team changes and API keys are removed from this
          browser. This can&apos;t be undone.
        </p>
      </Section>

      <DemoNote>Deleting or transferring a workspace requires the AgentFlow backend, so it isn&apos;t available in this demo.</DemoNote>

      <Dialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all demo data?"
        description="This clears everything AgentFlow stored in this browser and reloads the app."
        footer={
          <>
            <button type="button" onClick={() => setResetOpen(false)} className={buttonVariants({ variant: "secondary" })}>
              Cancel
            </button>
            <button
              type="button"
              disabled={confirmText !== workspace.slug}
              onClick={resetData}
              className={buttonVariants({ className: "bg-danger shadow-danger/25 hover:bg-danger/90" })}
            >
              Reset and reload
            </button>
          </>
        }
      >
        <Field label={`Type “${workspace.slug}” to confirm`} htmlFor="reset-confirm">
          <input id="reset-confirm" value={confirmText} onChange={(event) => setConfirmText(event.target.value)} autoComplete="off" className={inputClass} />
        </Field>
      </Dialog>

      <SaveBar
        dirty={dirty}
        onSave={save}
        onDiscard={() => {
          reset();
          setSubmitted(false);
        }}
      />
    </>
  );
}
