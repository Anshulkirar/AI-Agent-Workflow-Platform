import { createCollectionStore, makeId } from "@/lib/create-store";
import { seedAgents } from "./seed";
import type { Agent, AgentInput, ModelSettings, Workflow } from "./types";

const collection = createCollectionStore<Agent>({ key: "agentflow-agents-v1", seed: seedAgents });

export const useAgents = collection.useAll;

export function useAgent(id: string) {
  return useAgents().find((agent) => agent.id === id);
}

const now = () => new Date().toISOString();

export const agentStore = {
  get(id: string) {
    return collection.read().find((agent) => agent.id === id);
  },

  create(input: AgentInput): Agent {
    const timestamp = now();
    const agent: Agent = {
      ...input,
      id: makeId(input.name),
      runs: 0,
      successRate: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastRunAt: null,
    };
    collection.write([agent, ...collection.read()]);
    return agent;
  },

  update(id: string, patch: Partial<Omit<Agent, "id">>) {
    collection.update(id, { ...patch, updatedAt: now() });
  },

  /** Removes an agent and returns what's needed to undo the deletion. */
  remove(id: string) {
    const removed = collection.remove(id);
    return removed ? { agent: removed.item, index: removed.index } : null;
  },

  restore(agent: Agent, index: number) {
    collection.restore(agent, index);
  },

  duplicate(id: string): Agent | null {
    const list = collection.read();
    const index = list.findIndex((agent) => agent.id === id);
    const source = list[index];
    if (!source) return null;
    const timestamp = now();
    const copy: Agent = {
      ...structuredClone(source),
      id: makeId(source.name),
      name: `${source.name} (copy)`,
      status: "draft",
      runs: 0,
      successRate: 0,
      lastRunAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const next = [...list];
    next.splice(index + 1, 0, copy);
    collection.write(next);
    return copy;
  },

  saveWorkflow(id: string, workflow: Workflow, settings: ModelSettings) {
    this.update(id, { workflow, settings });
  },

  recordRun(id: string, success: boolean) {
    collection.update(id, (agent) => {
      const runs = agent.runs + 1;
      const successRate =
        Math.round(((agent.successRate * agent.runs + (success ? 100 : 0)) / runs) * 10) / 10;
      return { runs, successRate, lastRunAt: now() };
    });
  },
};
