import { CircleCheck, CircleX, Clock3, FileText, Globe, LoaderCircle, Type } from "lucide-react";
import { cn } from "@/lib/cn";
import { fileKinds } from "@/lib/knowledge/files";
import { describeStage } from "@/lib/knowledge/ingest";
import type { KnowledgeDoc } from "@/lib/knowledge/types";

export function sourceLabel(doc: Pick<KnowledgeDoc, "type" | "fileKind">) {
  if (doc.type === "url") return "Website";
  if (doc.type === "text") return "Text";
  return doc.fileKind ? fileKinds[doc.fileKind].label : "File";
}

export function SourceIcon({ doc, size = "md" }: { doc: Pick<KnowledgeDoc, "type" | "fileKind">; size?: "md" | "lg" }) {
  const tone =
    doc.type === "url"
      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
      : doc.type === "text"
        ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
        : doc.fileKind
          ? fileKinds[doc.fileKind].tone
          : "bg-muted text-muted-foreground";
  const Icon = doc.type === "url" ? Globe : doc.type === "text" ? Type : FileText;
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        size === "md" ? "size-10 rounded-xl [&_svg]:size-4.5" : "size-12 rounded-2xl [&_svg]:size-5.5",
        tone,
      )}
    >
      <Icon />
      {doc.type === "file" && doc.fileKind && (
        <span aria-hidden className="absolute -bottom-1 -right-1 rounded bg-card px-1 text-[8px] font-bold uppercase leading-3 ring-1 ring-border">
          {doc.fileKind}
        </span>
      )}
    </span>
  );
}

/** Ready / failed badge, or a live progress bar while processing. */
export function DocStatus({ doc, compact = false }: { doc: KnowledgeDoc; compact?: boolean }) {
  if (doc.status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
        <CircleCheck size={12} />
        Ready
      </span>
    );
  }
  if (doc.status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
        <CircleX size={12} />
        Failed
      </span>
    );
  }
  const queued = doc.status === "queued";
  return (
    <div className={cn("min-w-0", compact ? "w-28" : "w-36")} aria-live="polite">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
        {queued ? <Clock3 size={12} /> : <LoaderCircle size={12} className="animate-spin" />}
        <span className="truncate">{describeStage(doc)}</span>
        <span className="ml-auto tabular-nums text-muted-foreground">{doc.progress}%</span>
      </p>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={doc.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Processing ${doc.name}`}
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${Math.max(doc.progress, 3)}%` }} />
      </div>
    </div>
  );
}
