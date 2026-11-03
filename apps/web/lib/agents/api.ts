import type { Agent, AgentInput } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/agents${path}`, { credentials: "include", ...init, headers: { "content-type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(`Agent request failed (${response.status})`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const agentsApi = {
  list: () => request<Agent[]>(""),
  get: (id: string) => request<Agent>(`/${id}`),
  create: (agent: AgentInput) => request<Agent>("", { method: "POST", body: JSON.stringify(agent) }),
  update: (id: string, agent: Partial<AgentInput>) => request<Agent>(`/${id}`, { method: "PATCH", body: JSON.stringify(agent) }),
  remove: (id: string) => request<void>(`/${id}`, { method: "DELETE" }),
  versions: (id: string) => request<unknown[]>(`/${id}/versions`),
};
