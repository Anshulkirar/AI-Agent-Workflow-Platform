export type SourceType = "file" | "url" | "text";
export type FileKind = "pdf" | "docx" | "txt" | "md" | "csv" | "xlsx" | "json" | "html";
export type ProcessingStatus = "queued" | "processing" | "ready" | "failed";
export type ProcessingStage = "uploading" | "crawling" | "parsing" | "chunking" | "embedding" | "indexing";
export type SyncSchedule = "manual" | "daily" | "weekly";

export type CrawlOptions = {
  depth: number;
  maxPages: number;
  includeSubpaths: boolean;
};

export type KnowledgeDoc = {
  id: string;
  name: string;
  type: SourceType;
  fileKind?: FileKind;
  url?: string;
  crawl?: CrawlOptions;
  syncSchedule?: SyncSchedule;
  /** A collection from the shared knowledge catalog (lib/agents/catalog.ts). */
  collectionId: string;
  tags: string[];
  sizeBytes: number;
  pages?: number;
  chunks: number;
  tokens: number;
  status: ProcessingStatus;
  stage?: ProcessingStage;
  /** Overall processing progress, 0–100. */
  progress: number;
  error?: string;
  /** Permanent failures fail again on retry; transient ones recover. */
  failMode?: "transient" | "permanent";
  attempts: number;
  /** Extracted text (or the first part of it). */
  preview: string;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
};
