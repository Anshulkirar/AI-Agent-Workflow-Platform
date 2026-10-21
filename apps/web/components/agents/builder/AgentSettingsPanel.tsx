"use client";

import { ArrowUpRight, Keyboard, X } from "lucide-react";
import type { ModelSettings } from "@/lib/agents/types";
import { ModelSettingsFields } from "../wizard/ModelStep";

const shortcuts = [
  ["Delete", "Remove selection"],
  ["Ctrl + S", "Save workflow"],
  ["Shift + drag", "Select multiple"],
];

export function AgentSettingsPanel({
  title = "Agent Settings",
  onOpenAdvanced,
  settings,
  onChange,
  stats,
  onClose,
}: {
  title?: string;
  onOpenAdvanced: () => void;
  settings: ModelSettings;
  onChange: (patch: Partial<ModelSettings>) => void;
  stats: { nodes: number; edges: number; tools: number };
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-[11px] text-muted-foreground">Select a node to configure it.</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <ModelSettingsFields compact settings={settings} onChange={onChange} />

        <button
          type="button"
          onClick={onOpenAdvanced}
          className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm font-medium transition hover:border-primary/40 hover:bg-muted/50"
        >
          Advanced settings
          <ArrowUpRight size={15} className="text-muted-foreground" />
        </button>

        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Nodes", stats.nodes],
            ["Links", stats.edges],
            ["Tools", stats.tools],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse rounded-xl bg-muted/60 py-2.5">
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="text-lg font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Keyboard size={13} />
            Shortcuts
          </p>
          <ul className="space-y-1.5">
            {shortcuts.map(([keys, action]) => (
              <li key={keys} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{action}</span>
                <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-semibold">
                  {keys}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
