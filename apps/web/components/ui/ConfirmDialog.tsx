"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { buttonVariants } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
};

/** Accessible confirmation modal built on the native <dialog> element. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => onOpenChange(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      aria-labelledby="confirm-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm open:animate-fade-up"
    >
      <div className="p-6">
        <div className="flex gap-4">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              tone === "danger" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary-soft-foreground",
            )}
          >
            <TriangleAlert size={18} />
          </span>
          <div>
            <h2 id="confirm-dialog-title" className="text-base font-semibold">
              {title}
            </h2>
            {description && (
              <div className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</div>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            onClick={() => onOpenChange(false)}
            className={buttonVariants({ variant: "secondary" })}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={buttonVariants({
              className:
                tone === "danger"
                  ? "bg-danger shadow-danger/25 hover:bg-danger/90 hover:shadow-danger/30"
                  : undefined,
            })}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
