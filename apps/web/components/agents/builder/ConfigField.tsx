"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field, Select, Slider, inputClass, textareaClass } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import type { ToolField } from "@/lib/agents/catalog";
import type { NodeConfigValue } from "@/lib/agents/types";
import { cn } from "@/lib/cn";

/** Renders one config field from its schema (node settings, tool connections). */
export function ConfigField({
  field,
  value,
  idPrefix,
  onChange,
  error,
  required,
}: {
  field: ToolField;
  value: NodeConfigValue | undefined;
  idPrefix: string;
  onChange: (value: NodeConfigValue) => void;
  error?: string;
  required?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const id = `${idPrefix}-${field.key}`;
  const current = value ?? field.defaultValue;
  const label = required ? `${field.label} *` : field.label;
  const invalid = error ? true : undefined;
  const describedBy = error ? `${id}-error` : undefined;

  if (field.type === "switch") {
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{field.label}</p>
          {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
        </div>
        <Switch checked={Boolean(current)} onCheckedChange={onChange} label={field.label} />
      </div>
    );
  }

  return (
    <Field label={label} htmlFor={id} hint={field.hint} error={error}>
      {field.type === "textarea" ? (
        <textarea
          id={id}
          rows={4}
          value={String(current)}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={cn(textareaClass, "font-mono text-xs")}
        />
      ) : field.type === "select" ? (
        <Select id={id} value={String(current)} onChange={(event) => onChange(event.target.value)}>
          {(field.options ?? []).map((option) => {
            const { value: optionValue, label: optionLabel } = typeof option === "string" ? { value: option, label: option } : option;
            return (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </Select>
      ) : field.type === "slider" ? (
        <Slider
          id={id}
          value={Number(current)}
          min={field.min ?? 0}
          max={field.max ?? 1}
          step={field.step ?? 0.1}
          onChange={onChange}
          format={(number) => number.toFixed(1)}
        />
      ) : field.type === "password" ? (
        <div className="relative">
          <input
            id={id}
            type={revealed ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            value={String(current)}
            placeholder={field.placeholder}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className={cn(inputClass, "pr-10 font-mono")}
          />
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? `Hide ${field.label}` : `Show ${field.label}`}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-subtle-foreground hover:text-foreground"
          >
            {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      ) : (
        <input
          id={id}
          type={field.type === "number" ? "number" : "text"}
          value={String(current)}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          onChange={(event) =>
            onChange(field.type === "number" ? Number(event.target.value) : event.target.value)
          }
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={inputClass}
        />
      )}
    </Field>
  );
}
