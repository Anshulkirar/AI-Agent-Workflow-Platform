"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/settings/store";
import type { AvatarColor } from "@/lib/settings/types";
import type { Meter } from "@/lib/settings/usage";
import { meterPercent } from "@/lib/settings/usage";

export function SettingsHeader({ title, description, actions }: { title: string; description: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col justify-between gap-3 animate-fade-up sm:flex-row sm:items-end">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** A settings card: title + description, content, optional footer. */
export function Section({
  title,
  description,
  action,
  footer,
  children,
  className,
  tone = "default",
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "default" | "danger";
}) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm shadow-black/[0.02] animate-fade-up",
        tone === "danger" ? "border-danger/30" : "border-border",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <h3 className={cn("text-[15px] font-semibold", tone === "danger" && "text-danger")}>{title}</h3>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
      {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/40 px-5 py-3 sm:px-6">{footer}</div>}
    </section>
  );
}

/** Callout for anything simulated in this frontend-only build. */
export function DemoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary-soft/50 px-3.5 py-3 text-xs leading-5 text-foreground/80", className)}>
      <Info size={15} className="mt-0.5 shrink-0 text-primary" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Local editable copy of a stored value. Re-syncs from the store (e.g. another
 * tab) while there are no unsaved edits.
 */
export function useDraft<T>(value: T) {
  const [draft, setDraft] = useState(value);
  const [baseline, setBaseline] = useState(value);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  useEffect(() => {
    if (JSON.stringify(value) === JSON.stringify(baseline)) return;
    setBaseline(value);
    if (!dirty) setDraft(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const patch = (next: Partial<T>) => setDraft((current) => ({ ...current, ...next }));
  return { draft, setDraft, patch, dirty, reset: () => setDraft(baseline) };
}

/** Sticky bar shown while a form has unsaved changes. */
export function SaveBar({ dirty, onSave, onDiscard, label = "You have unsaved changes" }: { dirty: boolean; onSave: () => void; onDiscard: () => void; label?: string }) {
  if (!dirty) return null;
  return (
    <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-card/95 px-4 py-3 shadow-xl shadow-primary/10 backdrop-blur animate-fade-up">
      <p className="flex items-center gap-2 text-sm font-medium">
        <span className="size-2 rounded-full bg-amber-500" />
        {label}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onDiscard} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Discard
        </button>
        <button type="button" onClick={onSave} className={buttonVariants({ size: "sm" })}>
          Save changes
        </button>
      </div>
    </div>
  );
}

export const avatarGradients: Record<AvatarColor, string> = {
  indigo: "from-[#8b7dff] to-[#4338ca]",
  violet: "from-violet-400 to-fuchsia-600",
  sky: "from-sky-400 to-blue-600",
  emerald: "from-emerald-400 to-teal-600",
  amber: "from-amber-400 to-orange-600",
  rose: "from-rose-400 to-pink-600",
};

export function UserAvatar({
  name,
  email,
  color,
  size = "md",
  className,
}: {
  name: string;
  email?: string;
  color: AvatarColor;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-linear-to-br font-bold text-white ring-2 ring-card",
        avatarGradients[color] ?? avatarGradients.indigo,
        size === "sm" && "size-8 text-[11px]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-11 text-sm",
        size === "xl" && "size-20 text-2xl",
        className,
      )}
    >
      {initials(name, email)}
    </span>
  );
}

/** Usage bar that turns amber at 80% and red at 100%. */
export function UsageMeter({
  label,
  meter,
  format,
  hint,
}: {
  label: string;
  meter: Meter;
  format: (value: number) => string;
  hint?: ReactNode;
}) {
  const percent = meterPercent(meter);
  const tone = meter.limit === null ? "bg-primary" : percent >= 100 ? "bg-danger" : percent >= 80 ? "bg-amber-500" : "bg-primary";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{format(meter.used)}</span>
          {meter.limit === null ? " · Unlimited" : ` of ${format(meter.limit)}`}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={meter.limit ?? undefined}
        aria-valuenow={Math.round(meter.used * 100) / 100}
      >
        <div className={cn("h-full origin-left rounded-full animate-grow-x", tone)} style={{ width: meter.limit === null ? "100%" : `${Math.max(percent, 1.5)}%`, opacity: meter.limit === null ? 0.25 : 1 }} />
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
