"use client";

import { useRef, useState, type DragEvent } from "react";
import { Check, Database, FileText, FolderOpen, Globe, Upload, X } from "lucide-react";
import { NotionIcon } from "@/components/icons/BrandIcons";
import { knowledgeSources } from "@/lib/agents/catalog";
import { cn } from "@/lib/cn";
import { useKnowledgeDocs } from "@/lib/knowledge/store";
import type { StepProps } from "./wizard-config";

const typeIcons = {
  Website: Globe,
  Notion: NotionIcon,
  Drive: FolderOpen,
  Database: Database,
} as const;

const MAX_FILES = 10;

export function KnowledgeStep({ draft, update }: StepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const files = draft.knowledge.filter((id) => id.startsWith("file:"));
  const docs = useKnowledgeDocs();
  // Live counts from the Knowledge section.
  const sourceCount = (collectionId: string) => docs.filter((doc) => doc.collectionId === collectionId).length;

  const toggle = (id: string) =>
    update((current) => ({
      knowledge: current.knowledge.includes(id)
        ? current.knowledge.filter((item) => item !== id)
        : [...current.knowledge, id],
    }));

  // Frontend-only: we keep file names, nothing is uploaded.
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const room = Math.max(0, MAX_FILES - files.length);
    const names = [...list]
      .map((file) => `file:${file.name}`)
      .filter((id) => !draft.knowledge.includes(id))
      .slice(0, room);
    update({ knowledge: [...draft.knowledge, ...names] });
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium">Connected sources</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {knowledgeSources.map((source) => {
            const selected = draft.knowledge.includes(source.id);
            const Icon = typeIcons[source.type];
            return (
              <button
                key={source.id}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggle(source.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                  selected
                    ? "border-primary bg-primary-soft/50 ring-4 ring-primary/10"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{source.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {source.type} · {sourceCount(source.id)} source{sourceCount(source.id) === 1 ? "" : "s"}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                  )}
                >
                  {selected && <Check size={13} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Upload files</p>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging ? "border-primary bg-primary-soft/50" : "border-border",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
            <Upload size={20} />
          </span>
          <p className="text-sm font-semibold">Drag and drop files here</p>
          <p className="text-xs text-muted-foreground">PDF, DOCX, CSV, TXT or Markdown · up to {MAX_FILES} files</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:border-primary/40"
          >
            Browse files
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.csv,.txt,.md"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((id) => (
              <li
                key={id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 animate-fade-in"
              >
                <FileText size={16} className="text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm">{id.slice(5)}</span>
                <span className="text-[11px] text-success">Ready</span>
                <button
                  type="button"
                  aria-label={`Remove ${id.slice(5)}`}
                  onClick={() => toggle(id)}
                  className="rounded-md p-1 text-subtle-foreground hover:bg-muted hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
