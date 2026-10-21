"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, CreditCard, FileText, Sparkles, TriangleAlert } from "lucide-react";
import { StackedBarChart } from "@/components/analytics/charts";
import { buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, inputClass } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/PageKit";
import { useHydrated } from "@/components/ui/use-hydrated";
import { dayLabel } from "@/lib/analytics/data";
import { cn } from "@/lib/cn";
import { formatCompact, formatDate } from "@/lib/format";
import { planPrice, plans, plansById, type Plan } from "@/lib/settings/plans";
import { audit, billingStore, useBilling } from "@/lib/settings/store";
import type { Billing } from "@/lib/settings/types";
import { useUsage } from "@/lib/settings/usage";
import { toast } from "@/lib/toast";
import { DemoNote, SaveBar, Section, SettingsHeader, UsageMeter, useDraft } from "./SettingsKit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DAY = 86_400_000;

function daysLeft(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((Date.parse(iso) - Date.now()) / DAY);
}

const formatGb = (value: number) => (value < 1 ? `${Math.round(value * 1024)} MB` : `${value.toFixed(1)} GB`);

export function BillingSettings() {
  const billing = useBilling();
  const usage = useUsage();
  const hydrated = useHydrated();
  const [plansOpen, setPlansOpen] = useState(false);
  const plan = plansById[billing.planId];
  const yearly = billing.interval === "yearly";
  const price = planPrice(plan, yearly);
  const remaining = hydrated ? daysLeft(billing.trialEndsAt) : null;
  const trialOver = billing.status === "trialing" && remaining !== null && remaining <= 0;

  const details = useDraft({ billingEmail: billing.billingEmail, company: billing.company, address: billing.address, taxId: billing.taxId });
  const emailError = EMAIL.test(details.draft.billingEmail.trim()) ? undefined : "Enter a valid billing email.";

  const saveDetails = () => {
    if (emailError) {
      document.getElementById("billing-email")?.focus();
      return;
    }
    billingStore.update({ ...details.draft, billingEmail: details.draft.billingEmail.trim() });
    audit("billing", "Updated billing details");
    toast({ title: "Billing details saved", description: "They'll appear on future invoices." });
  };

  return (
    <>
      <SettingsHeader
        title="Billing & usage"
        description="Your plan, this month's usage, and billing details."
        actions={
          <button type="button" onClick={() => setPlansOpen(true)} className={buttonVariants()}>
            <Sparkles size={16} />
            Change plan
          </button>
        }
      />

      <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-linear-to-br from-primary-soft/80 via-card to-card p-5 shadow-sm animate-fade-up sm:p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Current plan
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] tracking-normal",
                  billing.status === "trialing" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-success-soft text-success",
                )}
              >
                {billing.status === "trialing" ? "Trial" : "Active"}
              </span>
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tracking-tight">{price === null ? "Custom" : `$${price}`}</span>
              {price !== null && <span className="text-sm text-muted-foreground">/ month{yearly && price > 0 ? ", billed yearly" : ""}</span>}
            </p>
            {billing.status === "trialing" && billing.trialEndsAt && (
              <p className={cn("mt-2 text-sm", trialOver ? "font-medium text-danger" : "text-muted-foreground")}>
                {trialOver
                  ? `Trial ended ${formatDate(billing.trialEndsAt)}.`
                  : `Trial ends ${formatDate(billing.trialEndsAt)}${remaining !== null ? ` · ${remaining} day${remaining === 1 ? "" : "s"} left` : ""}.`}
              </p>
            )}
          </div>
          {price !== null && price > 0 && (
            <div role="radiogroup" aria-label="Billing period" className="inline-flex self-start rounded-xl border border-border bg-card p-1">
              {(["monthly", "yearly"] as const).map((interval) => (
                <button
                  key={interval}
                  type="button"
                  role="radio"
                  aria-checked={billing.interval === interval}
                  onClick={() => {
                    billingStore.update({ interval });
                    audit("billing", `Switched to ${interval} billing`);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all",
                    billing.interval === interval ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {interval}
                  {interval === "yearly" && <span className={cn("rounded px-1 text-[10px]", billing.interval === interval ? "bg-white/20" : "bg-success-soft text-success")}>−20%</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <ul className="mt-5 grid gap-2 border-t border-border pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check size={14} className="shrink-0 text-primary" strokeWidth={3} />
              {feature}
            </li>
          ))}
        </ul>
        {billing.status === "trialing" && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-card/80 px-3.5 py-2.5 text-xs text-muted-foreground ring-1 ring-border">
            <TriangleAlert size={14} className="mt-px shrink-0 text-amber-500" />
            In a live workspace you&apos;d add a payment method to keep {plan.name} after the trial. Payments aren&apos;t connected in this demo.
          </p>
        )}
      </section>

      <Section
        title="Usage this month"
        description={`${dayLabel(usage.periodStart)} – today · resets on the 1st`}
        action={
          <Link href="/analytics?range=30d" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Detailed analytics <ArrowRight size={12} />
          </Link>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <UsageMeter
              label="Agent runs"
              meter={usage.runs}
              format={(value) => Math.round(value).toLocaleString("en-US")}
              hint={usage.liveRuns ? `Includes ${usage.liveRuns} run${usage.liveRuns === 1 ? "" : "s"} you started in this browser.` : undefined}
            />
            <UsageMeter label="Active agents" meter={usage.agents} format={(value) => String(Math.round(value))} />
            <UsageMeter
              label="Team seats"
              meter={usage.seats}
              format={(value) => String(Math.round(value))}
              hint={
                <Link href="/settings/team" className="font-semibold text-primary hover:underline">
                  Manage team
                </Link>
              }
            />
            <UsageMeter label="Knowledge storage" meter={usage.storage} format={formatGb} />
            <p className="flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="font-medium">Tokens processed</span>
              <span className="font-semibold tabular-nums">{formatCompact(usage.tokens)}</span>
            </p>
          </div>
          <div className="min-w-0">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">Daily runs</p>
            <StackedBarChart
              ariaLabel="Runs per day this month"
              height={200}
              labels={usage.dailyRuns.map(([date]) => dayLabel(date))}
              format={(value) => Math.round(value).toLocaleString("en-US")}
              series={[{ key: "runs", label: "Runs", color: "var(--chart-1)", values: usage.dailyRuns.map(([, runs]) => runs) }]}
            />
          </div>
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Payment method">
          <EmptyState
            icon={CreditCard}
            title="No payment method"
            description="Payments aren't connected in this demo, so no card details are collected and nothing is charged."
            className="py-8"
            action={
              <button type="button" disabled className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Add payment method
              </button>
            }
          />
        </Section>
        <Section title="Invoices">
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description={billing.status === "trialing" ? "Your trial hasn't been billed." : "Invoices appear here once a paid plan is billed."}
            className="py-8"
          />
        </Section>
      </div>

      <Section title="Billing details" description="Shown on invoices.">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            saveDetails();
          }}
          className="grid gap-5 md:grid-cols-2"
        >
          <Field label="Billing email" htmlFor="billing-email" error={details.dirty ? emailError : undefined}>
            <input
              id="billing-email"
              type="email"
              value={details.draft.billingEmail}
              onChange={(event) => details.patch({ billingEmail: event.target.value })}
              aria-invalid={details.dirty && emailError ? true : undefined}
              className={inputClass}
            />
          </Field>
          <Field label="Company name" htmlFor="billing-company">
            <input id="billing-company" value={details.draft.company} onChange={(event) => details.patch({ company: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Address" htmlFor="billing-address" hint="Optional">
            <input id="billing-address" value={details.draft.address} onChange={(event) => details.patch({ address: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Tax ID" htmlFor="billing-tax" hint="Optional — e.g. a VAT or GST number">
            <input id="billing-tax" value={details.draft.taxId} onChange={(event) => details.patch({ taxId: event.target.value })} className={inputClass} />
          </Field>
          <button type="submit" className="sr-only">
            Save
          </button>
        </form>
      </Section>

      <DemoNote>
        Billing is simulated: plan changes update this workspace&apos;s limits in your browser only. No payment provider is connected and you&apos;re
        never charged.
      </DemoNote>

      <SaveBar dirty={details.dirty} onSave={saveDetails} onDiscard={details.reset} label="Unsaved billing details" />

      {plansOpen && <PlanDialog open={plansOpen} onOpenChange={setPlansOpen} billing={billing} usage={usage} />}
    </>
  );
}

function PlanDialog({
  open,
  onOpenChange,
  billing,
  usage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billing: Billing;
  usage: ReturnType<typeof useUsage>;
}) {
  const [selected, setSelected] = useState<Plan | null>(null);
  const yearly = billing.interval === "yearly";

  // Limits the target plan would put this workspace over.
  const overages = (plan: Plan) =>
    [
      plan.limits.agents !== null && usage.agents.used > plan.limits.agents && `${usage.agents.used} active agents (limit ${plan.limits.agents})`,
      plan.limits.seats !== null && usage.seats.used > plan.limits.seats && `${usage.seats.used} members (limit ${plan.limits.seats})`,
      plan.limits.runs !== null && usage.runs.used > plan.limits.runs && `${usage.runs.used.toLocaleString("en-US")} runs this month (limit ${plan.limits.runs.toLocaleString("en-US")})`,
      plan.limits.historyDays < usage.plan.limits.historyDays && `Run history shrinks to ${plan.limits.historyDays} days`,
    ].filter((item): item is string => Boolean(item));

  const apply = (plan: Plan) => {
    const startTrial = plan.id === "pro" && billing.planId !== "pro";
    billingStore.update({
      planId: plan.id,
      status: startTrial ? "trialing" : "active",
      trialEndsAt: startTrial ? new Date(Date.now() + 14 * DAY).toISOString() : null,
    });
    audit("billing", startTrial ? "Started Pro trial" : `Changed plan to ${plan.name}`);
    toast({
      title: startTrial ? "Pro trial started" : `Switched to ${plan.name}`,
      description: "Simulated — no payment was taken and nothing will be billed.",
    });
    onOpenChange(false);
  };

  const choose = (plan: Plan) => {
    if (plan.id === "enterprise") {
      toast({ tone: "info", title: "Sales contact isn't available", description: "The demo isn't connected to a sales team or CRM." });
      return;
    }
    setSelected(plan);
  };

  if (selected) {
    const warnings = overages(selected);
    const startTrial = selected.id === "pro" && billing.planId !== "pro";
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title={startTrial ? "Start a 14-day Pro trial?" : `Switch to ${selected.name}?`}
        description="Simulated plan change — no payment details are needed."
        footer={
          <>
            <button type="button" onClick={() => setSelected(null)} className={buttonVariants({ variant: "secondary" })}>
              Back
            </button>
            <button type="button" onClick={() => apply(selected)} className={buttonVariants({ className: warnings.length ? "bg-danger shadow-danger/25 hover:bg-danger/90" : undefined })}>
              {startTrial ? "Start trial" : `Switch to ${selected.name}`}
            </button>
          </>
        }
      >
        {warnings.length ? (
          <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-danger">
              <TriangleAlert size={16} />
              Your workspace is over the {selected.name} limits
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-foreground/80">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <p className="mt-2 text-foreground/80">In a live workspace, new runs would be blocked until usage is back under the limits.</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Your current usage fits within the {selected.name} plan.</p>
        )}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Choose a plan" description={`Prices shown ${yearly ? "billed yearly (20% off)" : "billed monthly"}.`} className="max-w-4xl!">
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const current = plan.id === billing.planId;
          const price = planPrice(plan, yearly);
          return (
            <article
              key={plan.id}
              className={cn("flex flex-col rounded-2xl border p-5", current ? "border-primary bg-primary-soft/40 ring-4 ring-primary/10" : "border-border")}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{plan.name}</h3>
                {current && <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">Current</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
              <p className="mt-4 text-2xl font-extrabold tracking-tight">
                {price === null ? "Custom" : `$${price}`}
                {price !== null && <span className="ml-1 text-xs font-medium text-muted-foreground">/ mo</span>}
              </p>
              <ul className="mb-5 mt-4 space-y-2 text-xs">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check size={13} className="mt-px shrink-0 text-primary" strokeWidth={3} />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={current}
                onClick={() => choose(plan)}
                className={buttonVariants({ variant: plan.featured && !current ? "primary" : "secondary", size: "sm", className: "mt-auto w-full" })}
              >
                {current
                  ? billing.status === "trialing"
                    ? "Current trial"
                    : "Current plan"
                  : plan.id === "enterprise"
                    ? "Contact sales"
                    : plan.id === "pro"
                      ? "Start 14-day trial"
                      : "Downgrade"}
              </button>
            </article>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Plan changes here are simulated and only change limits in this browser.</p>
    </Dialog>
  );
}
