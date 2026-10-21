"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** "modal" is centered; "sheet" slides in from the right. */
  variant?: "modal" | "sheet";
  className?: string;
};

/**
 * Accessible modal / side sheet on the native <dialog> element (focus trap,
 * Escape and backdrop handling come from the browser).
 */
export function Dialog({ open, onOpenChange, title, description, children, footer, variant = "modal", className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      className={cn(
        "border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm",
        variant === "modal"
          ? "m-auto max-h-[min(90dvh,820px)] w-[calc(100%-2rem)] max-w-xl rounded-2xl border open:animate-fade-up"
          : "my-0 ml-auto mr-0 h-dvh max-h-dvh w-full max-w-xl border-l open:animate-fade-in sm:w-[min(560px,92vw)]",
        className,
      )}
    >
      {/* Inner wrapper keeps backdrop clicks distinguishable from content clicks. */}
      <div className={cn("flex flex-col", variant === "modal" ? "max-h-[min(90dvh,820px)]" : "h-full")}>
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
            {description && <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="-mr-2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">{footer}</footer>}
      </div>
    </dialog>
  );
}
