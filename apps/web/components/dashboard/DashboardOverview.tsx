import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProfileFirstName } from "@/components/settings/ProfileName";
import { stats } from "@/lib/mock-data";
import { RecentRuns } from "./RecentRuns";
import { RunActivityChart } from "./RunActivityChart";
import { StatCard } from "./StatCard";
import { TopAgents } from "./TopAgents";

export default function DashboardOverview() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 animate-fade-up sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
            Welcome back, <ProfileFirstName />!{" "}
            <span className="inline-block origin-[70%_70%] hover:animate-[wave_1s_ease-in-out]">
              👋
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your agents today.
          </p>
        </div>

        <Link
          href="/agents/new"
          className={buttonVariants({ className: "self-start sm:self-auto" })}
        >
          <Plus size={16} />
          Create Agent
        </Link>
      </section>

      <section
        aria-label="Workspace statistics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} index={index} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_1fr]">
        <RecentRuns />
        <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-1">
          <RunActivityChart />
          <TopAgents />
        </div>
      </div>

      <p className="pb-2 text-center text-[11px] text-subtle-foreground">
        Demo dashboard · data is illustrative until the API is connected.
      </p>
    </div>
  );
}
