"use client";

import { Copy, Trash2, X } from "lucide-react";
import { Field, inputClass } from "@/components/ui/Field";
import { getNodeVisual, models, toolsById, type ToolField } from "@/lib/agents/catalog";
import { useAgents } from "@/lib/agents/store";
import type { NodeConfigValue, WorkflowNodeData, WorkflowNodeKind } from "@/lib/agents/types";
import { cn } from "@/lib/cn";
import { ConfigField } from "./ConfigField";
import type { AppNode } from "./types";

const kindFields: Record<Exclude<WorkflowNodeKind, "tool">, ToolField[]> = {
  input: [
    { key: "variable", label: "Variable name", type: "text", defaultValue: "input", hint: "Reference it in prompts as {{input}}." },
    { key: "sampleInput", label: "Sample input", type: "textarea", defaultValue: "", hint: "Used as the default prompt for test runs." },
  ],
  llm: [
    { key: "model", label: "Model", type: "select", options: models.map((model) => ({ value: model.id, label: model.name })), defaultValue: "gpt-4o" },
    { key: "temperature", label: "Temperature", type: "slider", min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
    { key: "prompt", label: "Prompt", type: "textarea", defaultValue: "", hint: "Defaults to the agent's system instructions." },
  ],
  agent: [
    { key: "agentId", label: "Agent", type: "select", options: [], defaultValue: "" },
    { key: "handoff", label: "Context to pass", type: "select", options: ["Full context", "Previous step only", "Input only"], defaultValue: "Full context" },
    { key: "waitForResult", label: "Wait for result", type: "switch", defaultValue: true, hint: "Turn off to run the agent in the background." },
  ],
  transform: [
    { key: "instruction", label: "Instruction", type: "textarea", defaultValue: "" },
    { key: "maxWords", label: "Max words", type: "number", defaultValue: 200 },
  ],
  condition: [
    { key: "expression", label: "Expression", type: "text", defaultValue: "", hint: "The Yes branch runs when this evaluates to true." },
  ],
  output: [
    { key: "format", label: "Format", type: "select", options: ["Markdown", "JSON", "Plain text"], defaultValue: "Markdown" },
    { key: "destination", label: "Destination", type: "select", options: ["Return to user", "Webhook", "Email"], defaultValue: "Return to user" },
  ],
};

function fieldsFor(data: WorkflowNodeData, agents: { id: string; name: string }[]): ToolField[] {
  if (data.kind === "tool") return data.toolId ? (toolsById.get(data.toolId)?.fields ?? []) : [];
  if (data.kind === "agent") {
    return kindFields.agent.map((field) =>
      field.key === "agentId"
        ? { ...field, options: [{ value: "", label: "Select an agent…" }, ...agents.map((agent) => ({ value: agent.id, label: agent.name }))] }
        : field,
    );
  }
  return kindFields[data.kind];
}

type NodeConfigPanelProps = {
  node: AppNode;
  incoming: number;
  outgoing: number;
  onChange: (patch: Partial<WorkflowNodeData>) => void;
  onConfigChange: (key: string, value: NodeConfigValue) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function NodeConfigPanel({
  node,
  incoming,
  outgoing,
  onChange,
  onConfigChange,
  onDuplicate,
  onDelete,
  onClose,
}: NodeConfigPanelProps) {
  const { data } = node;
  const visual = getNodeVisual(data);
  const Icon = visual.icon;
  const tool = data.toolId ? toolsById.get(data.toolId) : undefined;
  const agents = useAgents().filter((agent) => agent.status !== "archived");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", visual.tone)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{data.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">{visual.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close node settings"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <div key={node.id} className="flex-1 space-y-5 overflow-y-auto px-4 py-4 animate-fade-in">
        <Field label="Node name" htmlFor={`node-${node.id}-label`}>
          <input
            id={`node-${node.id}-label`}
            value={data.label}
            onChange={(event) => onChange({ label: event.target.value })}
            className={inputClass}
          />
        </Field>

        {tool && <p className="rounded-xl bg-muted px-3 py-2.5 text-xs leading-5 text-muted-foreground">{tool.description}</p>}

        {fieldsFor(data, agents).map((field) => (
          <ConfigField
            key={field.key}
            field={field}
            idPrefix={`node-${node.id}`}
            value={data.config[field.key]}
            onChange={(value) => onConfigChange(field.key, value)}
          />
        ))}

        <div className="grid grid-cols-2 gap-2 text-center">
          {[
            ["Inputs", incoming],
            ["Outputs", outgoing],
          ].map(([label, count]) => (
            <div key={label} className="rounded-xl border border-border py-2.5">
              <p className="text-lg font-bold tabular-nums">{count}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 border-t border-border p-3">
        <button
          type="button"
          onClick={onDuplicate}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium transition hover:bg-muted"
        >
          <Copy size={14} />
          Duplicate
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-danger/30 text-sm font-medium text-danger transition hover:bg-danger-soft"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
}
