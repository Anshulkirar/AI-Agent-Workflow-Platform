import { BadgeCheck, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCompact } from "@/lib/format";
import { statusMeta, type ResolvedTool } from "@/lib/tools/catalog";

export function ToolIcon({ tool, size = "md" }: { tool: Pick<ResolvedTool, "icon" | "tone">; size?: "sm" | "md" | "lg" }) {
  const Icon = tool.icon;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === "sm" && "size-8 rounded-lg [&_svg]:size-4",
        size === "md" && "size-11 rounded-xl [&_svg]:size-5",
        size === "lg" && "size-14 rounded-2xl [&_svg]:size-7",
        tool.tone,
      )}
    >
      <Icon />
    </span>
  );
}

/** Connection status, or "Disabled" when the tool is switched off. */
export function ToolStatusBadge({ tool, className }: { tool: ResolvedTool; className?: string }) {
  const install = tool.install;
  if (!install) return null;
  if (!install.enabled) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground", className)}>
        <span className="size-1.5 rounded-full bg-subtle-foreground" />
        Disabled
      </span>
    );
  }
  const meta = statusMeta[install.status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold", meta.badge, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function PublisherLine({ tool }: { tool: ResolvedTool }) {
  return (
    <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
      <span className="truncate">{tool.isCustom ? "Custom tool" : tool.meta?.publisher}</span>
      {tool.meta?.verified && <BadgeCheck size={13} className="shrink-0 text-primary" aria-label="Verified publisher" />}
      <span aria-hidden>·</span>
      <span className="truncate">{tool.category}</span>
    </p>
  );
}

export function RatingLine({ tool, compact = false }: { tool: ResolvedTool; compact?: boolean }) {
  if (!tool.meta) return null;
  return (
    <p className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
      <span className="flex items-center gap-1 font-semibold text-foreground">
        <Star size={12} className="fill-amber-400 text-amber-400" />
        {tool.meta.rating.toFixed(1)}
      </span>
      <span aria-hidden>·</span>
      {formatCompact(tool.meta.installs)} installs
      {!compact && (
        <>
          <span aria-hidden>·</span>
          {tool.meta.pricing}
        </>
      )}
    </p>
  );
}
