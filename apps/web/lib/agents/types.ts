export type AgentStatus = "active" | "inactive" | "draft" | "archived";

export type AgentIconKey =
  | "bot"
  | "search"
  | "code"
  | "chart"
  | "pen"
  | "headset"
  | "mail"
  | "globe"
  | "brain"
  | "sparkles"
  | "file"
  | "users";

export type AgentColor =
  | "violet"
  | "blue"
  | "sky"
  | "emerald"
  | "amber"
  | "orange"
  | "rose"
  | "pink";

export type ResponseFormat = "text" | "markdown" | "json";

export type ModelSettings = {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  streaming: boolean;
  memory: boolean;
  responseFormat: ResponseFormat;
};

export type WorkflowNodeKind =
  | "input"
  | "llm"
  | "agent"
  | "tool"
  | "condition"
  | "transform"
  | "output";

export type NodeRunStatus = "idle" | "running" | "success" | "error" | "skipped";

export type NodeConfigValue = string | number | boolean;

export type WorkflowNodeData = {
  kind: WorkflowNodeKind;
  label: string;
  toolId?: string;
  config: Record<string, NodeConfigValue>;
  /** Transient: only set while a test run is displayed, never persisted. */
  status?: NodeRunStatus;
};

export type StoredNode = {
  id: string;
  position: { x: number; y: number };
  data: WorkflowNodeData;
};

export type StoredEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  label?: string;
};

export type Workflow = {
  nodes: StoredNode[];
  edges: StoredEdge[];
};

export type Agent = {
  id: string;
  name: string;
  description: string;
  icon: AgentIconKey;
  color: AgentColor;
  status: AgentStatus;
  instructions: string;
  /** Tool ids from the tool catalog. */
  tools: string[];
  /** Knowledge source ids, or `file:<name>` for uploaded files. */
  knowledge: string[];
  settings: ModelSettings;
  runs: number;
  successRate: number;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  workflow?: Workflow;
};

/** The editable fields of an agent (what the wizard produces). */
export type AgentInput = Pick<
  Agent,
  | "name"
  | "description"
  | "icon"
  | "color"
  | "status"
  | "instructions"
  | "tools"
  | "knowledge"
  | "settings"
>;
