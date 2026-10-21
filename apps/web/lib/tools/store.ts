import type { NodeConfigValue } from "@/lib/agents/types";
import { createCollectionStore, makeId } from "@/lib/create-store";
import { defaultConnectionConfig, toolMeta } from "./catalog";
import { seedInstalls } from "./seed";
import type { ConnectionStatus, CustomToolDefinition, ToolInstall } from "./types";

const collection = createCollectionStore<ToolInstall>({ key: "agentflow-tools-v1", seed: seedInstalls });

export const useToolInstalls = collection.useAll;

export function useToolInstall(id: string) {
  return useToolInstalls().find((install) => install.id === id);
}

const now = () => new Date().toISOString();

export const toolStore = {
  get: (id: string) => collection.read().find((install) => install.id === id),

  /** Installs a catalog tool; tools without settings connect immediately. */
  install(id: string): ToolInstall {
    const fields = toolMeta[id]?.connection ?? [];
    const timestamp = now();
    const install: ToolInstall = {
      id,
      enabled: true,
      status: fields.some((field) => field.required) ? "needs_setup" : "connected",
      config: defaultConnectionConfig(fields),
      lastTestedAt: null,
      calls7d: 0,
      avgLatencyMs: 0,
      errorRate: 0,
      installedAt: timestamp,
      updatedAt: timestamp,
    };
    collection.write([install, ...collection.read()]);
    return install;
  },

  createCustom(definition: CustomToolDefinition): ToolInstall {
    const timestamp = now();
    const install: ToolInstall = {
      id: `custom-${makeId(definition.name)}`,
      enabled: true,
      status: "needs_setup",
      config: {},
      lastTestedAt: null,
      calls7d: 0,
      avgLatencyMs: 0,
      errorRate: 0,
      installedAt: timestamp,
      updatedAt: timestamp,
      custom: definition,
    };
    collection.write([install, ...collection.read()]);
    return install;
  },

  update(id: string, patch: Partial<Omit<ToolInstall, "id">>) {
    collection.update(id, { ...patch, updatedAt: now() });
  },

  setEnabled(id: string, enabled: boolean) {
    this.update(id, { enabled });
  },

  /** Saving changed settings invalidates the previous connection test. */
  saveConfig(id: string, config: Record<string, NodeConfigValue>, status: ConnectionStatus = "needs_setup") {
    this.update(id, { config, status, error: undefined });
  },

  recordTest(id: string, ok: boolean, error?: string) {
    this.update(id, { status: ok ? "connected" : "error", error: ok ? undefined : error, lastTestedAt: now() });
  },

  remove: (id: string) => collection.remove(id),
  restore: collection.restore,
};
