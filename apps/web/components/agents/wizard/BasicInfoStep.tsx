"use client";

import { Field, inputClass, textareaClass } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { ColorPicker, IconPicker } from "../AppearancePickers";
import { AgentAvatar } from "../AgentVisuals";
import { LIMITS, type StepProps } from "./wizard-config";

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={cn("text-[11px] tabular-nums", value > max ? "text-danger" : "text-subtle-foreground")}>
      {value}/{max}
    </span>
  );
}

export function BasicInfoStep({ draft, update, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <Field
        label="Agent name"
        htmlFor="agent-name"
        error={errors.name}
        aside={<Counter value={draft.name.length} max={LIMITS.name} />}
      >
        <input
          id="agent-name"
          autoFocus
          value={draft.name}
          onChange={(event) => update({ name: event.target.value })}
          placeholder="e.g. Research Agent"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "agent-name-error" : undefined}
          className={inputClass}
        />
      </Field>

      <Field
        label="Description"
        htmlFor="agent-description"
        error={errors.description}
        hint="Shown on the agent card and to teammates."
        aside={<Counter value={draft.description.length} max={LIMITS.description} />}
      >
        <textarea
          id="agent-description"
          rows={3}
          value={draft.description}
          onChange={(event) => update({ description: event.target.value })}
          placeholder="Research and analyze information from the web, documents and APIs."
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={errors.description ? "agent-description-error" : undefined}
          className={textareaClass}
        />
      </Field>

      <IconPicker value={draft.icon} onChange={(icon) => update({ icon })} />
      <ColorPicker value={draft.color} onChange={(color) => update({ color })} />

      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/40 p-4">
        <AgentAvatar icon={draft.icon} color={draft.color} size="lg" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">Preview</p>
          <p className="truncate font-semibold">{draft.name.trim() || "Untitled agent"}</p>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {draft.description.trim() || "Your description will appear here."}
          </p>
        </div>
      </div>
    </div>
  );
}
