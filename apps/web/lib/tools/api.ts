export type ToolIntegration = {
  id: string;
  definitionKey: string;
  name: string;
  description: string;
  enabled: boolean;
  status: "connected" | "needs_setup" | "error";
  config: Record<string, unknown>;
  credentialsConfigured: boolean;
  credentialFields: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  lastTestedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/tools${path}`, {
    credentials: "include",
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`Tool request failed (${response.status})`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const toolsApi = {
  definitions: () => request<unknown[]>("/definitions"),
  list: () => request<ToolIntegration[]>(""),
  get: (id: string) => request<ToolIntegration>(`/${id}`),
  create: (tool: Record<string, unknown>) => request<ToolIntegration>("", { method: "POST", body: JSON.stringify(tool) }),
  update: (id: string, tool: Record<string, unknown>) => request<ToolIntegration>(`/${id}`, { method: "PATCH", body: JSON.stringify(tool) }),
  remove: (id: string) => request<void>(`/${id}`, { method: "DELETE" }),
  test: (id: string, status: "connected" | "needs_setup" | "error", error?: string) => request<ToolIntegration>(`/${id}/test`, { method: "POST", body: JSON.stringify({ status, error }) }),
  agents: (id: string) => request<unknown[]>(`/${id}/agents`),
  associateAgent: (id: string, agentId: string, config: Record<string, unknown> = {}) => request<unknown>(`/${id}/agents`, { method: "POST", body: JSON.stringify({ agentId, config }) }),
  removeAgent: (id: string, agentId: string) => request<void>(`/${id}/agents/${agentId}`, { method: "DELETE" }),
};
