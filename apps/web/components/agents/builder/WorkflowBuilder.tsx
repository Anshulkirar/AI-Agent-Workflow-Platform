"use client";

import "@xyflow/react/dist/style.css";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  addEdge,
  getOutgoers,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type IsValidConnection,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import {
  LoaderCircle,
  MousePointerClick,
  PanelLeft,
  Play,
  Save,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useTheme } from "@/components/theme/use-theme";
import { defaultNodeConfig, nodeTemplates, type NodeTemplate } from "@/lib/agents/catalog";
import type { ModelSettings, NodeConfigValue, Workflow, WorkflowNodeData } from "@/lib/agents/types";
import { NODE_WIDTH, layoutWorkflow, nodeId } from "@/lib/agents/workflow";
import { cn } from "@/lib/cn";
import type { Run, RunSource } from "@/lib/runs/types";
import { toast } from "@/lib/toast";
import { AgentSettingsPanel } from "./AgentSettingsPanel";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { NodePalette } from "./NodePalette";
import { TestRunPanel } from "./TestRunPanel";
import { DND_MIME, edgeDefaults, toFlowEdges, toFlowNodes, toWorkflow, type AppEdge, type AppNode } from "./types";
import { useTestRun } from "./use-test-run";
import { WorkflowNode } from "./WorkflowNode";

const nodeTypes = { workflow: WorkflowNode };

export type BuilderTab = { label: string; href: string | null };

export type WorkflowBuilderProps = {
  title: string;
  avatar: ReactNode;
  badge?: ReactNode;
  breadcrumbs: Crumb[];
  /** Section tabs; the one with `href: null` is the builder itself. */
  tabs: BuilderTab[];
  initialGraph: Workflow;
  initialSettings: ModelSettings;
  /** When the graph was last saved (null = never). */
  savedAt: string | null;
  /** Default prompt for new LLM nodes. */
  instructions?: string;
  advancedSettingsHref: string;
  runSource: RunSource;
  /** Additional palette entries (e.g. agents usable as nodes). */
  extraTemplates?: NodeTemplate[];
  onSave: (graph: Workflow, settings: ModelSettings) => void;
  onRunComplete?: (run: Run) => void;
  /** Heading of the side panel when no node is selected. */
  settingsTitle?: string;
};

/**
 * Visual workflow editor shared by agents and workflows: drag-and-drop
 * palette, connectable nodes, node configuration, save and simulated test runs.
 * Must be rendered inside a <ReactFlowProvider>.
 */
export function WorkflowBuilder({
  title,
  avatar,
  badge,
  breadcrumbs,
  tabs,
  initialGraph,
  initialSettings,
  savedAt: initialSavedAt,
  instructions = "",
  advancedSettingsHref,
  runSource,
  extraTemplates = [],
  onSave,
  onRunComplete,
  settingsTitle,
}: WorkflowBuilderProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { screenToFlowPosition, getNodes, getEdges, deleteElements, fitView } = useReactFlow<AppNode, AppEdge>();

  // The graph is read once on mount; later store updates (e.g. run counts) must not reset the canvas.
  const [initial] = useState(() => ({ nodes: toFlowNodes(initialGraph), edges: toFlowEdges(initialGraph) }));
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AppEdge>(initial.edges);
  const [settings, setSettings] = useState<ModelSettings>(initialSettings);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt);
  const [sheet, setSheet] = useState<"palette" | "config" | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const testRun = useTestRun({ source: runSource, settings, onComplete: onRunComplete });

  const selectedNodes = nodes.filter((node) => node.selected);
  const selected = selectedNodes.length === 1 ? selectedNodes[0] : undefined;
  const toolCount = new Set(nodes.filter((node) => node.data.kind === "tool").map((node) => node.data.toolId)).size;
  const inputNode = nodes.find((node) => node.data.kind === "input");
  const defaultTestInput = String(inputNode?.data.config.sampleInput ?? "") || "Summarize the latest news about AI agents.";
  const allTemplates = useMemo(() => [...nodeTemplates, ...extraTemplates], [extraTemplates]);

  /* ---------------------------------------------------------------- changes */

  const handleNodesChange = useCallback(
    (changes: NodeChange<AppNode>[]) => {
      onNodesChange(changes);
      if (changes.some((change) => change.type === "remove" || change.type === "add" || (change.type === "position" && !change.dragging))) {
        setDirty(true);
      }
    },
    [onNodesChange],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<AppEdge>[]) => {
      onEdgesChange(changes);
      if (changes.some((change) => change.type === "remove" || change.type === "add")) setDirty(true);
    },
    [onEdgesChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const source = getNodes().find((node) => node.id === connection.source);
      const label =
        source?.data.kind === "condition" ? (connection.sourceHandle === "false" ? "No" : "Yes") : undefined;
      setEdges((current) => addEdge({ ...connection, ...edgeDefaults, label }, current));
      setDirty(true);
    },
    [getNodes, setEdges],
  );

  // Reject self-links and anything that would create a cycle.
  const isValidConnection: IsValidConnection<AppEdge> = useCallback(
    (connection) => {
      if (connection.source === connection.target) return false;
      const all = getNodes();
      const links = getEdges();
      const target = all.find((node) => node.id === connection.target);
      if (!target) return false;
      const visited = new Set<string>();
      const reachesSource = (node: AppNode): boolean => {
        if (visited.has(node.id)) return false;
        visited.add(node.id);
        return getOutgoers(node, all, links).some(
          (next) => next.id === connection.source || reachesSource(next),
        );
      };
      return !reachesSource(target);
    },
    [getEdges, getNodes],
  );

  const updateNodeData = useCallback(
    (id: string, patch: (data: WorkflowNodeData) => Partial<WorkflowNodeData>) => {
      setNodes((current) =>
        current.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch(node.data) } } : node)),
      );
      setDirty(true);
    },
    [setNodes],
  );

  const addNode = useCallback(
    (template: NodeTemplate, position?: XYPosition) => {
      let target = position;
      if (!target) {
        const rect = canvasRef.current?.getBoundingClientRect();
        const center = screenToFlowPosition({
          x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
          y: rect ? rect.top + rect.height / 3 : window.innerHeight / 2,
        });
        const jitter = () => Math.round((Math.random() - 0.5) * 60);
        target = { x: center.x - NODE_WIDTH / 2 + jitter(), y: center.y + jitter() };
      }
      const id = nodeId(template.kind);
      const node: AppNode = {
        id,
        type: "workflow",
        position: target,
        selected: true,
        data: {
          kind: template.kind,
          toolId: template.toolId,
          label: template.label,
          config: { ...defaultNodeConfig(template.kind, template.toolId, settings, instructions), ...template.config },
        },
      };
      setNodes((current) => [...current.map((item) => ({ ...item, selected: false })), node]);
      setDirty(true);
      setSheet(null);
    },
    [instructions, screenToFlowPosition, setNodes, settings],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const key = event.dataTransfer.getData(DND_MIME);
      const template = allTemplates.find((item) => item.key === key);
      if (!template) return;
      const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(template, { x: point.x - NODE_WIDTH / 2, y: point.y - 28 });
    },
    [addNode, allTemplates, screenToFlowPosition],
  );

  const duplicateNode = (node: AppNode) => {
    const copy: AppNode = {
      ...node,
      id: nodeId(node.data.kind),
      position: { x: node.position.x + 40, y: node.position.y + 60 },
      selected: true,
      data: { ...node.data, label: `${node.data.label} copy`, status: undefined },
    };
    setNodes((current) => [...current.map((item) => ({ ...item, selected: false })), copy]);
    setDirty(true);
  };

  const deleteNode = (node: AppNode) => {
    void deleteElements({ nodes: [{ id: node.id }] });
    setDirty(true);
  };

  const tidyUp = () => {
    setNodes((current) => layoutWorkflow(current, getEdges()));
    setDirty(true);
    window.requestAnimationFrame(() => void fitView({ duration: 500, padding: 0.2 }));
  };

  const focusNode = (id: string) => {
    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === id })));
    void fitView({ nodes: [{ id }], duration: 500, maxZoom: 1.2 });
  };

  /* ------------------------------------------------------------ persistence */

  const save = useCallback(() => {
    if (saving) return;
    setSaving(true);
    window.setTimeout(() => {
      const graph = toWorkflow(getNodes(), getEdges());
      onSave(graph, settings);
      setSaving(false);
      setDirty(false);
      setSavedAt(new Date().toISOString());
      toast({ title: "Workflow saved", description: `${graph.nodes.length} nodes · ${graph.edges.length} connections` });
    }, 450);
  }, [getEdges, getNodes, onSave, saving, settings]);

  const startTest = () => {
    setTestOpen(true);
    void testRun.run(defaultTestInput);
  };

  // Ctrl/Cmd + S saves.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const navigate = (href: string) => (dirty ? setPendingHref(href) : router.push(href));

  /* ------------------------------------------------------------------ panels */

  const palette = (onClose?: () => void) => (
    <NodePalette onAdd={(template) => addNode(template)} onClose={onClose} extraTemplates={extraTemplates} />
  );

  const configPanel = selected ? (
    <NodeConfigPanel
      node={selected}
      incoming={edges.filter((edge) => edge.target === selected.id).length}
      outgoing={edges.filter((edge) => edge.source === selected.id).length}
      onChange={(patch) => updateNodeData(selected.id, () => patch)}
      onConfigChange={(key: string, value: NodeConfigValue) =>
        updateNodeData(selected.id, (data) => ({ config: { ...data.config, [key]: value } }))
      }
      onDuplicate={() => duplicateNode(selected)}
      onDelete={() => deleteNode(selected)}
      onClose={() => {
        setNodes((current) => current.map((node) => ({ ...node, selected: false })));
        setSheet(null);
      }}
    />
  ) : (
    <AgentSettingsPanel
      title={settingsTitle}
      settings={settings}
      onChange={(patch) => {
        setSettings((current) => ({ ...current, ...patch }));
        setDirty(true);
      }}
      onOpenAdvanced={() => navigate(advancedSettingsHref)}
      stats={{ nodes: nodes.length, edges: edges.length, tools: toolCount }}
      onClose={sheet ? () => setSheet(null) : undefined}
    />
  );

  const status = useMemo(() => {
    if (saving) return { label: "Saving…", dot: "bg-primary animate-pulse" };
    if (dirty) return { label: "Unsaved changes", dot: "bg-amber-500" };
    if (savedAt) return { label: "Saved", dot: "bg-success" };
    return { label: "Starter workflow", dot: "bg-subtle-foreground" };
  }, [dirty, savedAt, saving]);

  return (
    <div className="flex h-[calc(100dvh-72px-2rem)] min-h-[640px] flex-col gap-4 sm:h-[calc(100dvh-72px-3rem)] lg:h-[calc(100dvh-72px-4rem)]">
      {/* Header */}
      <header className="space-y-3 animate-fade-up">
        <Breadcrumbs items={breadcrumbs} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-center gap-3">
            {avatar}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
                {badge}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
                <span className={cn("size-1.5 rounded-full", status.dot)} />
                {status.label}
                {!dirty && savedAt && (
                  <>
                    {" · "}
                    <RelativeTime iso={savedAt} />
                  </>
                )}
              </p>
            </div>
          </div>

          <nav aria-label="Sections" className="order-last w-full overflow-x-auto xl:order-none xl:mx-auto xl:w-auto">
            <ul className="flex w-max gap-1 rounded-xl border border-border bg-muted p-1">
              {tabs.map((tab) => {
                const active = tab.href === null;
                return (
                  <li key={tab.label}>
                    <button
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => tab.href && navigate(tab.href)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                          : "text-muted-foreground hover:bg-card hover:text-foreground",
                      )}
                    >
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              title="Save (Ctrl+S)"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
            <button
              type="button"
              onClick={testRun.state.status === "running" ? testRun.stop : startTest}
              className={buttonVariants({ size: "sm" })}
            >
              {testRun.state.status === "running" ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Play size={14} className="fill-current" />
                  Test Run
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Workspace */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-black/[0.02]">
        <aside aria-label="Node palette" className="hidden w-60 shrink-0 border-r border-border xl:block">
          {palette()}
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <div ref={canvasRef} className="relative min-h-0 flex-1 bg-background/60">
            <ReactFlow<AppNode, AppEdge>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onDrop={onDrop}
              onDragOver={onDragOver}
              defaultEdgeOptions={edgeDefaults}
              colorMode={resolvedTheme}
              deleteKeyCode={["Backspace", "Delete"]}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
              minZoom={0.25}
              maxZoom={2}
              snapToGrid
              snapGrid={[8, 8]}
            >
              <Background variant={BackgroundVariant.Dots} gap={18} size={1.4} />
              <Controls position="bottom-left" showInteractive={false} />
              <MiniMap
                position="bottom-right"
                pannable
                zoomable
                className={cn("max-lg:hidden", testOpen && "hidden")}
                style={{ width: 150, height: 96 }}
                nodeBorderRadius={12}
                nodeColor={(node) => (node.selected ? "var(--primary)" : "var(--input)")}
              />

              <Panel position="top-left" className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSheet("palette")}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold shadow-sm hover:bg-muted xl:hidden"
                >
                  <PanelLeft size={14} />
                  Nodes
                </button>
              </Panel>

              <Panel position="top-right" className="flex gap-2">
                <button
                  type="button"
                  onClick={tidyUp}
                  title="Arrange nodes automatically"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold shadow-sm hover:bg-muted"
                >
                  <Sparkles size={14} className="text-primary" />
                  Tidy up
                </button>
                <button
                  type="button"
                  onClick={() => setSheet("config")}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-xs font-semibold shadow-sm hover:bg-muted xl:hidden",
                    selected ? "border-primary text-primary" : "border-border",
                  )}
                >
                  <SlidersHorizontal size={14} />
                  {selected ? "Configure" : "Settings"}
                </button>
              </Panel>
            </ReactFlow>

            {nodes.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                  <MousePointerClick size={22} />
                </span>
                <p className="font-semibold">Your canvas is empty</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Drag a User Input node from the palette to start building the workflow.
                </p>
              </div>
            )}
          </div>

          {testOpen && (
            <TestRunPanel
              state={testRun.state}
              defaultInput={defaultTestInput}
              onRun={(input) => void testRun.run(input)}
              onStop={testRun.stop}
              onReset={testRun.reset}
              onClose={() => {
                if (testRun.state.status === "running") testRun.stop();
                setTestOpen(false);
              }}
              onFocusNode={focusNode}
              onOpenRun={(id) => navigate(`/runs/${id}`)}
            />
          )}
        </div>

        <aside aria-label="Configuration" className="hidden w-80 shrink-0 border-l border-border xl:block">
          {configPanel}
        </aside>

        {/* Slide-over panels for smaller screens */}
        {sheet && (
          <div className="absolute inset-0 z-20 xl:hidden">
            <button
              type="button"
              aria-label="Close panel"
              onClick={() => setSheet(null)}
              className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px] animate-fade-in"
            />
            <div
              className={cn(
                "absolute inset-y-0 w-[min(320px,88%)] bg-card shadow-2xl animate-fade-in",
                sheet === "palette" ? "left-0 border-r border-border" : "right-0 border-l border-border",
              )}
            >
              {sheet === "palette" ? palette(() => setSheet(null)) : configPanel}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingHref !== null}
        onOpenChange={(open) => !open && setPendingHref(null)}
        title="Leave without saving?"
        description="Your workflow has unsaved changes. Save first, or leave and discard them."
        confirmLabel="Discard & leave"
        cancelLabel="Stay"
        onConfirm={() => pendingHref && router.push(pendingHref)}
      />
    </div>
  );
}
