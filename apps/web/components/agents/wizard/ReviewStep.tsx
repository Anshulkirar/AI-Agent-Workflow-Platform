"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { knowledgeLabel, modelName, statusMeta, toolsById } from "@/lib/agents/catalog";
import type { AgentStatus } from "@/lib/agents/types";
import { cn } from "@/lib/cn";
import { AgentAvatar } from "../AgentVisuals";
import type { StepId, StepProps } from "./wizard-config";

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: StepId;
  onEdit: (step: StepId) => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-primary hover:bg-primary-soft"
        >
          <Pencil size={12} />
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}

function Chips({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-subtle-foreground">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-lg bg-muted px-2 py-1 text-xs font-medium">
          {item}
        </span>
      ))}
    </div>
  );
}

const statusChoices: { value: AgentStatus; description: string }[] = [
  { value: "active", description: "Available for runs right away" },
  { value: "inactive", description: "Configured but paused" },
  { value: "draft", description: "Keep working on it later" },
];

export function ReviewStep({ draft, update, goTo }: StepProps & { goTo: (step: StepId) => void }) {
  const { settings } = draft;

  return (
    <div className="space-y-4">
      <Section title="Basic info" step="basics" onEdit={goTo}>
        <div className="flex items-center gap-3">
          <AgentAvatar icon={draft.icon} color={draft.color} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{draft.name}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">{draft.description}</p>
          </div>
        </div>
      </Section>

      <Section title="Instructions" step="instructions" onEdit={goTo}>
        <p className="line-clamp-4 whitespace-pre-line font-mono text-xs leading-5 text-muted-foreground">
          {draft.instructions}
        </p>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title={`Tools (${draft.tools.length})`} step="tools" onEdit={goTo}>
          <Chips items={draft.tools.map((id) => toolsById.get(id)?.name ?? id)} empty="No tools — the agent can only reason." />
        </Section>
        <Section title={`Knowledge (${draft.knowledge.length})`} step="knowledge" onEdit={goTo}>
          <Chips items={draft.knowledge.map(knowledgeLabel)} empty="No knowledge sources connected." />
        </Section>
      </div>

      <Section title="Model & settings" step="model" onEdit={goTo}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          {[
            ["Model", modelName(settings.model)],
            ["Temperature", settings.temperature.toFixed(1)],
            ["Max tokens", settings.maxTokens.toLocaleString("en-US")],
            ["Format", settings.responseFormat === "json" ? "JSON" : settings.responseFormat],
            ["Top P", settings.topP.toFixed(2)],
            ["Streaming", settings.streaming ? "On" : "Off"],
            ["Memory", settings.memory ? "On" : "Off"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-medium capitalize">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <fieldset className="rounded-2xl border border-border p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Status</legend>
        <div role="radiogroup" aria-label="Agent status" className="grid gap-2 sm:grid-cols-3">
          {statusChoices.map((choice) => {
            const selected = draft.status === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ status: choice.value })}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  selected ? "border-primary bg-primary-soft/50 ring-4 ring-primary/10" : "border-border hover:border-primary/40",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className={cn("size-2 rounded-full", statusMeta[choice.value].dot)} />
                  {statusMeta[choice.value].label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{choice.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
