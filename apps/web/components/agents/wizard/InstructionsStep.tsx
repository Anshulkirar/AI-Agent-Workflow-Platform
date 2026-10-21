"use client";

import { Lightbulb, WandSparkles } from "lucide-react";
import { Field, textareaClass } from "@/components/ui/Field";
import { instructionTemplates } from "@/lib/agents/catalog";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import { LIMITS, type StepProps } from "./wizard-config";

const tips = [
  "Describe the agent's role and expertise in the first sentence.",
  "List rules as bullet points — one behaviour per line.",
  "Say what to do when unsure (ask, escalate or stop).",
  "Specify the output format you expect.",
];

export function InstructionsStep({ draft, update, errors }: StepProps) {
  const applyTemplate = (text: string, name: string) => {
    const previous = draft.instructions;
    update({ instructions: text });
    if (previous.trim()) {
      toast({
        tone: "info",
        title: `“${name}” template applied`,
        action: { label: "Undo", onClick: () => update({ instructions: previous }) },
      });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
      <div className="space-y-4">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <WandSparkles size={14} className="text-primary" />
            Start from a template
          </p>
          <div className="flex flex-wrap gap-2">
            {instructionTemplates.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => applyTemplate(template.text, template.name)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                  draft.instructions === template.text
                    ? "border-primary bg-primary-soft text-primary-soft-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        <Field
          label="System instructions"
          htmlFor="agent-instructions"
          error={errors.instructions}
          hint="Tip: use {{variables}} to reference workflow inputs."
          aside={
            <span
              className={cn(
                "text-[11px] tabular-nums",
                draft.instructions.length > LIMITS.instructions ? "text-danger" : "text-subtle-foreground",
              )}
            >
              {draft.instructions.length.toLocaleString("en-US")}/{LIMITS.instructions.toLocaleString("en-US")}
            </span>
          }
        >
          <textarea
            id="agent-instructions"
            rows={13}
            value={draft.instructions}
            onChange={(event) => update({ instructions: event.target.value })}
            placeholder="You are a helpful research assistant. Always cite your sources…"
            aria-invalid={errors.instructions ? true : undefined}
            aria-describedby={errors.instructions ? "agent-instructions-error" : undefined}
            className={cn(textareaClass, "font-mono text-[13px]")}
          />
        </Field>
      </div>

      <aside className="h-fit rounded-2xl border border-border bg-muted/40 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Lightbulb size={15} className="text-amber-500" />
          Writing great instructions
        </p>
        <ul className="mt-3 space-y-2.5">
          {tips.map((tip) => (
            <li key={tip} className="flex gap-2 text-xs leading-5 text-muted-foreground">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
              {tip}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
