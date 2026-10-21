import {
  Bot,
  CircleCheck,
  CirclePlay,
  Code,
  Coins,
  FileSearch,
  PenLine,
  type LucideIcon,
} from "lucide-react";

// Sample data used by the dashboard until the API is connected.

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
