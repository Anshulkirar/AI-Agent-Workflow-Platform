import type { FileKind, ProcessingStage, SourceType } from "./types";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 10;

export const fileKinds: Record<FileKind, { label: string; extensions: string[]; tone: string; textReadable: boolean }> = {
  pdf: { label: "PDF", extensions: ["pdf"], tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400", textReadable: false },
  docx: { label: "Word", extensions: ["docx", "doc"], tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400", textReadable: false },
  xlsx: { label: "Excel", extensions: ["xlsx", "xls"], tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", textReadable: false },
  csv: { label: "CSV", extensions: ["csv"], tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", textReadable: true },
  txt: { label: "Text", extensions: ["txt"], tone: "bg-slate-500/10 text-slate-600 dark:text-slate-300", textReadable: true },
  md: { label: "Markdown", extensions: ["md", "markdown"], tone: "bg-slate-500/10 text-slate-600 dark:text-slate-300", textReadable: true },
  json: { label: "JSON", extensions: ["json"], tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400", textReadable: true },
  html: { label: "HTML", extensions: ["html", "htm"], tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400", textReadable: true },
};

export const ACCEPT_ATTRIBUTE = Object.values(fileKinds)
  .flatMap((kind) => kind.extensions.map((extension) => `.${extension}`))
  .join(",");

export function detectFileKind(name: string): FileKind | null {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const match = (Object.keys(fileKinds) as FileKind[]).find((kind) => fileKinds[kind].extensions.includes(extension));
  return match ?? null;
}

/** Returns a human-readable reason a file can't be added, or null. */
export function validateFile(file: { name: string; size: number }, takenNames: Set<string>): string | null {
  if (!detectFileKind(file.name)) return "Unsupported file type.";
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_FILE_BYTES) return `Larger than ${formatBytes(MAX_FILE_BYTES)}.`;
  if (takenNames.has(file.name.toLowerCase())) return "A file with this name is already in the collection.";
  return null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function stagesFor(type: SourceType): ProcessingStage[] {
  if (type === "file") return ["uploading", "parsing", "chunking", "embedding", "indexing"];
  if (type === "url") return ["crawling", "parsing", "chunking", "embedding", "indexing"];
  return ["chunking", "embedding", "indexing"];
}

export const stageLabels: Record<ProcessingStage, string> = {
  uploading: "Uploading",
  crawling: "Crawling pages",
  parsing: "Extracting text",
  chunking: "Chunking",
  embedding: "Generating embeddings",
  indexing: "Indexing",
};

export function estimateTokens(text: string) {
  return Math.max(1, Math.round(text.length / 4));
}
