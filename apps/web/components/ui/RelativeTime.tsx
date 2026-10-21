"use client";

import { formatDate, formatRelative } from "@/lib/format";
import { useHydrated } from "./use-hydrated";

/** Shows "5 min ago" on the client and a stable date during SSR. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const hydrated = useHydrated();

  return (
    <time dateTime={iso} title={formatDate(iso)} className={className}>
      {hydrated ? formatRelative(iso) : formatDate(iso)}
    </time>
  );
}
