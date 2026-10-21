"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check, LoaderCircle, Workflow as WorkflowIcon, X } from "lucide-react";
import { ColorPicker, IconPicker } from "@/components/agents/AppearancePickers";
import { AgentAvatar } from "@/components/agents/AgentVisuals";
import { Card, CardHeader } from "@/components/dashboard/Card";
import { buttonVariants } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CopyButton } from "@/components/ui/CopyButton";
import { Field, Select, inputClass, textareaClass } from "@/components/ui/Field";
import { getNodeVisual } from "@/lib/agents/catalog";
import { useAgents } from "@/lib/agents/store";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import {
  buildTemplateGraph,
  eventOptions,
  scheduleOptions,
  triggerMeta,
  workflowStatusMeta,
  workflowTemplates,
  type WorkflowTemplateId,
} from "@/lib/workflows/catalog";
import { useWorkflows, workflowStore } from "@/lib/workflows/store";
import type { TriggerType, WorkflowInput } from "@/lib/workflows/types";

type WorkflowFormProps =
  | { mode: "create"; initial: WorkflowInput }
  | { mode: "edit"; initial: WorkflowInput; workflowId: string };

const MAX_TAGS = 5;

export function WorkflowForm(props: WorkflowFormProps) {
  const { mode, initial } = props;
  const workflowId = props.mode === "edit" ? props.workflowId : null;
  const router = useRouter();
  const workflows = useWorkflows();
  const allAgents = useAgents();
  const agents = useMemo(() => allAgents.filter((agent) => agent.status !== "archived"), [allAgents]);

  const [values, setValues] = useState<WorkflowInput>(initial);
  const [template, setTemplate] = useState<WorkflowTemplateId>("sequential");
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const update = (patch: Partial<WorkflowInput>) => setValues((current) => ({ ...current, ...patch }));
  const dirty = JSON.stringify(values) !== JSON.stringify(initial) || agentIds.length > 0;

  const errors = useMemo(() => {
    const result: Partial<Record<"name" | "description" | "trigger", string>> = {};
    const name = values.name.trim();
    if (!name) result.name = "Give your workflow a name.";
    else if (name.length < 3) result.name = "Use at least 3 characters.";
    else if (name.length > 60) result.name = "Keep it under 60 characters.";
    else if (workflows.some((workflow) => workflow.id !== workflowId && workflow.name.toLowerCase() === name.toLowerCase()))
      result.name = "Another workflow already uses this name.";
    if (values.description.length > 200) result.description = "Keep it under 200 characters.";
    if (values.trigger.type === "schedule" && !values.trigger.schedule) result.trigger = "Choose a schedule.";
    if (values.trigger.type === "event" && !values.trigger.event) result.trigger = "Choose an event.";
    return result;
  }, [values, workflows, workflowId]);
  const visibleErrors = submitted ? errors : {};

  const previewGraph = useMemo(() => {
    if (mode !== "create") return null;
    const chosen = agentIds.flatMap((id) => {
      const agent = agents.find((item) => item.id === id);
      return agent ? [{ id: agent.id, name: agent.name }] : [];
    });
    return buildTemplateGraph(template, chosen);
  }, [mode, template, agentIds, agents]);
  // Rows of nodes by vertical position for the mini preview.
  const previewRows = useMemo(() => {
    if (!previewGraph) return [];
    const rows = new Map<number, typeof previewGraph.nodes>();
    previewGraph.nodes.forEach((node) => rows.set(node.position.y, [...(rows.get(node.position.y) ?? []), node]));
    return [...rows.entries()].sort(([a], [b]) => a - b).map(([, nodes]) => nodes);
  }, [previewGraph]);

  useEffect(() => {
    if (!dirty || saving) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saving]);

  const addTag = () => {
    const tag = tagDraft.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (tag && !values.tags.includes(tag) && values.tags.length < MAX_TAGS) update({ tags: [...values.tags, tag] });
    setTagDraft("");
  };

  const onTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    } else if (event.key === "Backspace" && !tagDraft && values.tags.length) {
      update({ tags: values.tags.slice(0, -1) });
    }
  };

  const setTriggerType = (type: TriggerType) =>
    update({
      trigger:
        type === "schedule"
          ? { type, schedule: values.trigger.schedule ?? scheduleOptions[2] }
          : type === "event"
            ? { type, event: values.trigger.event ?? eventOptions[0] }
            : { type },
    });

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length) {
      document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    setSaving(true);
    const clean: WorkflowInput = { ...values, name: values.name.trim(), description: values.description.trim() };
    window.setTimeout(() => {
      if (workflowId) {
        workflowStore.update(workflowId, clean);
        toast({ title: "Workflow updated", description: `“${clean.name}” was saved.` });
        router.push("/workflows");
      } else if (previewGraph) {
        const created = workflowStore.create(clean, previewGraph);
        toast({ title: "Workflow created", description: "Fine-tune the steps in the visual builder." });
        router.push(`/workflows/${created.id}/builder`);
      }
    }, 600);
  };

  const leave = () => (dirty ? setConfirmLeave(true) : router.push("/workflows"));
  const webhookUrl = `https://hooks.agentflow.dev/w/${workflowId ?? (values.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "new-workflow")}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 animate-fade-up sm:flex-row sm:items-end">
        <div>
          <Breadcrumbs
            items={[
              { label: "Workflows", href: "/workflows" },
              ...(workflowId ? [{ label: initial.name, href: `/workflows/${workflowId}/builder` }] : []),
              { label: mode === "create" ? "Create Workflow" : "Edit" },
            ]}
          />
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-[28px]">
            {mode === "create" ? "Create Workflow" : `Edit ${initial.name}`}
          </h1>
        </div>
        {workflowId && (
          <Link href={`/workflows/${workflowId}/builder`} className={buttonVariants({ variant: "secondary", size: "sm", className: "self-start sm:self-auto" })}>
            <WorkflowIcon size={14} />
            Open builder
          </Link>
        )}
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Details" subtitle="How this workflow appears to your team" />
            <div className="space-y-6">
              <Field label="Name" htmlFor="workflow-name" error={visibleErrors.name}>
                <input
                  id="workflow-name"
                  autoFocus
                  value={values.name}
                  onChange={(event) => update({ name: event.target.value })}
                  placeholder="e.g. Weekly Research Report"
                  aria-invalid={visibleErrors.name ? true : undefined}
                  aria-describedby={visibleErrors.name ? "workflow-name-error" : undefined}
                  className={inputClass}
                />
              </Field>
              <Field
                label="Description"
                htmlFor="workflow-description"
                error={visibleErrors.description}
                aside={<span className="text-[11px] tabular-nums text-subtle-foreground">{values.description.length}/200</span>}
              >
                <textarea
                  id="workflow-description"
                  rows={2}
                  value={values.description}
                  onChange={(event) => update({ description: event.target.value })}
                  placeholder="What does this workflow automate?"
                  aria-invalid={visibleErrors.description ? true : undefined}
                  className={textareaClass}
                />
              </Field>
              <Field label="Tags" htmlFor="workflow-tags" hint={`Press Enter to add · up to ${MAX_TAGS}`}>
                <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-input bg-card px-2 py-1.5 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
                  {values.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-primary-soft py-0.5 pl-2 pr-1 text-xs font-medium text-primary-soft-foreground">
                      {tag}
                      <button
                        type="button"
                        aria-label={`Remove tag ${tag}`}
                        onClick={() => update({ tags: values.tags.filter((item) => item !== tag) })}
                        className="rounded p-0.5 hover:bg-card/60"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  <input
                    id="workflow-tags"
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    onKeyDown={onTagKeyDown}
                    onBlur={addTag}
                    disabled={values.tags.length >= MAX_TAGS}
                    placeholder={values.tags.length ? "" : "research, weekly…"}
                    className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-subtle-foreground"
                  />
                </div>
              </Field>
              <IconPicker value={values.icon} onChange={(icon) => update({ icon })} />
              <ColorPicker value={values.color} onChange={(color) => update({ color })} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Trigger" subtitle="What starts this workflow" />
            <div role="radiogroup" aria-label="Trigger type" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(Object.keys(triggerMeta) as TriggerType[]).map((type) => {
                const { icon: Icon, label, description } = triggerMeta[type];
                const selected = values.trigger.type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTriggerType(type)}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                      selected ? "border-primary bg-primary-soft/50 ring-4 ring-primary/10" : "border-border hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      <Icon size={16} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-muted-foreground">{description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              {values.trigger.type === "schedule" && (
                <Field label="Schedule" htmlFor="workflow-schedule" error={visibleErrors.trigger}>
                  <Select
                    id="workflow-schedule"
                    value={values.trigger.schedule ?? ""}
                    onChange={(event) => update({ trigger: { type: "schedule", schedule: event.target.value } })}
                  >
                    {scheduleOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </Field>
              )}
              {values.trigger.type === "event" && (
                <Field label="Event" htmlFor="workflow-event" error={visibleErrors.trigger}>
                  <Select
                    id="workflow-event"
                    value={values.trigger.event ?? ""}
                    onChange={(event) => update({ trigger: { type: "event", event: event.target.value } })}
                  >
                    {eventOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </Field>
              )}
              {values.trigger.type === "webhook" && (
                <Field label="Webhook URL" htmlFor="workflow-webhook" hint="POST JSON to this URL to start a run. (Demo URL — not live.)">
                  <div className="flex items-center gap-2">
                    <input id="workflow-webhook" readOnly value={webhookUrl} className={cn(inputClass, "font-mono text-xs")} />
                    <CopyButton value={webhookUrl} label="Copy webhook URL" className="h-10 border border-border px-3" />
                  </div>
                </Field>
              )}
            </div>
          </Card>

          {mode === "create" && (
            <>
              <Card>
                <CardHeader
                  title="Agents"
                  subtitle="Pick the agents this workflow orchestrates, in order"
                  action={agentIds.length > 0 ? <button type="button" onClick={() => setAgentIds([])} className="text-xs font-semibold text-primary hover:underline">Clear</button> : undefined}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {agents.map((agent) => {
                    const position = agentIds.indexOf(agent.id);
                    const selected = position !== -1;
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        role="checkbox"
                        aria-checked={selected}
                        onClick={() =>
                          setAgentIds((current) => (selected ? current.filter((id) => id !== agent.id) : [...current, agent.id]))
                        }
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                          selected ? "border-primary bg-primary-soft/50" : "border-border hover:border-primary/40 hover:bg-muted/40",
                        )}
                      >
                        <AgentAvatar icon={agent.icon} color={agent.color} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{agent.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{agent.description}</span>
                        </span>
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                            selected ? "bg-primary text-primary-foreground" : "border border-input",
                          )}
                        >
                          {selected ? position + 1 : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card>
                <CardHeader title="Starting point" subtitle="You can change everything later in the builder" />
                <div role="radiogroup" aria-label="Template" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {workflowTemplates.map((item) => {
                    const selected = template === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setTemplate(item.id)}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                          selected ? "border-primary bg-primary-soft/50 ring-4 ring-primary/10" : "border-border hover:border-primary/40 hover:bg-muted/40",
                        )}
                      >
                        <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-primary" : "border-input")}>
                          {selected && <span className="size-2 rounded-full bg-primary" />}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">{item.name}</span>
                          <span className="block text-xs text-muted-foreground">{item.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Summary */}
        <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <Card>
            <div className="flex items-center gap-3">
              <AgentAvatar icon={values.icon} color={values.color} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{values.name.trim() || "Untitled workflow"}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{values.description.trim() || "No description yet."}</p>
              </div>
            </div>

            <fieldset className="mt-5">
              <legend className="mb-1.5 text-sm font-medium">Status</legend>
              <div role="radiogroup" aria-label="Status" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted p-1">
                {(["active", "paused", "draft"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    role="radio"
                    aria-checked={values.status === status}
                    onClick={() => update({ status })}
                    className={cn(
                      "flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all",
                      values.status === status ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", workflowStatusMeta[status].dot)} />
                    {workflowStatusMeta[status].label}
                  </button>
                ))}
              </div>
            </fieldset>

            {previewRows.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium">Preview</p>
                <ol aria-label="Workflow preview" className="space-y-1.5 rounded-xl border border-dashed border-border bg-muted/30 p-3">
                  {previewRows.map((row, index) => (
                    <li key={index} className="flex flex-col items-center gap-1.5">
                      {index > 0 && <span aria-hidden className="h-2.5 w-px bg-border" />}
                      <div className="flex w-full flex-wrap justify-center gap-1.5">
                        {row.map((node) => {
                          const visual = getNodeVisual(node.data);
                          const Icon = visual.icon;
                          return (
                            <span key={node.id} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-medium shadow-sm">
                              <span className={cn("flex size-4 shrink-0 items-center justify-center rounded", visual.tone)}>
                                <Icon className="size-2.5" />
                              </span>
                              <span className="truncate">{node.data.label}</span>
                            </span>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button type="button" onClick={submit} disabled={saving || (mode === "edit" && !dirty)} className={buttonVariants({ className: "w-full" })}>
                {saving ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Saving…
                  </>
                ) : mode === "create" ? (
                  <>
                    Create & open builder
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Save changes
                  </>
                )}
              </button>
              <button type="button" onClick={leave} className={buttonVariants({ variant: "ghost", className: "w-full" })}>
                Cancel
              </button>
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Discard unsaved changes?"
        description="You'll lose everything you've entered in this form."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => router.push("/workflows")}
      />
    </div>
  );
}
