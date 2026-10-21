import { buildRun } from "./build";
import { profileFor } from "./profiles";
import type { Run, RunSource, RunStatus, RunTrigger } from "./types";

// Deterministic sample history so server and client render identical markup.

const NOW = Date.UTC(2026, 9, 18, 10, 0, 0);

const sources: Record<string, RunSource & { model: string }> = {
  "research-agent": { type: "agent", id: "research-agent", name: "Research Agent", model: "gpt-4o" },
  "code-assistant": { type: "agent", id: "code-assistant", name: "Code Assistant", model: "claude-sonnet-5-5" },
  "data-analyst": { type: "agent", id: "data-analyst", name: "Data Analyst", model: "gpt-4o" },
  "content-generator": { type: "agent", id: "content-generator", name: "Content Generator", model: "gpt-4o" },
  "customer-support": { type: "agent", id: "customer-support", name: "Customer Support", model: "claude-haiku-5-5" },
  "email-assistant": { type: "agent", id: "email-assistant", name: "Email Assistant", model: "gpt-4o" },
  "web-research": { type: "agent", id: "web-research", name: "Web Research", model: "gpt-4o" },
  "research-workflow": { type: "workflow", id: "research-workflow", name: "Research Workflow", model: "gpt-4o" },
  "content-pipeline": { type: "workflow", id: "content-pipeline", name: "Content Pipeline", model: "claude-sonnet-5-5" },
  "data-analysis": { type: "workflow", id: "data-analysis", name: "Data Analysis", model: "gpt-4o" },
  "lead-generation": { type: "workflow", id: "lead-generation", name: "Lead Generation", model: "gpt-4o-mini" },
  "email-automation": { type: "workflow", id: "email-automation", name: "Email Automation", model: "gpt-4o" },
};

type SeedSpec = {
  id: string;
  source: keyof typeof sources;
  /** Minutes before the fixed "now". */
  ago: number;
  status?: Exclude<RunStatus, "running">;
  trigger?: RunTrigger;
  input?: number;
  seconds?: number;
  failAt?: number;
  error?: string;
  startedAt?: string;
};

const specs: SeedSpec[] = [
  // Mirrors the dashboard's "Recent Runs".
  { id: "run_48213", source: "research-agent", ago: 2, seconds: 12.4, input: 1 },
  { id: "run_48207", source: "code-assistant", ago: 15, seconds: 32.1 },
  { id: "run_48196", source: "data-analyst", ago: 60, seconds: 18.7, status: "failed", failAt: 1, error: "Query timed out after 15s (statement_timeout). The warehouse is under heavy load." },
  { id: "run_48172", source: "content-generator", ago: 120, seconds: 45.2 },
  { id: "run_48161", source: "web-research", ago: 180, seconds: 21.3, trigger: "schedule" },
  { id: "run_48140", source: "research-workflow", ago: 205, trigger: "schedule", input: 2 },
  { id: "run_48122", source: "customer-support", ago: 240, trigger: "api" },
  { id: "run_48117", source: "content-pipeline", ago: 310, trigger: "webhook", input: 1 },
  { id: "run_48103", source: "email-automation", ago: 360, trigger: "schedule" },
  { id: "run_48096", source: "email-assistant", ago: 410 },
  { id: "run_48071", source: "lead-generation", ago: 520, trigger: "schedule" },
  { id: "run_48064", source: "code-assistant", ago: 600, input: 1, status: "cancelled" },
  { id: "run_48052", source: "customer-support", ago: 700, trigger: "api", input: 1 },
  { id: "run_48031", source: "data-analysis", ago: 820, trigger: "schedule", input: 2 },
  { id: "run_48019", source: "research-agent", ago: 960, input: 2 },
  { id: "run_47988", source: "content-generator", ago: 1100, input: 2, status: "failed", failAt: 3, error: "Model returned an empty completion (max_tokens reached). Increase max tokens or shorten the outline." },
  { id: "run_47975", source: "research-workflow", ago: 1380, trigger: "schedule" },
  { id: "run_47960", source: "web-research", ago: 1620, trigger: "schedule", input: 1 },
  { id: "run_47941", source: "customer-support", ago: 1900, trigger: "api", input: 2 },
  { id: "run_47922", source: "code-assistant", ago: 2300, input: 2 },
  { id: "run_47904", source: "lead-generation", ago: 2700, trigger: "schedule", status: "failed", failAt: 1, error: "HTTP 429 Too Many Requests from target site. Backing off for 60s exceeded the step timeout." },
  { id: "run_12345", source: "research-agent", ago: 0, startedAt: "2026-10-16T10:24:12.000Z", seconds: 33.2 },
  { id: "run_47880", source: "email-automation", ago: 3200, trigger: "schedule", input: 1 },
  { id: "run_47862", source: "research-agent", ago: 3700, input: 1 },
];

// Deterministic pseudo-random variation so runs don't all look identical.
function seeded(index: number) {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const seedRuns: Run[] = specs
  .map((spec, index) => {
    const source = sources[spec.source]!;
    const profile = profileFor(spec.source);
    const input = profile.inputs[(spec.input ?? 0) % profile.inputs.length] ?? profile.inputs[0]!;
    const startedAt = spec.startedAt ?? new Date(NOW - spec.ago * 60_000).toISOString();
    const baseSeconds = profile.steps.reduce((sum, step) => sum + step.seconds, 0);
    const variation = 0.72 + seeded(index) * 0.6;
    return buildRun({
      id: spec.id,
      source: { type: source.type, id: source.id, name: source.name },
      status: spec.status ?? "success",
      trigger: spec.trigger ?? "manual",
      model: source.model,
      input,
      startedAt,
      templates: profile.steps,
      output: profile.output(input),
      targetSeconds: spec.seconds ?? Math.round(baseSeconds * variation * 10) / 10,
      tokenScale: spec.seconds ? 1 : 0.8 + seeded(index + 50) * 0.45,
      failAt: spec.failAt,
      error: spec.error,
      cancelAt: 2,
    });
  })
  .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
