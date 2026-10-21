"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  Coins,
  Info,
  LoaderCircle,
  Play,
  RotateCcw,
  Square,
  Timer,
  TriangleAlert,
  X,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { textareaClass } from "@/components/ui/Field";
import { MarkdownLite } from "@/components/ui/MarkdownLite";
import { cn } from "@/lib/cn";
import type { LogLevel, RunState, RunStatus } from "./use-test-run";

const statusChip: Record<RunStatus, { label: string; className: string }> = {
  idle: { label: "Ready", className: "bg-muted text-muted-foreground" },
  running: { label: "Running", className: "bg-primary-soft text-primary-soft-foreground" },
  success: { label: "Succeeded", className: "bg-success-soft text-success" },
  error: { label: "Failed", className: "bg-danger-soft text-danger" },
  stopped: { label: "Stopped", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
};

const levelIcons: Record<LogLevel, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "text-primary" },
  success: { icon: CircleCheck, className: "text-success" },
  warn: { icon: TriangleAlert, className: "text-amber-500" },
  error: { icon: CircleAlert, className: "text-danger" },
};

type TestRunPanelProps = {
  state: RunState;
  defaultInput: string;
  onRun: (input: string) => void;
  onStop: () => void;
  onReset: () => void;
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
  onOpenRun?: (runId: string) => void;
};

export function TestRunPanel({ state, defaultInput, onRun, onStop, onReset, onClose, onFocusNode, onOpenRun }: TestRunPanelProps) {
  const [input, setInput] = useState(defaultInput);
  const [tab, setTab] = useState<"logs" | "output">("logs");
  const logsRef = useRef<HTMLOListElement>(null);
  const running = state.status === "running";
  const activeTab = state.status === "success" && state.output ? tab : "logs";

  useEffect(() => {
    logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight, behavior: "smooth" });
  }, [state.logs.length]);

  const chip = statusChip[state.status];

  return (
    <section
      aria-label="Test run"
      className="flex h-80 shrink-0 flex-col border-t border-border bg-card animate-fade-up md:h-72"
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold">Test Run</h2>
        <span className={cn("flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold", chip.className)}>
          {running && <LoaderCircle size={11} className="animate-spin" />}
          {chip.label}
        </span>
        {state.durationMs > 0 && (
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Timer size={12} />
            {(state.durationMs / 1000).toFixed(1)}s
          </span>
        )}
        {state.tokens > 0 && (
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Coins size={12} />
            {state.tokens.toLocaleString("en-US")} tokens
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {state.runId && !running && onOpenRun && (
            <button
              type="button"
              onClick={() => onOpenRun(state.runId!)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-soft"
            >
              View run
              <ArrowUpRight size={12} />
            </button>
          )}
          {state.status !== "idle" && !running && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw size={12} />
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close test run panel"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(220px,300px)_1fr]">
        <form
          className="flex flex-col gap-2 border-border p-3 max-md:border-b md:border-r"
          onSubmit={(event) => {
            event.preventDefault();
            if (running) onStop();
            else if (input.trim()) onRun(input.trim());
          }}
        >
          <label htmlFor="test-input" className="text-xs font-medium text-muted-foreground">
            Test input
          </label>
          <textarea
            id="test-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            disabled={running}
            className={cn(textareaClass, "min-h-0 flex-1 resize-none text-[13px] max-md:h-16")}
          />
          <button
            type="submit"
            disabled={!running && !input.trim()}
            className={buttonVariants({
              size: "sm",
              className: cn("w-full", running && "bg-danger shadow-danger/25 hover:bg-danger/90"),
            })}
          >
            {running ? (
              <>
                <Square size={13} className="fill-current" />
                Stop
              </>
            ) : (
              <>
                <Play size={13} className="fill-current" />
                {state.status === "idle" ? "Run test" : "Run again"}
              </>
            )}
          </button>
        </form>

        <div className="flex min-h-0 flex-col">
          <div role="tablist" className="flex gap-1 px-3 pt-2">
            {(["logs", "output"] as const).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={activeTab === item}
                disabled={item === "output" && !state.output}
                onClick={() => setTab(item)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors disabled:opacity-40",
                  activeTab === item ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>

          {activeTab === "output" && state.output ? (
            <div className="m-3 mt-2 min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-muted/50 p-3 text-[13px] leading-6 animate-fade-in">
              <MarkdownLite source={state.output} />
            </div>
          ) : state.logs.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 p-4 text-center text-sm text-muted-foreground">
              <Play size={18} className="text-subtle-foreground" />
              Run a test to watch each node execute step by step.
            </div>
          ) : (
            <ol ref={logsRef} aria-live="polite" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-2 font-mono text-xs">
              {state.logs.map((entry) => {
                const { icon: Icon, className } = levelIcons[entry.level];
                return (
                  <li key={entry.id} className="animate-fade-in">
                    <button
                      type="button"
                      disabled={!entry.nodeId}
                      onClick={() => entry.nodeId && onFocusNode(entry.nodeId)}
                      className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left enabled:hover:bg-muted"
                    >
                      <span className="w-12 shrink-0 tabular-nums text-subtle-foreground">
                        {(entry.at / 1000).toFixed(2)}s
                      </span>
                      <Icon size={13} className={cn("mt-px shrink-0", className)} />
                      <span className={cn("min-w-0 break-words", entry.level === "error" && "text-danger")}>
                        {entry.message}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
