"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { dismissToast, useToasts } from "@/lib/toast";

const icons = { success: CircleCheck, error: CircleAlert, info: Info };
const tones = {
  success: "text-success",
  error: "text-danger",
  info: "text-primary",
};

export function Toaster() {
  const toasts = useToasts();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      {toasts.map((toast) => {
        const Icon = icons[toast.tone];
        return (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3.5 shadow-xl shadow-black/10 animate-fade-up sm:w-[360px]"
          >
            <Icon size={18} className={cn("mt-px shrink-0", tones[toast.tone])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{toast.description}</p>
              )}
            </div>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismissToast(toast.id);
                }}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-soft"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 rounded-md p-0.5 text-subtle-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
