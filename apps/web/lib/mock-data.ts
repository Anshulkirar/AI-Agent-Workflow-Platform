import {
  Bot,
  CircleCheck,
  CirclePlay,
  Code,
  Coins,
  FileSearch,
  Globe,
  PenLine,
  ChartColumn,
  type LucideIcon,
} from "lucide-react";

// Sample data used by the dashboard until the API is connected.

export const currentUser = {
  name: "Anshul",
  fullName: "Anshul",
  plan: "Free Plan",
  initials: "AN",
};

export type Stat = {
  label: string;
  value: string;
  change: string;
  /** Whether the change is good news (green) or bad news (red). */
  sentiment: "positive" | "negative";
  direction: "up" | "down";
  icon: LucideIcon;
  iconClass: string;
};

export const stats: Stat[] = [
  {
    label: "Total Agents",
    value: "12",
    change: "+2 from last week",
    sentiment: "positive",
    direction: "up",
    icon: Bot,
    iconClass: "bg-primary-soft text-primary-soft-foreground",
  },
  {
    label: "Total Runs",
    value: "1,248",
    change: "+16% from last week",
    sentiment: "positive",
    direction: "up",
    icon: CirclePlay,
    iconClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    label: "Success Rate",
    value: "96.3%",
    change: "+2.1% from last week",
    sentiment: "positive",
    direction: "up",
    icon: CircleCheck,
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Tokens Used",
    value: "2.4M",
    change: "+320K from last week",
    sentiment: "negative",
    direction: "up",
    icon: Coins,
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
];

export type RunStatus = "success" | "failed";

export type Run = {
  id: string;
  agent: string;
  task: string;
  time: string;
  duration: string;
  status: RunStatus;
  icon: LucideIcon;
  iconClass: string;
};

export const recentRuns: Run[] = [
  {
    id: "run_1",
    agent: "Research Agent",
    task: "Analyze AI agent frameworks",
    time: "2 min ago",
    duration: "12.4s",
    status: "success",
    icon: FileSearch,
    iconClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    id: "run_2",
    agent: "Code Assistant",
    task: "Review TypeScript pull request",
    time: "15 min ago",
    duration: "32.1s",
    status: "success",
    icon: Code,
    iconClass: "bg-primary-soft text-primary-soft-foreground",
  },
  {
    id: "run_3",
    agent: "Data Analyst",
    task: "Process Q3 sales dataset",
    time: "1 hour ago",
    duration: "18.7s",
    status: "failed",
    icon: ChartColumn,
    iconClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  {
    id: "run_4",
    agent: "Content Generator",
    task: "Draft product launch blog",
    time: "2 hours ago",
    duration: "45.2s",
    status: "success",
    icon: PenLine,
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "run_5",
    agent: "Web Research",
    task: "Collect competitor pricing",
    time: "3 hours ago",
    duration: "21.3s",
    status: "success",
    icon: Globe,
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
];

export type TopAgent = {
  name: string;
  runs: number;
  successRate: number;
  icon: LucideIcon;
  iconClass: string;
};

export const topAgents: TopAgent[] = [
  {
    name: "Research Agent",
    runs: 342,
    successRate: 98,
    icon: FileSearch,
    iconClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    name: "Code Assistant",
    runs: 281,
    successRate: 94,
    icon: Code,
    iconClass: "bg-primary-soft text-primary-soft-foreground",
  },
  {
    name: "Content Generator",
    runs: 196,
    successRate: 97,
    icon: PenLine,
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
];

export type ActivityPoint = {
  date: string;
  label: string;
  success: number;
  failed: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Last seven days match the reference design; earlier days are generated
// deterministically so server and client render identical markup.
const lastWeek: [number, number][] = [
  [42, 3],
  [60, 5],
  [49, 2],
  [75, 4],
  [56, 3],
  [82, 6],
  [68, 2],
];

function seeded(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export const runActivity: ActivityPoint[] = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 9, 16 - (29 - index)));
  const fixed = lastWeek[index - 23];

  return {
    date: date.toISOString().slice(0, 10),
    label: `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`,
    success: fixed ? fixed[0] : Math.round(36 + seeded(index) * 42),
    failed: fixed ? fixed[1] : Math.round(1 + seeded(index + 100) * 5),
  };
});
