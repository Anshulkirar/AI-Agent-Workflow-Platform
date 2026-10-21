export type RunTab = "overview" | "logs" | "steps" | "io" | "metrics";

export const runTabs: { id: RunTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "logs", label: "Logs" },
  { id: "steps", label: "Steps" },
  { id: "io", label: "Input / Output" },
  { id: "metrics", label: "Metrics" },
];

export function isRunTab(value: string | undefined): value is RunTab {
  return runTabs.some((tab) => tab.id === value);
}
