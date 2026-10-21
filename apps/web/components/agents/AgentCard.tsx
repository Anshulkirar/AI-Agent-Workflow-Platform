"use client";

import Link from "next/link";
import { Activity, Clock3, Plus } from "lucide-react";
import { DropdownMenu, type MenuItem } from "@/components/ui/DropdownMenu";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Switch } from "@/components/ui/Switch";
import type { Agent } from "@/lib/agents/types";
import { cn } from "@/lib/cn";
import { AgentAvatar, AgentStatusBadge, ToolStack } from "./AgentVisuals";

type AgentItemProps = {
  agent: Agent;
  menuItems: MenuItem[];
  onToggle: () => void;
  index?: number;
};

function ActiveSwitch({ agent, onToggle }: Pick<AgentItemProps, "agent" | "onToggle">) {
  const toggleable = agent.status === "active" || agent.status === "inactive";
  return (
    <Switch
      size="sm"
      checked={agent.status === "active"}
      onCheckedChange={onToggle}
      disabled={!toggleable}
      label={`${agent.name} enabled`}
      title={toggleable ? undefined : agent.status === "draft" ? "Publish the draft to enable it" : "Restore the agent to enable it"}
      className="relative z-10"
    />
  );
}

export function AgentCard({ agent, menuItems, onToggle, index = 0 }: AgentItemProps) {
  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/[0.02] transition-all duration-300 animate-fade-up hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 has-[[aria-expanded=true]]:z-20",
        agent.status === "archived" && "opacity-75",
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <AgentAvatar icon={agent.icon} color={agent.color} />
        <div className="relative z-10 flex items-center gap-1">
          {agent.status !== "active" && <AgentStatusBadge status={agent.status} />}
          <DropdownMenu label={`Actions for ${agent.name}`} items={menuItems} />
        </div>
      </div>

      <h3 className="mt-4 truncate text-[15px] font-semibold">
        <Link
          href={`/agents/${agent.id}/builder`}
          className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {agent.name}
        </Link>
      </h3>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
        {agent.description}
      </p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <ToolStack agent={agent} />
        <span className="flex items-center gap-1 text-xs text-subtle-foreground">
          <Clock3 size={12} />
          {agent.lastRunAt ? <RelativeTime iso={agent.lastRunAt} /> : "Never run"}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{agent.tools.length}</span> tools ·{" "}
          <span className="font-semibold text-foreground">{agent.runs.toLocaleString("en-US")}</span> runs
          {agent.runs > 0 && (
            <>
              {" "}· <span className="font-semibold text-success">{agent.successRate}%</span>
            </>
          )}
        </p>
        <ActiveSwitch agent={agent} onToggle={onToggle} />
      </div>
    </article>
  );
}

export function AgentRow({ agent, menuItems, onToggle }: AgentItemProps) {
  return (
    <li className="group relative grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 has-[[aria-expanded=true]]:z-20 md:grid-cols-[minmax(0,2.4fr)_110px_120px_90px_120px_auto] sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <AgentAvatar icon={agent.icon} color={agent.color} size="sm" />
        <div className="min-w-0">
          <Link
            href={`/agents/${agent.id}/builder`}
            className="block truncate text-sm font-semibold outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
          >
            {agent.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{agent.description}</p>
        </div>
      </div>
      <div className="hidden md:block">
        <AgentStatusBadge status={agent.status} />
      </div>
      <div className="hidden md:block">
        <ToolStack agent={agent} max={3} />
      </div>
      <p className="hidden items-center gap-1 text-sm tabular-nums md:flex">
        <Activity size={13} className="text-subtle-foreground" />
        {agent.runs.toLocaleString("en-US")}
      </p>
      <p className="hidden text-xs text-muted-foreground md:block">
        {agent.lastRunAt ? <RelativeTime iso={agent.lastRunAt} /> : "Never run"}
      </p>
      <div className="relative z-10 flex items-center gap-2">
        <ActiveSwitch agent={agent} onToggle={onToggle} />
        <DropdownMenu label={`Actions for ${agent.name}`} items={menuItems} />
      </div>
    </li>
  );
}

export function NewAgentCard() {
  return (
    <Link
      href="/agents/new"
      className="group flex min-h-[236px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-5 text-center transition-all hover:border-primary/50 hover:bg-primary-soft/40 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90">
        <Plus size={22} />
      </span>
      <span className="text-sm font-semibold">Create a new agent</span>
      <span className="max-w-[200px] text-xs text-muted-foreground">
        Start from a template or configure one step by step.
      </span>
    </Link>
  );
}
