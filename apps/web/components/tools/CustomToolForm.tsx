"use client";

import { useEffect, useMemo, useState } from "react";
import { Braces, Check, LoaderCircle } from "lucide-react";
import { ColorPicker, IconPicker } from "@/components/agents/AppearancePickers";
import { ConfigField } from "@/components/agents/builder/ConfigField";
import { buttonVariants } from "@/components/ui/button";
import { Field, Select, inputClass, textareaClass } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { validateCustomTool } from "@/lib/tools/connection";
import type { CustomAuthType, CustomToolDefinition, HttpMethod } from "@/lib/tools/types";

export const emptyCustomTool: CustomToolDefinition = {
  name: "",
  description: "",
  icon: "bot",
  color: "violet",
  method: "GET",
  endpoint: "",
  authType: "none",
  authValue: "",
  headers: "",
  inputSchema: '{\n  "type": "object",\n  "properties": {\n    "query": { "type": "string", "description": "What to look up" }\n  },\n  "required": ["query"]\n}',
  timeoutSec: 15,
};

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const authOptions: { value: CustomAuthType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "api_key", label: "API key" },
  { value: "bearer", label: "Bearer token" },
];

function prettyJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

/** Definition form for an HTTP-backed custom tool (create and edit). */
export function CustomToolForm({
  initial,
  otherNames,
  submitLabel,
  onSubmit,
  onCancel,
  requireChanges = false,
  onValuesChange,
}: {
  initial: CustomToolDefinition;
  otherNames: string[];
  submitLabel: string;
  onSubmit: (definition: CustomToolDefinition) => void;
  onCancel?: () => void;
  /** Edit mode: only enable saving once something changed. */
  requireChanges?: boolean;
  /** Notified as the user edits (e.g. for a live preview). */
  onValuesChange?: (values: CustomToolDefinition) => void;
}) {
  const [values, setValues] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = useMemo(() => validateCustomTool(values, otherNames), [values, otherNames]);
  const shown = submitted ? errors : {};
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  useEffect(() => {
    onValuesChange?.(values);
  }, [values, onValuesChange]);

  const update = (patch: Partial<CustomToolDefinition>) => setValues((current) => ({ ...current, ...patch }));

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length) {
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      onSubmit({ ...values, name: values.name.trim(), description: values.description.trim(), endpoint: values.endpoint.trim() });
      setSaving(false);
      setSubmitted(false);
    }, 500);
  };

  const invalid = (key: string) => (shown[key] ? true : undefined);

  return (
    <div className="space-y-6">
      <Field label="Name *" htmlFor="tool-name" error={shown.name}>
        <input
          id="tool-name"
          value={values.name}
          onChange={(event) => update({ name: event.target.value })}
          placeholder="e.g. CRM Lookup"
          aria-invalid={invalid("name")}
          className={inputClass}
        />
      </Field>
      <Field label="Description *" htmlFor="tool-description" error={shown.description} hint="Agents read this to decide when to call the tool — be specific.">
        <textarea
          id="tool-description"
          rows={2}
          value={values.description}
          onChange={(event) => update({ description: event.target.value })}
          placeholder="Fetch a customer's plan and open tickets by email."
          aria-invalid={invalid("description")}
          className={textareaClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
        <Field label="Method" htmlFor="tool-method">
          <Select id="tool-method" value={values.method} onChange={(event) => update({ method: event.target.value as HttpMethod })}>
            {methods.map((method) => (
              <option key={method}>{method}</option>
            ))}
          </Select>
        </Field>
        <Field label="Endpoint URL *" htmlFor="tool-endpoint" error={shown.endpoint}>
          <input
            id="tool-endpoint"
            value={values.endpoint}
            onChange={(event) => update({ endpoint: event.target.value })}
            placeholder="https://api.example.com/v1/lookup"
            aria-invalid={invalid("endpoint")}
            className={cn(inputClass, "font-mono text-[13px]")}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Authentication</legend>
        <div role="radiogroup" aria-label="Authentication" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted p-1">
          {authOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={values.authType === option.value}
              onClick={() => update({ authType: option.value })}
              className={cn(
                "h-8 rounded-lg text-xs font-semibold transition-all",
                values.authType === option.value ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {values.authType !== "none" && (
          <div className="mt-3">
            <ConfigField
              idPrefix="tool"
              field={{ key: "authValue", label: values.authType === "bearer" ? "Bearer token" : "API key", type: "password", defaultValue: "", placeholder: "Paste credential" }}
              value={values.authValue}
              onChange={(value) => update({ authValue: String(value) })}
              error={shown.authValue}
              required
            />
          </div>
        )}
      </fieldset>

      <Field
        label="Headers (JSON)"
        htmlFor="tool-headers"
        error={shown.headers}
        hint="Optional. Sent with every request."
        aside={
          values.headers.trim() ? (
            <button type="button" onClick={() => update({ headers: prettyJson(values.headers) })} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              <Braces size={12} />
              Format
            </button>
          ) : undefined
        }
      >
        <textarea
          id="tool-headers"
          rows={3}
          value={values.headers}
          onChange={(event) => update({ headers: event.target.value })}
          placeholder='{ "Accept": "application/json" }'
          aria-invalid={invalid("headers")}
          className={cn(textareaClass, "font-mono text-xs")}
        />
      </Field>

      <Field
        label="Input schema (JSON Schema) *"
        htmlFor="tool-schema"
        error={shown.inputSchema}
        hint="Defines the arguments agents pass to this tool."
        aside={
          <button type="button" onClick={() => update({ inputSchema: prettyJson(values.inputSchema) })} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <Braces size={12} />
            Format
          </button>
        }
      >
        <textarea
          id="tool-schema"
          rows={8}
          value={values.inputSchema}
          onChange={(event) => update({ inputSchema: event.target.value })}
          aria-invalid={invalid("inputSchema")}
          spellCheck={false}
          className={cn(textareaClass, "font-mono text-xs")}
        />
      </Field>

      <Field label="Timeout (seconds)" htmlFor="tool-timeout" error={shown.timeoutSec}>
        <input
          id="tool-timeout"
          type="number"
          min={1}
          max={120}
          value={values.timeoutSec}
          onChange={(event) => update({ timeoutSec: Number(event.target.value) })}
          aria-invalid={invalid("timeoutSec")}
          className={cn(inputClass, "w-32")}
        />
      </Field>

      <IconPicker value={values.icon} onChange={(icon) => update({ icon })} />
      <ColorPicker value={values.color} onChange={(color) => update({ color })} />

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </button>
        )}
        <button type="button" onClick={submit} disabled={saving || (requireChanges && !dirty)} className={buttonVariants({ className: "min-w-36" })}>
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
