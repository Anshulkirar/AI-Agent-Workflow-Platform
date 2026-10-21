"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, Search, SearchX } from "lucide-react";
import { toolCategories, tools, type ToolCategory } from "@/lib/agents/catalog";
import { cn } from "@/lib/cn";
import { useToolInstalls } from "@/lib/tools/store";
import type { StepProps } from "./wizard-config";

export function ToolsStep({ draft, update }: StepProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory | "All">("All");
  const installs = useToolInstalls();

  // Live status from the Tools section, so users know what still needs setup.
  const statusFor = (id: string) => {
    if (id === "custom-tool") return null;
    const install = installs.find((item) => item.id === id);
    if (!install) return { label: "Not installed", className: "bg-muted text-muted-foreground" };
    if (!install.enabled) return { label: "Disabled", className: "bg-muted text-muted-foreground" };
    if (install.status === "error") return { label: "Error", className: "bg-danger-soft text-danger" };
    if (install.status === "needs_setup") return { label: "Needs setup", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" };
    return null;
  };

  const visible = tools.filter((tool) => {
    const text = `${tool.name} ${tool.description}`.toLowerCase();
    return (category === "All" || tool.category === category) && text.includes(query.trim().toLowerCase());
  });

  const toggle = (id: string) =>
    update((current) => ({
      tools: current.tools.includes(id) ? current.tools.filter((tool) => tool !== id) : [...current.tools, id],
    }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-input bg-card px-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
          <Search size={15} className="text-subtle-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools…"
            aria-label="Search tools"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
          />
        </label>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          <span className="font-semibold text-foreground">{draft.tools.length}</span> selected
          {draft.tools.length > 0 && (
            <button
              type="button"
              onClick={() => update({ tools: [] })}
              className="ml-2 text-xs font-semibold text-primary hover:underline"
            >
              Clear
            </button>
          )}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Tools must be installed and connected before agents can call them.{" "}
        <Link href="/tools" target="_blank" className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline">
          Manage tools
          <ArrowUpRight size={12} />
        </Link>
      </p>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {(["All", ...toolCategories] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              category === item
                ? "bg-primary-soft text-primary-soft-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-sm text-muted-foreground">
          <SearchX size={20} />
          No tools match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visible.map((tool) => {
            const selected = draft.tools.includes(tool.id);
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(tool.id)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                  selected
                    ? "border-primary bg-primary-soft/50 ring-4 ring-primary/10"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tool.tone)}>
                  <Icon className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {tool.name}
                    <span className="rounded bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                      {tool.category}
                    </span>
                    {statusFor(tool.id) && (
                      <span className={cn("rounded px-1.5 py-px text-[10px] font-semibold", statusFor(tool.id)!.className)}>
                        {statusFor(tool.id)!.label}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{tool.description}</span>
                </span>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                  )}
                >
                  {selected && <Check size={13} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
