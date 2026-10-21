import type { PlanId } from "./types";

/** Plan catalog shared by the landing page pricing and Settings → Billing. */
export type Plan = {
  id: PlanId;
  name: string;
  description: string;
  /** USD per month; null = custom pricing. */
  monthly: number | null;
  features: string[];
  cta: string;
  featured?: boolean;
  /** null = unlimited. */
  limits: {
    runs: number | null;
    agents: number | null;
    seats: number | null;
    storageGb: number | null;
    historyDays: number;
  };
};

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "For individuals exploring AI agents.",
    monthly: 0,
    features: ["3 agents", "500 runs / month", "Community integrations", "7-day run history"],
    cta: "Start for free",
    limits: { runs: 500, agents: 3, seats: 2, storageGb: 1, historyDays: 7 },
  },
  {
    id: "pro",
    name: "Pro",
    description: "For teams shipping agents to production.",
    monthly: 29,
    features: ["Unlimited agents", "25,000 runs / month", "All 100+ integrations", "Workflows & scheduling", "90-day run history"],
    cta: "Start 14-day trial",
    featured: true,
    limits: { runs: 25_000, agents: null, seats: 10, storageGb: 20, historyDays: 90 },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For organizations with advanced needs.",
    monthly: null,
    features: ["Unlimited runs", "SSO & audit logs", "Dedicated infrastructure", "Priority support & SLA"],
    cta: "Contact sales",
    limits: { runs: null, agents: null, seats: null, storageGb: null, historyDays: 365 },
  },
];

export const plansById = Object.fromEntries(plans.map((plan) => [plan.id, plan])) as Record<PlanId, Plan>;

/** Yearly billing is 20% off. */
export function planPrice(plan: Plan, yearly: boolean) {
  if (plan.monthly === null) return null;
  return yearly ? Math.round(plan.monthly * 0.8) : plan.monthly;
}
