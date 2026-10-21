import type { RunStatus, RunTrigger } from "./types";

export function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(Math.round(seconds % 60)).padStart(2, "0")}s`;
}

/** Local date + time, e.g. "Oct 16, 2026, 10:24:12 AM". Client-only (time zone). */
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

export const runStatusMeta: Record<RunStatus, { label: string; badge: string; dot: string }> = {
  running: { label: "Running", badge: "bg-primary-soft text-primary-soft-foreground", dot: "bg-primary" },
  success: { label: "Success", badge: "bg-success-soft text-success", dot: "bg-success" },
  failed: { label: "Failed", badge: "bg-danger-soft text-danger", dot: "bg-danger" },
  cancelled: { label: "Cancelled", badge: "bg-muted text-muted-foreground", dot: "bg-subtle-foreground" },
};

export const triggerLabels: Record<RunTrigger, string> = {
  manual: "Manual",
  api: "API",
  schedule: "Schedule",
  webhook: "Webhook",
  test: "Test run",
  rerun: "Rerun",
};
