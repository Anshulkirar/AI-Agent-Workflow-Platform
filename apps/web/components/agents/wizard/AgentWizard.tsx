"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { agentStore, useAgents } from "@/lib/agents/store";
import type { AgentInput } from "@/lib/agents/types";
import { cn } from "@/lib/cn";
import { useWorkspaceSettings } from "@/lib/settings/store";
import { toast } from "@/lib/toast";
import { BasicInfoStep } from "./BasicInfoStep";
import { InstructionsStep } from "./InstructionsStep";
import { KnowledgeStep } from "./KnowledgeStep";
import { ModelStep } from "./ModelStep";
import { ReviewStep } from "./ReviewStep";
import { ToolsStep } from "./ToolsStep";
import { validateStep, wizardSteps, type StepErrors, type StepId, type StepProps } from "./wizard-config";

type AgentWizardProps =
  | { mode: "create"; initial: AgentInput; initialStep?: StepId }
  | { mode: "edit"; agentId: string; initial: AgentInput; initialStep?: StepId };

export function AgentWizard(props: AgentWizardProps) {
  const { mode, initial } = props;
  const agentId = props.mode === "edit" ? props.agentId : null;
  const router = useRouter();
  const agents = useAgents();

  const startIndex = Math.max(0, wizardSteps.findIndex((step) => step.id === props.initialStep));
  // New agents start from the workspace default model settings (Settings → Workspace).
  const modelDefaults = useWorkspaceSettings().modelDefaults;
  const baseline = useMemo(() => (mode === "create" ? { ...initial, settings: modelDefaults } : initial), [mode, initial, modelDefaults]);
  const [draft, setDraft] = useState<AgentInput>(baseline);
  const [stepIndex, setStepIndex] = useState(startIndex);
  // In edit mode every step is already valid, so all are reachable.
  const [furthest, setFurthest] = useState(mode === "edit" ? wizardSteps.length - 1 : startIndex);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const step = wizardSteps[stepIndex] ?? wizardSteps[0];
  const isLast = stepIndex === wizardSteps.length - 1;
  const otherNames = useMemo(
    () => agents.filter((agent) => agent.id !== agentId).map((agent) => agent.name),
    [agents, agentId],
  );
  const errors: StepErrors = validateStep(step.id, draft, otherNames);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  // Stored defaults arrive after hydration; adopt them while the model step is untouched.
  useEffect(() => {
    if (mode !== "create") return;
    setDraft((current) =>
      JSON.stringify(current.settings) === JSON.stringify(initial.settings) ? { ...current, settings: modelDefaults } : current,
    );
  }, [mode, initial.settings, modelDefaults]);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty || saving) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saving]);

  const update: StepProps["update"] = (patch) =>
    setDraft((current) => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }));

  const goTo = (index: number) => {
    setStepIndex(index);
    setShowErrors(false);
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const firstInvalidStep = () =>
    wizardSteps.findIndex((item) => Object.keys(validateStep(item.id, draft, otherNames)).length > 0);

  const next = () => {
    if (Object.keys(errors).length) {
      setShowErrors(true);
      contentRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    const target = stepIndex + 1;
    setFurthest((value) => Math.max(value, target));
    goTo(target);
  };

  const submit = () => {
    const invalid = firstInvalidStep();
    if (invalid !== -1) {
      goTo(invalid);
      setShowErrors(true);
      return;
    }
    setSaving(true);
    const clean: AgentInput = { ...draft, name: draft.name.trim(), description: draft.description.trim() };
    // Simulated latency so the save feels real.
    window.setTimeout(() => {
      if (agentId) {
        agentStore.update(agentId, clean);
        toast({ title: "Changes saved", description: `“${clean.name}” was updated.` });
        router.push("/agents");
      } else {
        const agent = agentStore.create(clean);
        toast({ title: "Agent created", description: "Design its workflow in the visual builder." });
        router.push(`/agents/${agent.id}/builder`);
      }
    }, 700);
  };

  const leave = () => (dirty ? setConfirmLeave(true) : router.push("/agents"));
  const visibleErrors = showErrors ? errors : {};
  const title = mode === "create" ? "Create New Agent" : `Edit ${initial.name}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 animate-fade-up sm:flex-row sm:items-end">
        <div>
          <Breadcrumbs
            items={[
              { label: "Agents", href: "/agents" },
              ...(agentId ? [{ label: initial.name, href: `/agents/${agentId}/builder` }] : []),
              { label: mode === "create" ? "Create Agent" : "Edit" },
            ]}
          />
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
        </div>
        <button type="button" onClick={leave} className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start sm:self-auto" })}>
          Cancel
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Stepper */}
        <nav aria-label="Agent setup steps" className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted lg:hidden">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${((stepIndex + 1) / wizardSteps.length) * 100}%` }}
            />
          </div>
          <ol className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-2">
            {wizardSteps.map((item, index) => {
              const Icon = item.icon;
              const current = index === stepIndex;
              const done = index < stepIndex || (index <= furthest && !current);
              const reachable = index <= furthest;
              return (
                <li key={item.id} className="shrink-0">
                  <button
                    type="button"
                    disabled={!reachable}
                    aria-current={current ? "step" : undefined}
                    onClick={() => goTo(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed",
                      current
                        ? "bg-primary-soft text-primary-soft-foreground"
                        : reachable
                          ? "text-foreground hover:bg-muted"
                          : "text-subtle-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                        current
                          ? "bg-primary text-primary-foreground"
                          : done
                            ? "bg-success-soft text-success"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {done ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-sm font-semibold">{item.label}</span>
                      <span className="hidden text-[11px] text-muted-foreground lg:block">{item.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Step content */}
        <section
          ref={contentRef}
          aria-labelledby="wizard-step-title"
          className="min-w-0 scroll-mt-24 rounded-2xl border border-border bg-card shadow-sm shadow-black/[0.02]"
        >
          <div className="border-b border-border px-5 py-4 sm:px-7">
            <p className="text-xs font-medium text-muted-foreground">
              Step {stepIndex + 1} of {wizardSteps.length}
            </p>
            <h2 id="wizard-step-title" className="mt-0.5 text-lg font-semibold">
              {step.label}
            </h2>
          </div>

          <div key={step.id} className="px-5 py-6 animate-fade-in sm:px-7">
            {step.id === "basics" && <BasicInfoStep draft={draft} update={update} errors={visibleErrors} />}
            {step.id === "instructions" && <InstructionsStep draft={draft} update={update} errors={visibleErrors} />}
            {step.id === "tools" && <ToolsStep draft={draft} update={update} errors={visibleErrors} />}
            {step.id === "knowledge" && <KnowledgeStep draft={draft} update={update} errors={visibleErrors} />}
            {step.id === "model" && <ModelStep draft={draft} update={update} errors={visibleErrors} />}
            {step.id === "review" && (
              <ReviewStep
                draft={draft}
                update={update}
                errors={visibleErrors}
                goTo={(id) => goTo(wizardSteps.findIndex((item) => item.id === id))}
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-7">
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1)}
              disabled={stepIndex === 0 || saving}
              className={buttonVariants({ variant: "secondary", className: stepIndex === 0 ? "invisible" : undefined })}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div className="flex items-center gap-2">
              {mode === "edit" && !isLast && (
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving || !dirty}
                  className={buttonVariants({ variant: "secondary", className: "max-sm:hidden" })}
                >
                  Save changes
                </button>
              )}
              {isLast ? (
                <button type="button" onClick={submit} disabled={saving} className={buttonVariants({ className: "min-w-36" })}>
                  {saving ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {mode === "create" ? "Create agent" : "Save changes"}
                    </>
                  )}
                </button>
              ) : (
                <button type="button" onClick={next} className={buttonVariants({ className: "group" })}>
                  Next
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Discard unsaved changes?"
        description="You'll lose everything you've entered in this form."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => router.push("/agents")}
      />
    </div>
  );
}
