import {
  BookOpen,
  CircleCheck,
  Info,
  ScrollText,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { defaultSettings } from "@/lib/agents/catalog";
import type { Agent, AgentInput } from "@/lib/agents/types";

export const wizardSteps = [
  { id: "basics", label: "Basic Info", description: "Name, purpose and look", icon: Info },
  { id: "instructions", label: "Instructions", description: "How the agent behaves", icon: ScrollText },
  { id: "tools", label: "Tools", description: "What it can do", icon: Wrench },
  { id: "knowledge", label: "Knowledge", description: "What it knows", icon: BookOpen },
  { id: "model", label: "Model & Settings", description: "Which model and how", icon: SlidersHorizontal },
  { id: "review", label: "Review", description: "Check and confirm", icon: CircleCheck },
] as const;

export type StepId = (typeof wizardSteps)[number]["id"];
export type StepErrors = Partial<Record<string, string>>;

export type StepProps = {
  draft: AgentInput;
  update: (patch: Partial<AgentInput> | ((draft: AgentInput) => Partial<AgentInput>)) => void;
  errors: StepErrors;
};

export function isStepId(value: string | undefined): value is StepId {
  return wizardSteps.some((step) => step.id === value);
}

export const emptyDraft: AgentInput = {
  name: "",
  description: "",
  icon: "bot",
  color: "violet",
  status: "active",
  instructions: "",
  tools: [],
  knowledge: [],
  settings: defaultSettings,
};

export function toDraft(agent: Agent): AgentInput {
  const { name, description, icon, color, status, instructions, tools, knowledge, settings } = agent;
  return { name, description, icon, color, status, instructions, tools, knowledge, settings };
}

export const LIMITS = { name: 50, description: 200, instructions: 4000 };

export function validateStep(step: StepId, draft: AgentInput, otherNames: string[] = []): StepErrors {
  const errors: StepErrors = {};
  if (step === "basics") {
    const name = draft.name.trim();
    if (!name) errors.name = "Give your agent a name.";
    else if (name.length < 3) errors.name = "Use at least 3 characters.";
    else if (name.length > LIMITS.name) errors.name = `Keep it under ${LIMITS.name} characters.`;
    else if (otherNames.some((other) => other.toLowerCase() === name.toLowerCase()))
      errors.name = "Another agent already uses this name.";

    const description = draft.description.trim();
    if (!description) errors.description = "Describe what this agent does.";
    else if (description.length < 10) errors.description = "Add a little more detail (10+ characters).";
    else if (description.length > LIMITS.description)
      errors.description = `Keep it under ${LIMITS.description} characters.`;
  }
  if (step === "instructions") {
    const length = draft.instructions.trim().length;
    if (length < 20) errors.instructions = "Write at least 20 characters so the agent knows how to behave.";
    else if (length > LIMITS.instructions) errors.instructions = `Keep instructions under ${LIMITS.instructions} characters.`;
  }
  if (step === "model") {
    const { maxTokens, temperature } = draft.settings;
    if (!Number.isInteger(maxTokens) || maxTokens < 256 || maxTokens > 32000)
      errors.maxTokens = "Choose between 256 and 32,000 tokens.";
    if (temperature < 0 || temperature > 2) errors.temperature = "Temperature must be between 0 and 2.";
  }
  return errors;
}
