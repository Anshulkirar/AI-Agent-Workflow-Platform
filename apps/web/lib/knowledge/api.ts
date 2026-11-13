import type { KnowledgeDoc } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(`/api/v1/knowledge${path}`, {
    credentials: "include",
    ...init,
    headers,
  });
  if (!response.ok) throw new Error(`Knowledge request failed (${response.status})`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const knowledgeApi = {
  list: () => request<KnowledgeDoc[]>(""),
  create: (source: Record<string, unknown>) =>
    request<KnowledgeDoc>("", { method: "POST", body: JSON.stringify(source) }),
  upload: (file: File, metadata: { name?: string; collectionId?: string; tags?: string[] }) => {
    const body = new FormData();
    body.set("file", file, file.name);
    if (metadata.name) body.set("name", metadata.name);
    if (metadata.collectionId) body.set("collectionId", metadata.collectionId);
    if (metadata.tags?.length) body.set("tags", metadata.tags.join(","));
    return request<KnowledgeDoc>("/upload", { method: "POST", body });
  },
  update: (id: string, patch: Record<string, unknown>) =>
    request<KnowledgeDoc>(`/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: string) => request<void>(`/${id}`, { method: "DELETE" }),
  retry: (id: string) => request<KnowledgeDoc>(`/${id}/retry`, { method: "POST" }),
  search: (query: string, limit = 5) =>
    request<{ results: { source_id: string; chunk_index: number; content: string; score: number }[] }>("/search", {
      method: "POST",
      body: JSON.stringify({ query, limit }),
    }),
};
