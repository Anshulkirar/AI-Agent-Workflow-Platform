"use client";

import type { ComponentType, ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Icon = ComponentType<{ size?: number; className?: string }>;

/** Icon + label + value summary tile used at the top of list pages. */
export function StatTile({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  index = 0,
}: {
  label: string;
  value: ReactNode;
  icon: Icon;
  tone: string;
  hint?: ReactNode;
  index?: number;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/[0.02] animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone)}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold tabular-nums tracking-tight">{value}</p>
        {hint && <p className="truncate text-[11px] text-subtle-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/** Pill tabs with counts for filtering a list. */
export function FilterTabs<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number; dot?: string }[];
}) {
  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:pb-0">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {option.dot && <span className={cn("size-1.5 rounded-full", option.dot)} />}
            {option.label}
            {option.count !== undefined && (
              <span className={cn("rounded-md px-1.5 text-[11px] tabular-nums", active ? "bg-card/70" : "bg-muted")}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex h-10 min-w-0 items-center gap-2 rounded-xl border border-border bg-card px-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10",
        className,
      )}
    >
      <Search size={15} className="shrink-0 text-subtle-foreground" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="rounded p-0.5 text-subtle-foreground hover:text-foreground">
          <X size={14} />
        </button>
      )}
    </label>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: Icon;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center animate-fade-in",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon size={22} />
      </span>
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
