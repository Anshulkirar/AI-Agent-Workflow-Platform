import { createCollectionStore, makeId } from "@/lib/create-store";
import { seedDocs } from "./seed";
import type { KnowledgeDoc } from "./types";

const collection = createCollectionStore<KnowledgeDoc>({ key: "agentflow-knowledge-v1", seed: seedDocs, limit: 300 });

export const useKnowledgeDocs = collection.useAll;

const now = () => new Date().toISOString();

export type NewDoc = Omit<KnowledgeDoc, "id" | "createdAt" | "updatedAt" | "processedAt" | "status" | "progress" | "attempts" | "chunks" | "tokens">;

export const knowledgeStore = {
  get: (id: string) => collection.read().find((doc) => doc.id === id),
  all: () => collection.read(),

  add(input: NewDoc): KnowledgeDoc {
    const timestamp = now();
    const doc: KnowledgeDoc = {
      ...input,
      id: `doc-${makeId(input.name)}`,
      status: "queued",
      progress: 0,
      attempts: 0,
      chunks: 0,
      tokens: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      processedAt: null,
    };
    collection.write([doc, ...collection.read()]);
    return doc;
  },

  update(id: string, patch: Partial<Omit<KnowledgeDoc, "id">> | ((doc: KnowledgeDoc) => Partial<KnowledgeDoc>)) {
    collection.update(id, (doc) => ({ ...(typeof patch === "function" ? patch(doc) : patch), updatedAt: now() }));
  },

  remove: (id: string) => collection.remove(id),
  restore: collection.restore,
};
