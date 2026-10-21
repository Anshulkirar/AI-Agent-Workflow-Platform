import type { ModelSettings, Workflow } from "@/lib/agents/types";
import { createCollectionStore, makeId } from "@/lib/create-store";
import { workspaceModelDefaults } from "@/lib/settings/store";
import { seedWorkflows } from "./seed";
import type { WorkflowInput, WorkflowRecord } from "./types";

const collection = createCollectionStore<WorkflowRecord>({ key: "agentflow-workflows-v1", seed: seedWorkflows });

export const useWorkflows = collection.useAll;

export function useWorkflow(id: string) {
  return useWorkflows().find((workflow) => workflow.id === id);
}

const now = () => new Date().toISOString();

export const workflowStore = {
  get: (id: string) => collection.read().find((workflow) => workflow.id === id),

  create(input: WorkflowInput, graph: Workflow): WorkflowRecord {
    const timestamp = now();
    const workflow: WorkflowRecord = {
      ...input,
      id: makeId(input.name),
      graph,
      settings: workspaceModelDefaults(),
      runs: 0,
      successRate: 0,
      avgDurationMs: 0,
      lastRunAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    collection.write([workflow, ...collection.read()]);
    return workflow;
  },

  update(id: string, patch: Partial<Omit<WorkflowRecord, "id">>) {
    collection.update(id, { ...patch, updatedAt: now() });
  },

  updateMany(ids: string[], patch: Partial<Omit<WorkflowRecord, "id">>) {
    const set = new Set(ids);
    const timestamp = now();
    collection.write(
      collection.read().map((workflow) => (set.has(workflow.id) ? { ...workflow, ...patch, updatedAt: timestamp } : workflow)),
    );
  },

  saveGraph(id: string, graph: Workflow, settings: ModelSettings) {
    this.update(id, { graph, settings });
  },

  remove: (id: string) => collection.remove(id),

  removeMany(ids: string[]) {
    const list = collection.read();
    const removed = list.flatMap((item, index) => (ids.includes(item.id) ? [{ item, index }] : []));
    collection.write(list.filter((item) => !ids.includes(item.id)));
    return removed;
  },

  restore: collection.restore,

  restoreMany(entries: { item: WorkflowRecord; index: number }[]) {
    const list = [...collection.read()];
    [...entries].sort((a, b) => a.index - b.index).forEach(({ item, index }) => list.splice(Math.min(index, list.length), 0, item));
    collection.write(list);
  },

  duplicate(id: string): WorkflowRecord | null {
    const list = collection.read();
    const index = list.findIndex((workflow) => workflow.id === id);
    const source = list[index];
    if (!source) return null;
    const timestamp = now();
    const copy: WorkflowRecord = {
      ...structuredClone(source),
      id: makeId(source.name),
      name: `${source.name} (copy)`,
      status: "draft",
      runs: 0,
      successRate: 0,
      avgDurationMs: 0,
      lastRunAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const next = [...list];
    next.splice(index + 1, 0, copy);
    collection.write(next);
    return copy;
  },

  recordRun(id: string, success: boolean, durationMs: number) {
    collection.update(id, (workflow) => {
      const runs = workflow.runs + 1;
      return {
        runs,
        successRate: Math.round(((workflow.successRate * workflow.runs + (success ? 100 : 0)) / runs) * 10) / 10,
        avgDurationMs: Math.round((workflow.avgDurationMs * workflow.runs + durationMs) / runs),
        lastRunAt: now(),
      };
    });
  },
};
