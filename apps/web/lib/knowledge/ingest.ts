import { estimateTokens, fileKinds, stagesFor, stageLabels } from "./files";
import { knowledgeStore } from "./store";
import type { KnowledgeDoc, ProcessingStage } from "./types";

/*
 * Simulated ingestion pipeline. Each source moves through its stages
 * (upload/crawl → extract → chunk → embed → index) with live progress.
 * Nothing leaves the browser.
 */

const active = new Set<string>();
const TICK_MS = 180;
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function isIngesting(id: string) {
  return active.has(id);
}

type Failure = { stage: ProcessingStage; message: string; mode: "transient" | "permanent" };

/** Deterministic, demo-able failure rules. */
function failureFor(doc: KnowledgeDoc): Failure | null {
  if (doc.type === "url" && doc.url) {
    const host = (() => {
      try {
        return new URL(doc.url).hostname;
      } catch {
        return doc.url;
      }
    })();
    if (/invalid|localhost/i.test(host)) {
      return { stage: "crawling", mode: "permanent", message: `Couldn't reach ${host} — DNS lookup failed. Check the URL or make the page public.` };
    }
  }
  if (doc.type === "file" && /corrupt|broken/i.test(doc.name)) {
    return { stage: "parsing", mode: "permanent", message: "The file appears to be corrupted (invalid header). Re-export it and upload it again." };
  }
  // Names containing "timeout" fail once, then succeed on retry.
  if (/timeout/i.test(doc.name) && doc.attempts <= 1 && doc.failMode !== "transient") {
    return { stage: "parsing", mode: "transient", message: "Timed out while extracting text after 120s. This is usually temporary — retry to resume." };
  }
  return null;
}

function stageDuration(doc: KnowledgeDoc, stage: ProcessingStage) {
  if (stage === "uploading") return Math.min(2600, 500 + (doc.sizeBytes / (2 * 1024 * 1024)) * 350);
  if (stage === "crawling") return 1600 + (doc.crawl?.maxPages ?? 20) * 4;
  return 700 + Math.random() * 700;
}

/** Final metrics once a source is indexed. */
function finalMetrics(doc: KnowledgeDoc) {
  if (doc.type === "url") {
    const pages = Math.max(1, Math.round((doc.crawl?.maxPages ?? 20) * (0.35 + Math.random() * 0.5)));
    const tokens = pages * (900 + Math.round(Math.random() * 900));
    return { pages, tokens, chunks: Math.ceil(tokens / 380), sizeBytes: tokens * 4 };
  }
  if (doc.type === "text" || (doc.fileKind && fileKinds[doc.fileKind].textReadable)) {
    // Plain-text formats: roughly 4 bytes per token.
    const tokens = Math.max(estimateTokens(doc.preview), Math.round(doc.sizeBytes / 4));
    return { tokens, chunks: Math.max(1, Math.ceil(tokens / 380)), pages: doc.pages, sizeBytes: doc.sizeBytes };
  }
  // Binary formats (PDF, Word, Excel): file size mostly isn't text, so estimate from pages.
  const pages = Math.max(1, Math.round(doc.sizeBytes / 140_000));
  const tokens = pages * (doc.fileKind === "xlsx" ? 900 : 520);
  return {
    tokens,
    chunks: Math.max(1, Math.ceil(tokens / 380)),
    pages: doc.fileKind === "xlsx" ? doc.pages : pages,
    sizeBytes: doc.sizeBytes,
  };
}

/** Starts (or resumes) processing a source. */
export function ingest(id: string) {
  if (active.has(id)) return;
  const doc = knowledgeStore.get(id);
  if (!doc) return;
  active.add(id);

  const stages = stagesFor(doc.type);
  // Resume from the stage it was at, if any.
  const startIndex = Math.max(0, doc.stage && doc.status === "processing" ? stages.indexOf(doc.stage) : 0);
  const failure = failureFor(doc);
  knowledgeStore.update(id, (current) => ({ status: "processing", error: undefined, attempts: current.attempts + (startIndex === 0 ? 1 : 0) }));

  void (async () => {
    for (let index = startIndex; index < stages.length; index++) {
      const stage = stages[index]!;
      const duration = stageDuration(doc, stage);
      const ticks = Math.max(2, Math.round(duration / TICK_MS));
      for (let tick = 1; tick <= ticks; tick++) {
        if (!active.has(id) || !knowledgeStore.get(id)) {
          active.delete(id);
          return;
        }
        const stageProgress = tick / ticks;
        if (failure && failure.stage === stage && stageProgress >= 0.5) {
          active.delete(id);
          knowledgeStore.update(id, {
            status: "failed",
            stage,
            error: failure.message,
            failMode: failure.mode,
          });
          return;
        }
        knowledgeStore.update(id, {
          stage,
          progress: Math.round(((index + stageProgress) / stages.length) * 100),
        });
        await sleep(TICK_MS);
      }
    }

    active.delete(id);
    if (!knowledgeStore.get(id)) return;
    knowledgeStore.update(id, (current) => ({
      ...finalMetrics(current),
      status: "ready",
      stage: undefined,
      progress: 100,
      error: undefined,
      processedAt: new Date().toISOString(),
    }));
  })();
}

/** Retries a failed source from the beginning. */
export function retry(id: string) {
  knowledgeStore.update(id, { status: "queued", stage: undefined, progress: 0, error: undefined });
  ingest(id);
}

/** Re-crawls a website source. */
export function resync(id: string) {
  knowledgeStore.update(id, { status: "queued", stage: undefined, progress: 0 });
  ingest(id);
}

/** Resumes anything left queued/processing (e.g. after a reload). */
export function resumePending() {
  knowledgeStore
    .all()
    .filter((doc) => (doc.status === "processing" || doc.status === "queued") && !active.has(doc.id))
    .forEach((doc) => ingest(doc.id));
}

export function cancelIngest(id: string) {
  active.delete(id);
}

export function describeStage(doc: KnowledgeDoc) {
  if (doc.status === "queued") return "Queued";
  return doc.stage ? stageLabels[doc.stage] : "Processing";
}
