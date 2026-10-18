"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { SectionHeader } from "./SectionHeader";

type Plan = {
  name: string;
  description: string;
  monthly: number | null;
  features: string[];
  cta: string;
  featured?: boolean;
};

const plans: Plan[] = [
  {
    name: "Free",
    description: "For individuals exploring AI agents.",
    monthly: 0,
    features: ["3 agents", "500 runs / month", "Community integrations", "7-day run history"],
    cta: "Start for free",
  },
  {
    name: "Pro",
    description: "For teams shipping agents to production.",
    monthly: 29,
    features: ["Unlimited agents", "25,000 runs / month", "All 100+ integrations", "Workflows & scheduling", "90-day run history"],
    cta: "Start 14-day trial",
    featured: true,
  },
  {
    name: "Enterprise",
    description: "For organizations with advanced needs.",
    monthly: null,
    features: ["Unlimited runs", "SSO & audit logs", "Dedicated infrastructure", "Priority support & SLA"],
    cta: "Contact sales",
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Pricing"
          title="Simple pricing that scales with you"
          description="Start free. Upgrade when your agents are ready for more."
        />

        <div className="mt-8 flex justify-center">
          <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-xl border border-border bg-muted p-1">
            {[
              { label: "Monthly", value: false },
              { label: "Yearly", value: true },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={yearly === option.value}
                onClick={() => setYearly(option.value)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                  yearly === option.value
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
                {option.value && (
                  <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-[10px] font-bold text-success">
                    −20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const price =
              plan.monthly === null
                ? "Custom"
                : `$${yearly ? Math.round(plan.monthly * 0.8) : plan.monthly}`;

            return (
              <article
                key={plan.name}
                className={cn(
                  "relative rounded-2xl border bg-card p-7 transition-all duration-300 hover:-translate-y-1",
                  plan.featured
                    ? "border-primary shadow-2xl shadow-primary/20 lg:-mt-4 lg:pb-10"
                    : "border-border hover:shadow-xl hover:shadow-primary/5",
                )}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground shadow-lg shadow-primary/30">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{plan.description}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">{price}</span>
                  {plan.monthly !== null && (
                    <span className="text-sm text-muted-foreground">/ month</span>
                  )}
                </p>
                <Link
                  href="/signup"
                  className={buttonVariants({
                    variant: plan.featured ? "primary" : "secondary",
                    className: "mt-6 w-full",
                  })}
                >
                  {plan.cta}
                </Link>
                <ul className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
