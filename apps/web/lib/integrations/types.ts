import type { NodeConfigValue } from "@/lib/agents/types";
import type { ConnectionStatus } from "@/lib/tools/types";

export type IntegrationEventTone = "success" | "error" | "info";

/** One line in a connection's activity history. */
export type IntegrationEvent = {
  at: string;
  tone: IntegrationEventTone;
  message: string;
};

/**
 * A workspace connection to an external service. Frontend-only: everything is
 * simulated and stored in the browser — no credentials leave the device.
 */
export type IntegrationConnection = {
  /** Integration id from the catalog. */
  id: string;
  status: ConnectionStatus;
  config: Record<string, NodeConfigValue>;
  /** Granted permission keys. */
  scopes: string[];
  /** Notify the workspace when the connection starts failing. */
  alerts: boolean;
  error?: string;
  connectedAt: string;
  updatedAt: string;
  lastTestedAt: string | null;
  lastSyncAt: string | null;
  requests7d: number;
  avgLatencyMs: number;
  events: IntegrationEvent[];
};
