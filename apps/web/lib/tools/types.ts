import type { AgentColor, AgentIconKey, NodeConfigValue } from "@/lib/agents/types";

export type ConnectionStatus = "connected" | "needs_setup" | "error";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type CustomAuthType = "none" | "api_key" | "bearer";

/** A user-defined HTTP tool. */
export type CustomToolDefinition = {
  name: string;
  description: string;
  icon: AgentIconKey;
  color: AgentColor;
  method: HttpMethod;
  endpoint: string;
  authType: CustomAuthType;
  authValue: string;
  headers: string;
  inputSchema: string;
  timeoutSec: number;
};

/** An installed tool: a catalog tool or a custom one. */
export type ToolInstall = {
  /** Catalog tool id, or `custom-…` for custom tools. */
  id: string;
  enabled: boolean;
  status: ConnectionStatus;
  config: Record<string, NodeConfigValue>;
  error?: string;
  lastTestedAt: string | null;
  calls7d: number;
  avgLatencyMs: number;
  errorRate: number;
  installedAt: string;
  updatedAt: string;
  custom?: CustomToolDefinition;
};
