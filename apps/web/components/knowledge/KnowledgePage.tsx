"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Boxes, Database, Eye, FileStack, HardDrive, Layers, LoaderCircle, Plus, RefreshCw, RotateCcw, SearchX, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Select } from "@/components/ui/Field";
import { EmptyState, FilterTabs, SearchInput, StatTile } from "@/components/ui/PageKit";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { knowledgeSources } from "@/lib/agents/catalog";
import { useAgents } from "@/lib/agents/store";
import { cn } from "@/lib/cn";
import { formatCompact } from "@/lib/format";
import { fileKinds, formatBytes } from "@/lib/knowledge/files";
import { cancelIngest, ingest, resumePending, resync, retry } from "@/lib/knowledge/ingest";
import { knowledgeStore, useKnowledgeDocs } from "@/lib/knowledge/store";
import type { FileKind, KnowledgeDoc, ProcessingStatus, SourceType } from "@/lib/knowledge/types";
import { toast } from "@/lib/toast";
import { AddSourceDialog } from "./AddSourceDialog";
import { DocPreviewSheet } from "./DocPreviewSheet";
import { DocStatus, SourceIcon, sourceLabel } from "./KnowledgeVisuals";

type StatusFilter = "all" | "ready" | "processing" | "failed";
type Sort = "recent" | "name" | "size";

const inProgress = (status: ProcessingStatus) => status === "processing" || status === "queued";

/** Highlights the first match of `term` inside a short snippet of `text`. */
function Snippet({ text, term }: { text: string; term: string }) {
  const index = text.toLowerCase().indexOf(term);
  if (index === -1) return null;
  const start = Math.max(0, index - 40);
  const before = text.slice(start, index).replace(/\s+/g, " ");
  const match = text.slice(index, index + term.length);
  const after = text.slice(index + term.length, index + term.length + 60).replace(/\s+/g, " ");
  return (
    <p className="mt-1 truncate text-xs text-muted-foreground">
      {start > 0 && "…"}
      {before}
      <mark className="rounded bg-primary-soft px-0.5 text-primary-soft-foreground">{match}</mark>
      {after}…
    </p>
  );
}

export function KnowledgePage({ initialCollection }: { initialCollection?: string }) {
  const docs = useKnowledgeDocs();
  const agents = useAgents();
  const [collection, setCollectionState] = useState<string>(
    initialCollection && knowledgeSources.some((item) => item.id === initialCollection) ? initialCollection : "all",
  );
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<"all" | SourceType>("all");
  const [kind, setKind] = useState<"all" | FileKind>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [query, setQuery] = useState("");
  const term = useDeferredValue(query.trim().toLowerCase());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<KnowledgeDoc | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Continue any processing that was in flight (simulation lives in memory).
  useEffect(() => {
    resumePending();
  }, []);

  const setCollection = (next: string) => {
    setCollectionState(next);
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("collection");
    else url.searchParams.set("collection", next);
    window.history.replaceState(null, "", url);
  };

  const inCollection = useMemo(() => docs.filter((doc) => collection === "all" || doc.collectionId === collection), [docs, collection]);
  const scoped = inCollection.filter(
    (doc) =>
      (type === "all" || doc.type === type) &&
      (kind === "all" || doc.fileKind === kind) &&
      (!term || `${doc.name} ${doc.url ?? ""} ${doc.tags.join(" ")} ${doc.preview}`.toLowerCase().includes(term)),
  );
  const counts = {
    all: scoped.length,
    ready: scoped.filter((doc) => doc.status === "ready").length,
    processing: scoped.filter((doc) => inProgress(doc.status)).length,
    failed: scoped.filter((doc) => doc.status === "failed").length,
  };
  const visible = scoped
    .filter((doc) => status === "all" || (status === "processing" ? inProgress(doc.status) : doc.status === status))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "size" ? b.sizeBytes - a.sizeBytes : b.createdAt.localeCompare(a.createdAt)));
  const failedVisible = visible.filter((doc) => doc.status === "failed");

  const totals = {
    ready: inCollection.filter((doc) => doc.status === "ready").length,
    processing: inCollection.filter((doc) => inProgress(doc.status)).length,
    chunks: inCollection.reduce((sum, doc) => sum + doc.chunks, 0),
    tokens: inCollection.reduce((sum, doc) => sum + doc.tokens, 0),
    bytes: inCollection.reduce((sum, doc) => sum + doc.sizeBytes, 0),
  };

  const preview = previewId ? (docs.find((doc) => doc.id === previewId) ?? null) : null;
  const filtersActive = Boolean(term) || type !== "all" || kind !== "all" || status !== "all";

  const handleRetry = (doc: KnowledgeDoc) => {
    retry(doc.id);
    toast({ tone: "info", title: `Retrying ${doc.name}`, description: doc.failMode === "permanent" ? "This error usually needs the source fixed first." : "Processing restarted." });
  };

  const handleResync = (doc: KnowledgeDoc) => {
    resync(doc.id);
    toast({ tone: "info", title: `Re-syncing ${doc.name}`, description: "Crawling the latest version of the site." });
  };

  const requestDelete = (doc: KnowledgeDoc) => {
    setPendingDelete(doc);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 animate-fade-up sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Knowledge</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Documents, websites and notes your agents can search and cite.</p>
        </div>
        <button type="button" onClick={() => setAddOpen(true)} className={buttonVariants({ className: "self-start sm:self-auto" })}>
          <Plus size={16} />
          Add source
        </button>
      </header>

      <section aria-label="Knowledge statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile index={0} label="Sources" value={inCollection.length} hint={`${totals.ready} ready`} icon={FileStack} tone="bg-primary-soft text-primary-soft-foreground" />
        <StatTile
          index={1}
          label="Processing"
          value={
            <span className="flex items-center gap-2">
              {totals.processing}
              {totals.processing > 0 && <LoaderCircle size={14} className="animate-spin text-primary" />}
            </span>
          }
          icon={RefreshCw}
          tone="bg-sky-500/10 text-sky-600 dark:text-sky-400"
        />
        <StatTile index={2} label="Indexed chunks" value={formatCompact(totals.chunks)} hint={`${formatCompact(totals.tokens)} tokens`} icon={Layers} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatTile index={3} label="Storage used" value={formatBytes(totals.bytes)} hint="of 5 GB on the Free plan" icon={HardDrive} tone="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Collections */}
        <nav aria-label="Collections" className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
          <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-subtle-foreground lg:block">Collections</p>
          <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
            {[{ id: "all", name: "All sources", description: "" }, ...knowledgeSources].map((item) => {
              const count = item.id === "all" ? docs.length : docs.filter((doc) => doc.collectionId === item.id).length;
              const agentCount = agents.filter((agent) => agent.knowledge.includes(item.id)).length;
              const active = collection === item.id;
              return (
                <li key={item.id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => setCollection(item.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors",
                      active ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.id === "all" ? <Boxes size={16} className="shrink-0" /> : <Database size={16} className="shrink-0" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate whitespace-nowrap text-sm font-medium">{item.name}</span>
                      {item.id !== "all" && (
                        <span className="hidden text-[11px] text-subtle-foreground lg:block">
                          {agentCount ? `Used by ${agentCount} agent${agentCount === 1 ? "" : "s"}` : "Not used yet"}
                        </span>
                      )}
                    </span>
                    <span className={cn("rounded-md px-1.5 text-[11px] tabular-nums", active ? "bg-card/70" : "bg-muted")}>{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <FilterTabs
              label="Filter by status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All", count: counts.all },
                { value: "ready", label: "Ready", count: counts.ready, dot: "bg-success" },
                { value: "processing", label: "Processing", count: counts.processing, dot: "bg-primary" },
                { value: "failed", label: "Failed", count: counts.failed, dot: "bg-danger" },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput value={query} onChange={setQuery} placeholder="Search names and content…" label="Search knowledge" className="min-w-48 flex-1 2xl:w-64 2xl:flex-none" />
              <Select aria-label="Source type" value={type} onChange={(event) => setType(event.target.value as typeof type)} className="w-32">
                <option value="all">All types</option>
                <option value="file">Files</option>
                <option value="url">Websites</option>
                <option value="text">Text</option>
              </Select>
              <Select aria-label="File type" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="w-32">
                <option value="all">Any format</option>
                {(Object.keys(fileKinds) as FileKind[]).map((key) => (
                  <option key={key} value={key}>
                    {fileKinds[key].label}
                  </option>
                ))}
              </Select>
              <Select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="w-32 max-sm:hidden">
                <option value="recent">Newest</option>
                <option value="name">Name</option>
                <option value="size">Largest</option>
              </Select>
            </div>
          </div>

          {failedVisible.length > 1 && status === "failed" && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm animate-fade-in">
              <span className="text-danger">{failedVisible.length} sources failed to process.</span>
              <button
                type="button"
                onClick={() => {
                  failedVisible.forEach((doc) => retry(doc.id));
                  toast({ tone: "info", title: `Retrying ${failedVisible.length} sources` });
                }}
                className={buttonVariants({ size: "sm", variant: "secondary" })}
              >
                <RotateCcw size={14} />
                Retry all
              </button>
            </div>
          )}

          {visible.length === 0 ? (
            inCollection.length === 0 ? (
              <EmptyState
                icon={FileStack}
                title="This collection is empty"
                description="Upload documents, add a website or paste text to give your agents something to search."
                action={
                  <button type="button" onClick={() => setAddOpen(true)} className={buttonVariants({ size: "sm" })}>
                    <Plus size={14} />
                    Add source
                  </button>
                }
              />
            ) : (
              <EmptyState
                icon={SearchX}
                title="No sources match"
                description={term ? `Nothing matches “${term}” in names or content.` : "Try a different filter."}
                action={
                  filtersActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setType("all");
                        setKind("all");
                        setStatus("all");
                      }}
                      className={buttonVariants({ variant: "secondary", size: "sm" })}
                    >
                      Clear filters
                    </button>
                  )
                }
              />
            )
          ) : (
            <div className="rounded-2xl border border-border bg-card shadow-sm shadow-black/[0.02]">
              <div className="hidden grid-cols-[minmax(0,1fr)_150px_80px_80px_100px_40px] gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground md:grid">
                <span>Source</span>
                <span>Status</span>
                <span className="text-right">Size</span>
                <span className="text-right">Chunks</span>
                <span className="text-right">Added</span>
                <span />
              </div>
              <ul className="divide-y divide-border">
                {visible.map((doc) => {
                  const collectionName = knowledgeSources.find((item) => item.id === doc.collectionId)?.name;
                  const nameMatches = !term || doc.name.toLowerCase().includes(term);
                  return (
                    <li
                      key={doc.id}
                      className="group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-muted/50 has-[[aria-expanded=true]]:z-20 sm:px-5 md:grid-cols-[minmax(0,1fr)_150px_80px_80px_100px_40px]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <SourceIcon doc={doc} />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setPreviewId(doc.id)}
                            className="block max-w-full truncate text-left text-sm font-semibold outline-none after:absolute after:inset-0 group-hover:text-primary focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                          >
                            {doc.name}
                          </button>
                          <p className="truncate text-xs text-muted-foreground">
                            {doc.type === "url" ? doc.url : sourceLabel(doc)}
                            {collection === "all" && collectionName && <> · {collectionName}</>}
                          </p>
                          {doc.status === "failed" && <p className="truncate text-xs text-danger">{doc.error}</p>}
                          {term && !nameMatches && <Snippet text={doc.preview} term={term} />}
                        </div>
                      </div>
                      <div className="col-start-1 row-start-2 md:col-start-auto md:row-start-auto">
                        <DocStatus doc={doc} />
                      </div>
                      <span className="hidden text-right text-sm tabular-nums text-muted-foreground md:block">{doc.sizeBytes ? formatBytes(doc.sizeBytes) : "—"}</span>
                      <span className="hidden text-right text-sm tabular-nums md:block">{doc.chunks ? doc.chunks.toLocaleString("en-US") : "—"}</span>
                      <span className="hidden text-right text-xs text-muted-foreground md:block">
                        <RelativeTime iso={doc.createdAt} />
                      </span>
                      <div className="relative z-10 col-start-2 row-span-2 row-start-1 flex items-center justify-end gap-1 md:col-start-auto md:row-span-1 md:row-start-auto">
                        {doc.status === "failed" && (
                          <button
                            type="button"
                            onClick={() => handleRetry(doc)}
                            aria-label={`Retry ${doc.name}`}
                            title="Retry"
                            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-primary-soft hover:text-primary md:hidden"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}
                        <DropdownMenu
                          label={`Actions for ${doc.name}`}
                          items={[
                            { label: "Preview", icon: Eye, onSelect: () => setPreviewId(doc.id) },
                            ...(doc.status === "failed" ? [{ label: "Retry", icon: RotateCcw, onSelect: () => handleRetry(doc) }] : []),
                            ...(doc.type === "url" && doc.status === "ready" ? [{ label: "Re-sync now", icon: RefreshCw, onSelect: () => handleResync(doc) }] : []),
                            "separator" as const,
                            { label: "Delete", icon: Trash2, danger: true, onSelect: () => requestDelete(doc) },
                          ]}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {addOpen && (
        <AddSourceDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          docs={docs}
          defaultCollection={collection === "all" ? (knowledgeSources[0]?.id ?? "product-docs") : collection}
        />
      )}

      <DocPreviewSheet
        doc={preview}
        open={preview !== null}
        onOpenChange={(open) => !open && setPreviewId(null)}
        onRetry={handleRetry}
        onResync={handleResync}
        onDelete={(doc) => {
          setPreviewId(null);
          requestDelete(doc);
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${pendingDelete?.name ?? "source"}”?`}
        description="Its chunks will be removed from the index and agents will no longer cite it. You can undo right after."
        confirmLabel="Delete source"
        onConfirm={() => {
          if (!pendingDelete) return;
          cancelIngest(pendingDelete.id);
          const removed = knowledgeStore.remove(pendingDelete.id);
          if (!removed) return;
          toast({
            title: "Source deleted",
            description: `“${removed.item.name}” was removed.`,
            action: {
              label: "Undo",
              onClick: () => {
                knowledgeStore.restore(removed.item, removed.index);
                if (inProgress(removed.item.status)) ingest(removed.item.id);
              },
            },
          });
        }}
      />
    </div>
  );
}
