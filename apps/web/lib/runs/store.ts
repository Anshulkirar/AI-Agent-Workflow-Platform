import { createCollectionStore } from "@/lib/create-store";
import { seedRuns } from "./seed";
import type { Run } from "./types";

const collection = createCollectionStore<Run>({
  key: "agentflow-runs-v1",
  seed: seedRuns,
  limit: 150,
  // Simulations live in memory, so a run still "running" after a reload was interrupted.
  hydrate: (runs) =>
    runs.map((run) =>
      run.status === "running"
        ? {
            ...run,
            status: "cancelled",
            error: "Interrupted — the page was reloaded while the run was in progress.",
            completedAt: run.completedAt ?? new Date().toISOString(),
            steps: run.steps.map((step) =>
              step.status === "running" || step.status === "pending" ? { ...step, status: "skipped" } : step,
            ),
          }
        : run,
    ),
});

export const useRuns = collection.useAll;

export function useRun(id: string) {
  return useRuns().find((run) => run.id === id);
}

export function newRunId() {
  const taken = new Set(collection.read().map((run) => run.id));
  let id = "";
  do id = `run_${Math.floor(50000 + Math.random() * 49999)}`;
  while (taken.has(id));
  return id;
}

export const runStore = {
  get: (id: string) => collection.read().find((run) => run.id === id),
  add(run: Run) {
    collection.write([run, ...collection.read()]);
  },
  update: collection.update,
  remove: collection.remove,
  restore: collection.restore,
};
