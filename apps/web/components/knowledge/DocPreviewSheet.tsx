"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Check, CircleX, ExternalLink, LoaderCircle, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { AgentAvatar } from "@/components/agents/AgentVisuals";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dialog } from "@/components/ui/Dialog";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { knowledgeSources } from "@/lib/agents/catalog";
import { useAgents } from "@/lib/agents/store";
import { cn } from "@/lib/cn";
import { formatCompact } from "@/lib/format";
import { estimateTokens, formatBytes, stageLabels, stagesFor } from "@/lib/knowledge/files";
import type { KnowledgeDoc } from "@/lib/knowledge/types";
import { DocStatus, SourceIcon, sourceLabel } from "./KnowledgeVisuals";

/** Splits extracted text into display chunks (roughly how the indexer sees it). */
function sampleChunks(text: string) {
  const paragraphs = text.split(/\n{2,}/).filter((part) => part.trim());
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if ((current + paragraph).length > 420 && current) {
      chunks.push(current.trim());
      current = "";
    }
    current += `${paragraph}\n\n`;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.slice(0, 3);
}

export function DocPreviewSheet({
  doc,
  open,
  onOpenChange,
  onRetry,
  onResync,
  onDelete,
}: {
  doc: KnowledgeDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: (doc: KnowledgeDoc) => void;
  onResync: (doc: KnowledgeDoc) => void;
  onDelete: (doc: KnowledgeDoc) => void;
}) {
  const agents = useAgents();
  if (!doc) return null;

  const collection = knowledgeSources.find((item) => item.id === doc.collectionId);
  const usedBy = agents.filter((agent) => agent.knowledge.includes(doc.collectionId));
  const stages = stagesFor(doc.type);
  const currentStage = doc.stage ? stages.indexOf(doc.stage) : -1;
  const processing = doc.status === "processing" || doc.status === "queued";
  const chunks = doc.status === "ready" ? sampleChunks(doc.preview) : [];

  const rows: [string, ReactNode][] = [
    ["Type", sourceLabel(doc)],
    ["Collection", collection?.name ?? doc.collectionId],
    ...(doc.url
      ? ([
          [
            "Source URL",
            <a key="url" href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-primary hover:underline">
              {doc.url}
              <ExternalLink size={12} className="shrink-0" />
            </a>,
          ],
        ] as [string, ReactNode][])
      : []),
    ...(doc.crawl ? ([["Crawl", `Depth ${doc.crawl.depth} · up to ${doc.crawl.maxPages} pages${doc.crawl.includeSubpaths ? " · sub-pages" : ""}`]] as [string, ReactNode][]) : []),
    ...(doc.syncSchedule ? ([["Re-sync", doc.syncSchedule === "manual" ? "Manually" : doc.syncSchedule === "daily" ? "Daily" : "Weekly"]] as [string, ReactNode][]) : []),
    ["Size", doc.sizeBytes ? formatBytes(doc.sizeBytes) : "—"],
    ...(doc.pages ? ([[doc.type === "url" ? "Pages crawled" : "Pages", doc.pages.toLocaleString("en-US")]] as [string, ReactNode][]) : []),
    ["Chunks", doc.chunks ? doc.chunks.toLocaleString("en-US") : "—"],
    ["Tokens", doc.tokens ? formatCompact(doc.tokens) : "—"],
    ["Added", <RelativeTime key="added" iso={doc.createdAt} />],
    ["Last processed", doc.processedAt ? <RelativeTime key="processed" iso={doc.processedAt} /> : "—"],
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      title={
        <span className="flex items-center gap-3">
          <SourceIcon doc={doc} />
          <span className="min-w-0 break-words">{doc.name}</span>
        </span>
      }
      footer={
        <>
          <button type="button" onClick={() => onDelete(doc)} className={buttonVariants({ variant: "ghost", className: "mr-auto text-danger hover:bg-danger-soft hover:text-danger" })}>
            <Trash2 size={15} />
            Delete
          </button>
          {doc.status === "failed" && (
            <button type="button" onClick={() => onRetry(doc)} className={buttonVariants()}>
              <RotateCcw size={15} />
              Retry
            </button>
          )}
          {doc.status === "ready" && doc.type === "url" && (
            <button type="button" onClick={() => onResync(doc)} className={buttonVariants({ variant: "secondary" })}>
              <RefreshCw size={15} />
              Re-sync now
            </button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        <section aria-label="Processing">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Processing</h3>
            <DocStatus doc={doc} compact />
          </div>
          {doc.status === "failed" && (
            <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <CircleX size={16} className="mt-0.5 shrink-0" />
              <span>
                {doc.error}
                {doc.failMode === "permanent" && <span className="mt-1 block text-xs text-foreground/70">Retrying will likely fail until the source is fixed.</span>}
              </span>
            </p>
          )}
          <ol className="flex flex-wrap gap-2">
            {stages.map((stage, index) => {
              const done = doc.status === "ready" || index < currentStage;
              const active = index === currentStage && processing;
              const failed = index === currentStage && doc.status === "failed";
              return (
                <li
                  key={stage}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                    failed ? "border-danger/40 text-danger" : done ? "border-success/30 text-success" : active ? "border-primary/40 text-primary" : "border-border text-muted-foreground",
                  )}
                >
                  {failed ? <CircleX size={12} /> : done ? <Check size={12} /> : active ? <LoaderCircle size={12} className="animate-spin" /> : <span className="size-1.5 rounded-full bg-border" />}
                  {stageLabels[stage]}
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-label="Details">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Details</h3>
          <dl className="divide-y divide-border rounded-xl border border-border text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="shrink-0 text-muted-foreground">{label}</dt>
                <dd className="min-w-0 text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {doc.preview && (
          <section aria-label="Content preview">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Content preview</h3>
              <CopyButton value={doc.preview} label="Copy text" />
            </div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/40 p-4 font-sans text-[13px] leading-6">
              {doc.preview}
            </pre>
          </section>
        )}

        {chunks.length > 0 && (
          <section aria-label="Sample chunks">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
              Sample chunks <span className="normal-case tracking-normal">· {doc.chunks.toLocaleString("en-US")} total</span>
            </h3>
            <ol className="space-y-2">
              {chunks.map((chunk, index) => (
                <li key={index} className="rounded-xl border border-border p-3">
                  <p className="mb-1.5 flex justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>Chunk {index + 1}</span>
                    <span className="tabular-nums">{estimateTokens(chunk)} tokens</span>
                  </p>
                  <p className="line-clamp-3 text-xs leading-5">{chunk}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-label="Used by">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Available to agents</h3>
          {usedBy.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agents use the “{collection?.name}” collection yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {usedBy.map((agent) => (
                <li key={agent.id}>
                  <Link href={`/agents/${agent.id}/edit?step=knowledge`} className="flex items-center gap-2 rounded-xl border border-border py-1.5 pl-1.5 pr-3 text-sm font-medium hover:border-primary/40">
                    <AgentAvatar icon={agent.icon} color={agent.color} size="sm" />
                    {agent.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Dialog>
  );
}
