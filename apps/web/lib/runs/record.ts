import { agentStore } from "@/lib/agents/store";
import { workflowStore } from "@/lib/workflows/store";
import type { Run } from "./types";

/** Updates the run counters of the agent or workflow that produced a run. */
export function recordSourceRun(run: Run) {
  const success = run.status === "success";
  if (run.source.type === "agent") agentStore.recordRun(run.source.id, success);
  else workflowStore.recordRun(run.source.id, success, run.durationMs);
}
