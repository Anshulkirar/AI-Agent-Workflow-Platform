"use client";

import { useRef, useState, type DragEvent } from "react";
import { CircleAlert, CloudUpload, FileText, Globe, Type, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Select, inputClass, textareaClass } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { knowledgeSources } from "@/lib/agents/catalog";
import { cn } from "@/lib/cn";
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILES_PER_UPLOAD,
  MAX_FILE_BYTES,
  detectFileKind,
  fileKinds,
  formatBytes,
  validateFile,
} from "@/lib/knowledge/files";
import { ingest } from "@/lib/knowledge/ingest";
import { knowledgeStore } from "@/lib/knowledge/store";
import type { KnowledgeDoc, SyncSchedule } from "@/lib/knowledge/types";
import { toast } from "@/lib/toast";

type Tab = "upload" | "url" | "text";
type Pending = { id: string; file: File; error: string | null };

const PREVIEW_CHARS = 4000;

function mockPreview(name: string, collection: string) {
  const title = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  return `${title}\n\nThis document was added to the "${collection}" collection. Its text is extracted, split into ~400-token chunks, embedded and indexed so agents can cite it.\n\n(Demo mode: binary files are never uploaded, so this preview is generated.)`;
}

export function AddSourceDialog({
  open,
  onOpenChange,
  docs,
  defaultCollection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docs: KnowledgeDoc[];
  defaultCollection: string;
}) {
  const [tab, setTab] = useState<Tab>("upload");
  const [collectionId, setCollectionId] = useState(defaultCollection);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Website
  const [url, setUrl] = useState("");
  const [depth, setDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(50);
  const [includeSubpaths, setIncludeSubpaths] = useState(true);
  const [schedule, setSchedule] = useState<SyncSchedule>("weekly");

  // Text
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const collection = knowledgeSources.find((item) => item.id === collectionId) ?? knowledgeSources[0]!;
  const takenNames = new Set(docs.filter((doc) => doc.collectionId === collectionId).map((doc) => doc.name.toLowerCase()));

  const reset = () => {
    setPending([]);
    setUrl("");
    setTitle("");
    setContent("");
    setSubmitted(false);
    setSubmitting(false);
  };

  const close = () => {
    onOpenChange(false);
    window.setTimeout(reset, 200);
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setPending((current) => {
      const names = new Set([...takenNames, ...current.map((item) => item.file.name.toLowerCase())]);
      const room = Math.max(0, MAX_FILES_PER_UPLOAD - current.length);
      const next = [...list].slice(0, room).map((file) => {
        const error = validateFile(file, names);
        names.add(file.name.toLowerCase());
        return { id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 6)}`, file, error };
      });
      if (list.length > room) toast({ tone: "info", title: `Only ${MAX_FILES_PER_UPLOAD} files per upload`, description: "Add the rest in another batch." });
      return [...current, ...next];
    });
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  // --- validation
  const validFiles = pending.filter((item) => !item.error);
  const urlError = (() => {
    const value = url.trim();
    if (!value) return "Enter a website URL.";
    try {
      const parsed = new URL(value);
      if (!/^https?:$/.test(parsed.protocol)) return "Only http:// and https:// URLs are supported.";
    } catch {
      return "Enter a valid URL, like https://docs.example.com.";
    }
    if (docs.some((doc) => doc.url === value)) return "This URL is already a source.";
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 500) return "Max pages must be between 1 and 500.";
    return null;
  })();
  const titleError = title.trim().length < 3 ? "Give the text a title (3+ characters)." : takenNames.has(title.trim().toLowerCase()) ? "A source with this title already exists." : null;
  const contentError = content.trim().length < 20 ? "Add at least 20 characters of content." : content.length > 20_000 ? "Keep text sources under 20,000 characters." : null;

  const submit = async () => {
    setSubmitted(true);
    if (tab === "upload") {
      if (!validFiles.length) return;
      setSubmitting(true);
      for (const { file } of validFiles) {
        const kind = detectFileKind(file.name)!;
        const preview = fileKinds[kind].textReadable
          ? (await file.slice(0, PREVIEW_CHARS * 2).text()).slice(0, PREVIEW_CHARS)
          : mockPreview(file.name, collection.name);
        const doc = knowledgeStore.add({ name: file.name, type: "file", fileKind: kind, collectionId, tags: [], sizeBytes: file.size, preview });
        ingest(doc.id);
      }
      toast({ title: `${validFiles.length} file${validFiles.length === 1 ? "" : "s"} uploading`, description: `Processing into “${collection.name}”.` });
    } else if (tab === "url") {
      if (urlError) return;
      const value = url.trim();
      const host = new URL(value).hostname;
      const doc = knowledgeStore.add({
        name: host.replace(/^www\./, ""),
        type: "url",
        url: value,
        crawl: { depth, maxPages, includeSubpaths },
        syncSchedule: schedule,
        collectionId,
        tags: [],
        sizeBytes: 0,
        preview: `Pages crawled from ${value} appear here once indexing finishes.`,
      });
      ingest(doc.id);
      toast({ title: "Crawling website", description: `Up to ${maxPages} pages from ${host}.` });
    } else {
      if (titleError || contentError) return;
      const doc = knowledgeStore.add({
        name: title.trim(),
        type: "text",
        collectionId,
        tags: [],
        sizeBytes: new Blob([content]).size,
        preview: content.trim(),
      });
      ingest(doc.id);
      toast({ title: "Text added", description: `Indexing “${title.trim()}”.` });
    }
    close();
  };

  const tabs: { value: Tab; label: string; icon: typeof FileText }[] = [
    { value: "upload", label: "Upload files", icon: CloudUpload },
    { value: "url", label: "Website", icon: Globe },
    { value: "text", label: "Text", icon: Type },
  ];

  const submitLabel =
    tab === "upload" ? `Upload ${validFiles.length || ""} file${validFiles.length === 1 ? "" : "s"}`.replace("  ", " ") : tab === "url" ? "Add website" : "Add text";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Add knowledge source"
      description="Files, websites and text are chunked and indexed so agents can search them."
      footer={
        <>
          <button type="button" onClick={close} className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || (tab === "upload" && validFiles.length === 0)}
            className={buttonVariants({ className: "min-w-32" })}
          >
            {submitting ? "Uploading…" : submitLabel}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div role="tablist" aria-label="Source type" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted p-1">
          {tabs.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => {
                setTab(value);
                setSubmitted(false);
              }}
              className={cn(
                "flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all",
                tab === value ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <Field label="Collection" htmlFor="source-collection" hint={collection.description}>
          <Select id="source-collection" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
            {knowledgeSources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>

        {tab === "upload" && (
          <div className="space-y-3">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
                dragging ? "border-primary bg-primary-soft/50" : "border-border",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                <CloudUpload size={20} />
              </span>
              <p className="text-sm font-semibold">Drag and drop files here</p>
              <p className="text-xs text-muted-foreground">
                {Object.values(fileKinds).map((kind) => kind.label).join(", ")} · up to {formatBytes(MAX_FILE_BYTES)} each
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:border-primary/40"
              >
                Browse files
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPT_ATTRIBUTE}
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>
            {submitted && validFiles.length === 0 && <p className="text-xs font-medium text-danger">Add at least one supported file.</p>}
            {pending.length > 0 && (
              <ul className="space-y-2" aria-label="Selected files">
                {pending.map((item) => (
                  <li
                    key={item.id}
                    className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5 animate-fade-in", item.error ? "border-danger/40 bg-danger-soft/50" : "border-border")}
                  >
                    <FileText size={16} className={item.error ? "text-danger" : "text-primary"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{item.file.name}</span>
                      <span className={cn("block text-[11px]", item.error ? "font-medium text-danger" : "text-muted-foreground")}>
                        {item.error ?? `${formatBytes(item.file.size)} · ${fileKinds[detectFileKind(item.file.name)!].label}`}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => setPending((current) => current.filter((entry) => entry.id !== item.id))}
                      className="rounded-md p-1 text-subtle-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="flex items-start gap-1.5 text-[11px] text-subtle-foreground">
              <CircleAlert size={12} className="mt-px shrink-0" />
              Demo: files stay in your browser. Text formats are previewed from their real content; names containing “corrupt” or “timeout” simulate failures.
            </p>
          </div>
        )}

        {tab === "url" && (
          <div className="space-y-4">
            <Field label="Website URL" htmlFor="source-url" error={submitted ? (urlError ?? undefined) : undefined}>
              <input
                id="source-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://docs.example.com"
                aria-invalid={submitted && urlError ? true : undefined}
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Crawl depth" htmlFor="source-depth">
                <Select id="source-depth" value={depth} onChange={(event) => setDepth(Number(event.target.value))}>
                  <option value={1}>This page only</option>
                  <option value={2}>2 levels</option>
                  <option value={3}>3 levels</option>
                </Select>
              </Field>
              <Field label="Max pages" htmlFor="source-max-pages">
                <input
                  id="source-max-pages"
                  type="number"
                  min={1}
                  max={500}
                  value={maxPages}
                  onChange={(event) => setMaxPages(Number(event.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label="Re-sync" htmlFor="source-schedule">
                <Select id="source-schedule" value={schedule} onChange={(event) => setSchedule(event.target.value as SyncSchedule)}>
                  <option value="manual">Manually</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </Select>
              </Field>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Include sub-pages</p>
                <p className="text-xs text-muted-foreground">Follow links under the same path.</p>
              </div>
              <Switch checked={includeSubpaths} onCheckedChange={setIncludeSubpaths} label="Include sub-pages" />
            </div>
          </div>
        )}

        {tab === "text" && (
          <div className="space-y-4">
            <Field label="Title" htmlFor="source-title" error={submitted ? (titleError ?? undefined) : undefined}>
              <input
                id="source-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Refund policy"
                aria-invalid={submitted && titleError ? true : undefined}
                className={inputClass}
              />
            </Field>
            <Field
              label="Content"
              htmlFor="source-content"
              error={submitted ? (contentError ?? undefined) : undefined}
              aside={<span className="text-[11px] tabular-nums text-subtle-foreground">{content.length.toLocaleString("en-US")}/20,000</span>}
            >
              <textarea
                id="source-content"
                rows={8}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Paste FAQs, policies or notes…"
                aria-invalid={submitted && contentError ? true : undefined}
                className={textareaClass}
              />
            </Field>
          </div>
        )}
      </div>
    </Dialog>
  );
}
