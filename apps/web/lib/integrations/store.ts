import type { NodeConfigValue } from "@/lib/agents/types";
import { createCollectionStore } from "@/lib/create-store";
import { seedConnections } from "./seed";
import type { IntegrationConnection, IntegrationEvent } from "./types";

const collection = createCollectionStore<IntegrationConnection>({ key: "agentflow-integrations-v1", seed: seedConnections });

export const useConnections = collection.useAll;

const now = () => new Date().toISOString();

/** Newest first, capped so storage stays small. */
function withEvent(connection: IntegrationConnection, event: Omit<IntegrationEvent, "at">) {
  return [{ ...event, at: now() }, ...connection.events].slice(0, 12);
}

export const integrationStore = {
  get: (id: string) => collection.read().find((connection) => connection.id === id),

  /** Creates a connection after a successful (simulated) test. */
  connect(id: string, config: Record<string, NodeConfigValue>, scopes: string[], latencyMs: number, how: string): IntegrationConnection {
    const timestamp = now();
    const connection: IntegrationConnection = {
      id,
      status: "connected",
      config,
      scopes,
      alerts: true,
      connectedAt: timestamp,
      updatedAt: timestamp,
      lastTestedAt: timestamp,
      lastSyncAt: timestamp,
      requests7d: 0,
      avgLatencyMs: latencyMs,
      events: [{ at: timestamp, tone: "success", message: how }],
    };
    collection.write([connection, ...collection.read().filter((item) => item.id !== id)]);
    return connection;
  },

  update(id: string, patch: Partial<Omit<IntegrationConnection, "id">>, event?: Omit<IntegrationEvent, "at">) {
    collection.update(id, (connection) => ({
      ...patch,
      updatedAt: now(),
      events: event ? withEvent(connection, event) : connection.events,
    }));
  },

  /** Saving credentials invalidates the previous test result. */
  saveConfig(id: string, config: Record<string, NodeConfigValue>) {
    this.update(id, { config, status: "needs_setup", error: undefined }, { tone: "info", message: "Connection settings updated." });
  },

  recordTest(id: string, ok: boolean, message: string, latencyMs: number) {
    const timestamp = now();
    this.update(
      id,
      ok
        ? { status: "connected", error: undefined, lastTestedAt: timestamp, lastSyncAt: timestamp, avgLatencyMs: latencyMs }
        : { status: "error", error: message, lastTestedAt: timestamp },
      ok ? { tone: "success", message: `Connection test passed (${latencyMs} ms).` } : { tone: "error", message: `Connection test failed: ${message}` },
    );
  },

  remove: (id: string) => collection.remove(id),
  restore: collection.restore,
};
