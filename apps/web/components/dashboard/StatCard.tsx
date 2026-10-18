import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Stat } from "@/lib/mock-data";

export function StatCard({ stat, index = 0 }: { stat: Stat; index?: number }) {
  const Icon = stat.icon;
  const TrendIcon = stat.direction === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <article
      className="group rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/[0.02] transition-all duration-300 animate-fade-up hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
            stat.iconClass,
          )}
        >
          <Icon size={18} />
        </span>
      </div>

      <p className="mt-3 text-[28px] font-bold leading-none tracking-tight">
        {stat.value}
      </p>

      <p
        className={cn(
          "mt-3 flex items-center gap-1 text-xs font-medium",
          stat.sentiment === "positive" ? "text-success" : "text-danger",
        )}
      >
        <TrendIcon size={14} aria-hidden />
        {stat.change}
      </p>
    </article>
  );
}
