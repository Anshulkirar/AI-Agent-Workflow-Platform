"use client";

import { Check } from "lucide-react";
import { agentColors, agentIcons } from "@/lib/agents/catalog";
import type { AgentColor, AgentIconKey } from "@/lib/agents/types";
import { cn } from "@/lib/cn";

export function IconPicker({
  value,
  onChange,
  label = "Icon",
}: {
  value: AgentIconKey;
  onChange: (icon: AgentIconKey) => void;
  label?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-6 gap-2 sm:grid-cols-12">
        {(Object.keys(agentIcons) as AgentIconKey[]).map((key) => {
          const { icon: Icon, label: name } = agentIcons[key];
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={name}
              title={name}
              onClick={() => onChange(key)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl border transition-all",
                selected
                  ? "border-primary bg-primary-soft text-primary-soft-foreground ring-4 ring-primary/15"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <Icon className="size-4.5" />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ColorPicker({
  value,
  onChange,
  label = "Color",
}: {
  value: AgentColor;
  onChange: (color: AgentColor) => void;
  label?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2.5">
        {(Object.keys(agentColors) as AgentColor[]).map((key) => {
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={agentColors[key].label}
              title={agentColors[key].label}
              onClick={() => onChange(key)}
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-card transition-transform hover:scale-110",
                agentColors[key].swatch,
                selected && "ring-2 ring-foreground/70",
              )}
            >
              {selected && <Check size={14} strokeWidth={3} />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
