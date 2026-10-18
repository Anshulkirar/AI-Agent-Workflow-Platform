import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { topAgents } from "@/lib/mock-data";
import { Card, CardHeader } from "./Card";

export function TopAgents() {
  const maxRuns = Math.max(...topAgents.map((agent) => agent.runs));

  return (
    <Card>
      <CardHeader
        title="Top Agents"
        subtitle="Most executed this week"
        action={
          <Link
            href="/agents"
            className="group inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            All agents
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />

      <ul className="space-y-4">
        {topAgents.map((agent, index) => {
          const Icon = agent.icon;
          return (
            <li key={agent.name} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  agent.iconClass,
                )}
              >
                <Icon size={16} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{agent.name}</p>
                  <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {agent.runs} runs
                  </p>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${agent.runs} runs`}
                >
                  <div
                    className="h-full origin-left rounded-full bg-primary animate-grow-x"
                    style={{
                      width: `${(agent.runs / maxRuns) * 100}%`,
                      animationDelay: `${index * 120}ms`,
                    }}
                  />
                </div>
              </div>

              <span
                className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums"
                title="Success rate"
              >
                {agent.successRate}%
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
