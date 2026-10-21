"use client";

import { useState, type DragEvent } from "react";
import { GripVertical, Search, X } from "lucide-react";
import { nodeTemplates, type NodeTemplate } from "@/lib/agents/catalog";
import { cn } from "@/lib/cn";
import { DND_MIME } from "./types";

const groups: NodeTemplate["group"][] = ["Triggers", "AI", "Agents", "Logic", "Tools", "Output"];

export function NodePalette({
  onAdd,
  onClose,
  extraTemplates = [],
}: {
  onAdd: (template: NodeTemplate) => void;
  onClose?: () => void;
  /** Additional entries, e.g. your agents. */
  extraTemplates?: NodeTemplate[];
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const visible = [...nodeTemplates, ...extraTemplates].filter((template) =>
    `${template.label} ${template.description}`.toLowerCase().includes(term),
  );

  const onDragStart = (event: DragEvent<HTMLButtonElement>, template: NodeTemplate) => {
    event.dataTransfer.setData(DND_MIME, template.key);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-sm font-semibold">Nodes</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close node palette"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="px-4 pb-3">
        <label className="flex h-9 items-center gap-2 rounded-xl border border-input bg-card px-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
          <Search size={14} className="text-subtle-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools…"
            aria-label="Search nodes"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
          />
        </label>
        <p className="mt-2 text-[11px] text-muted-foreground">Drag onto the canvas, or click to add.</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {groups.map((group) => {
          const items = visible.filter((template) => template.group === group);
          if (!items.length) return null;
          return (
            <section key={group}>
              <h3 className="mb-1 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle-foreground">
                {group}
              </h3>
              <ul className="space-y-0.5">
                {items.map((template) => {
                  const Icon = template.icon;
                  return (
                    <li key={template.key}>
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => onDragStart(event, template)}
                        onClick={() => onAdd(template)}
                        title={template.description}
                        className="group flex w-full cursor-grab items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-muted active:cursor-grabbing"
                      >
                        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", template.tone)}>
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{template.label}</span>
                        <GripVertical size={14} className="text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {!visible.length && <p className="px-1 py-6 text-center text-sm text-muted-foreground">No nodes match.</p>}
      </div>
    </div>
  );
}
