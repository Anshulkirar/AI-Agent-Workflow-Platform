"use client";

import { useEffect, useId, useRef, useState, type ComponentType, type KeyboardEvent, type ReactNode } from "react";
import { EllipsisVertical } from "lucide-react";
import { cn } from "@/lib/cn";

export type MenuItem =
  | {
      label: string;
      icon?: ComponentType<{ size?: number; className?: string }>;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
    }
  | "separator";

type DropdownMenuProps = {
  items: MenuItem[];
  label: string;
  align?: "start" | "end";
  className?: string;
  /** Replaces the kebab icon, e.g. a labeled "Export" button. */
  trigger?: ReactNode;
  triggerClassName?: string;
};

/** Kebab menu with click-outside, Escape and arrow-key support. */
export function DropdownMenu({ items, label, align = "end", className, trigger, triggerClassName }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not(:disabled)")?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [
      ...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)") ?? []),
    ];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      buttons[(index + delta + buttons.length) % buttons.length]?.focus();
    } else if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
      if (event.key === "Escape") triggerRef.current?.focus();
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={
          trigger
            ? triggerClassName
            : cn(
                "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                open && "bg-muted text-foreground",
              )
        }
      >
        {trigger ?? <EllipsisVertical size={16} />}
      </button>

      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          onKeyDown={onMenuKeyDown}
          className={cn(
            "absolute top-full z-40 mt-1.5 w-48 rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-black/10 animate-fade-in",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, index) =>
            item === "separator" ? (
              <div key={`sep-${index}`} role="separator" className="my-1 h-px bg-border" />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors disabled:pointer-events-none disabled:opacity-50",
                  item.danger
                    ? "text-danger hover:bg-danger-soft focus-visible:bg-danger-soft"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground",
                )}
              >
                {item.icon && <item.icon size={15} />}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
