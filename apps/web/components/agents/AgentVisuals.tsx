import { agentColors, agentIcons, statusMeta, toolsById } from "@/lib/agents/catalog";
import type { Agent, AgentColor, AgentIconKey, AgentStatus } from "@/lib/agents/types";
import { cn } from "@/lib/cn";

export function AgentAvatar({
  icon,
  color,
  size = "md",
  className,
}: {
  icon: AgentIconKey;
  color: AgentColor;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = agentIcons[icon]?.icon ?? agentIcons.bot.icon;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === "sm" && "size-8 rounded-lg [&_svg]:size-4",
        size === "md" && "size-11 rounded-xl [&_svg]:size-5",
        size === "lg" && "size-14 rounded-2xl [&_svg]:size-7",
        agentColors[color]?.tile ?? agentColors.violet.tile,
        className,
      )}
    >
      <Icon />
    </span>
  );
}

export function AgentStatusBadge({ status, className }: { status: AgentStatus; className?: string }) {
  const meta = statusMeta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold",
        meta.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot, status === "active" && "animate-pulse")} />
      {meta.label}
    </span>
  );
}

/** Overlapping icons of an agent's first few tools. */
export function ToolStack({ agent, max = 4 }: { agent: Pick<Agent, "tools">; max?: number }) {
  const shown = agent.tools.slice(0, max);
  const extra = agent.tools.length - shown.length;
  if (!agent.tools.length) {
    return <span className="text-xs text-subtle-foreground">No tools</span>;
  }
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((toolId) => {
        const tool = toolsById.get(toolId);
        if (!tool) return null;
        const Icon = tool.icon;
        return (
          <span
            key={toolId}
            title={tool.name}
            className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-muted-foreground"
          >
            <Icon className="size-3" />
          </span>
        );
      })}
      {extra > 0 && (
        <span className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground">
          +{extra}
        </span>
      )}
    </div>
  );
}
