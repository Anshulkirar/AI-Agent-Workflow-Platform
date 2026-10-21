"use client";

import { Field, Slider, inputClass } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { models } from "@/lib/agents/catalog";
import type { ModelSettings, ResponseFormat } from "@/lib/agents/types";
import { cn } from "@/lib/cn";
import type { StepProps } from "./wizard-config";

/** Model picker + generation settings. Also reused by the builder side panel. */
export function ModelSettingsFields({
  settings,
  onChange,
  errors = {},
  compact = false,
}: {
  settings: ModelSettings;
  onChange: (patch: Partial<ModelSettings>) => void;
  errors?: Partial<Record<string, string>>;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-6", compact && "space-y-5")}>
      {compact ? (
        <Field label="Model" htmlFor="settings-model">
          <select
            id="settings-model"
            value={settings.model}
            onChange={(event) => onChange({ model: event.target.value })}
            className={cn(inputClass, "appearance-none")}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} · {model.provider}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Model</legend>
          <div role="radiogroup" aria-label="Model" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {models.map((model) => {
              const selected = settings.model === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ model: model.id })}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                    selected
                      ? "border-primary bg-primary-soft/50 ring-4 ring-primary/10"
                      : "border-border hover:border-primary/40 hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                      selected ? "border-primary" : "border-input",
                    )}
                  >
                    {selected && <span className="size-2 rounded-full bg-primary" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {model.name}
                      <span className="rounded bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                        {model.badge}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {model.provider} · {model.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className={cn("grid gap-6", !compact && "sm:grid-cols-2")}>
        <Field label="Temperature" htmlFor="settings-temperature" error={errors.temperature}>
          <Slider
            id="settings-temperature"
            value={settings.temperature}
            min={0}
            max={2}
            step={0.1}
            onChange={(temperature) => onChange({ temperature })}
            format={(value) => value.toFixed(1)}
            marks={["Precise", "Balanced", "Creative"]}
          />
        </Field>
        <Field label="Max tokens" htmlFor="settings-max-tokens" error={errors.maxTokens}>
          <Slider
            id="settings-max-tokens"
            value={settings.maxTokens}
            min={256}
            max={8192}
            step={256}
            onChange={(maxTokens) => onChange({ maxTokens })}
            format={(value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value))}
          />
        </Field>
        {!compact && (
          <Field label="Top P" htmlFor="settings-top-p" hint="Lower values make output more focused.">
            <Slider
              id="settings-top-p"
              value={settings.topP}
              min={0}
              max={1}
              step={0.05}
              onChange={(topP) => onChange({ topP })}
              format={(value) => value.toFixed(2)}
            />
          </Field>
        )}
        {!compact && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Response format</legend>
            <div role="radiogroup" aria-label="Response format" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted p-1">
              {(["text", "markdown", "json"] as ResponseFormat[]).map((format) => (
                <button
                  key={format}
                  type="button"
                  role="radio"
                  aria-checked={settings.responseFormat === format}
                  onClick={() => onChange({ responseFormat: format })}
                  className={cn(
                    "h-8 rounded-lg text-xs font-semibold capitalize transition-all",
                    settings.responseFormat === format
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {format === "json" ? "JSON" : format}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <div className="divide-y divide-border rounded-2xl border border-border">
        {(
          [
            { key: "streaming", label: "Streaming", description: "Send tokens as they're generated." },
            { key: "memory", label: "Enable memory", description: "Remember context across conversations." },
          ] as const
        ).map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <Switch
              checked={settings[item.key]}
              onCheckedChange={(checked) => onChange({ [item.key]: checked })}
              label={item.label}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModelStep({ draft, update, errors }: StepProps) {
  return (
    <ModelSettingsFields
      settings={draft.settings}
      errors={errors}
      onChange={(patch) => update({ settings: { ...draft.settings, ...patch } })}
    />
  );
}
