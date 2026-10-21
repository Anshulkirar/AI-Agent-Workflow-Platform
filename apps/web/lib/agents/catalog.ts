import type { ComponentType } from "react";
import {
  BookOpen,
  Bot,
  Brain,
  CalendarDays,
  Calculator,
  ChartColumn,
  CreditCard,
  Code,
  Database,
  FileOutput,
  FileText,
  GitBranch,
  Globe,
  Headset,
  ImagePlus,
  Languages,
  LogIn,
  Mail,
  PenLine,
  ScanSearch,
  Search,
  Sparkles,
  SquareKanban,
  SquareTerminal,
  Users,
  Webhook,
  WandSparkles,
  Wrench,
} from "lucide-react";
import {
  GitHubIcon,
  GoogleIcon,
  NotionIcon,
  SlackIcon,
} from "@/components/icons/BrandIcons";
import type {
  Agent,
  AgentColor,
  AgentIconKey,
  AgentStatus,
  ModelSettings,
  NodeConfigValue,
  WorkflowNodeData,
  WorkflowNodeKind,
} from "./types";

export type IconComponent = ComponentType<{ className?: string }>;

/* ----------------------------------------------------------------------------
 * Agent appearance
 * ------------------------------------------------------------------------- */

export const agentIcons: Record<AgentIconKey, { label: string; icon: IconComponent }> = {
  bot: { label: "Bot", icon: Bot },
  search: { label: "Research", icon: Search },
  code: { label: "Code", icon: Code },
  chart: { label: "Analytics", icon: ChartColumn },
  pen: { label: "Writing", icon: PenLine },
  headset: { label: "Support", icon: Headset },
  mail: { label: "Email", icon: Mail },
  globe: { label: "Web", icon: Globe },
  brain: { label: "Reasoning", icon: Brain },
  sparkles: { label: "Creative", icon: Sparkles },
  file: { label: "Documents", icon: FileText },
  users: { label: "Team", icon: Users },
};

export const agentColors: Record<AgentColor, { label: string; tile: string; swatch: string }> = {
  violet: { label: "Violet", tile: "bg-violet-500/10 text-violet-600 dark:text-violet-400", swatch: "bg-violet-500" },
  blue: { label: "Blue", tile: "bg-blue-500/10 text-blue-600 dark:text-blue-400", swatch: "bg-blue-500" },
  sky: { label: "Sky", tile: "bg-sky-500/10 text-sky-600 dark:text-sky-400", swatch: "bg-sky-500" },
  emerald: { label: "Emerald", tile: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", swatch: "bg-emerald-500" },
  amber: { label: "Amber", tile: "bg-amber-500/10 text-amber-600 dark:text-amber-400", swatch: "bg-amber-500" },
  orange: { label: "Orange", tile: "bg-orange-500/10 text-orange-600 dark:text-orange-400", swatch: "bg-orange-500" },
  rose: { label: "Rose", tile: "bg-rose-500/10 text-rose-600 dark:text-rose-400", swatch: "bg-rose-500" },
  pink: { label: "Pink", tile: "bg-pink-500/10 text-pink-600 dark:text-pink-400", swatch: "bg-pink-500" },
};

export const statusMeta: Record<AgentStatus, { label: string; badge: string; dot: string }> = {
  active: { label: "Active", badge: "bg-success-soft text-success", dot: "bg-success" },
  inactive: { label: "Inactive", badge: "bg-muted text-muted-foreground", dot: "bg-subtle-foreground" },
  draft: { label: "Draft", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  archived: { label: "Archived", badge: "bg-muted text-subtle-foreground", dot: "bg-subtle-foreground" },
};

/* ----------------------------------------------------------------------------
 * Tools
 * ------------------------------------------------------------------------- */

export type ToolField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "switch" | "slider" | "password";
  placeholder?: string;
  options?: Array<string | { value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  defaultValue: NodeConfigValue;
  hint?: string;
};

export type ToolCategory = "Search" | "Data" | "Code" | "AI" | "Communication" | "Integrations" | "Custom";

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: IconComponent;
  tone: string;
  fields: ToolField[];
};

export const toolCategories: ToolCategory[] = [
  "Search",
  "Data",
  "Code",
  "AI",
  "Communication",
  "Integrations",
  "Custom",
];

export const tools: ToolDefinition[] = [
  {
    id: "web-search",
    name: "Web Search",
    description: "Search the web for up-to-date information.",
    category: "Search",
    icon: Search,
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    fields: [
      { key: "query", label: "Query template", type: "text", placeholder: "{{input}}", defaultValue: "{{input}}" },
      { key: "maxResults", label: "Max results", type: "number", defaultValue: 8 },
      { key: "safeSearch", label: "Safe search", type: "switch", defaultValue: true },
    ],
  },
  {
    id: "web-scraping",
    name: "Web Scraping",
    description: "Extract content and links from web pages.",
    category: "Search",
    icon: ScanSearch,
    tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    fields: [
      { key: "url", label: "Start URL", type: "text", placeholder: "https://example.com", defaultValue: "" },
      { key: "selector", label: "CSS selector", type: "text", placeholder: "article, main", defaultValue: "main" },
      { key: "followLinks", label: "Follow links", type: "switch", defaultValue: false },
    ],
  },
  {
    id: "api-request",
    name: "API Request",
    description: "Call any REST endpoint with custom headers.",
    category: "Integrations",
    icon: Webhook,
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    fields: [
      { key: "method", label: "Method", type: "select", options: ["GET", "POST", "PUT", "PATCH", "DELETE"], defaultValue: "GET" },
      { key: "url", label: "URL", type: "text", placeholder: "https://api.example.com/v1/items", defaultValue: "https://api.example.com/v1/items" },
      { key: "headers", label: "Headers (JSON)", type: "textarea", placeholder: '{ "Authorization": "Bearer …" }', defaultValue: "" },
    ],
  },
  {
    id: "database-query",
    name: "Database Query",
    description: "Run read-only SQL against connected databases.",
    category: "Data",
    icon: Database,
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    fields: [
      { key: "connection", label: "Connection", type: "select", options: ["Production (read-only)", "Analytics warehouse", "Staging"], defaultValue: "Analytics warehouse" },
      { key: "query", label: "SQL query", type: "textarea", placeholder: "SELECT * FROM orders LIMIT 100", defaultValue: "SELECT * FROM events\nWHERE created_at > now() - interval '7 days'" },
      { key: "limit", label: "Row limit", type: "number", defaultValue: 100 },
    ],
  },
  {
    id: "code-execution",
    name: "Code Execution",
    description: "Run Python or JavaScript in a secure sandbox.",
    category: "Code",
    icon: SquareTerminal,
    tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    fields: [
      { key: "language", label: "Language", type: "select", options: ["Python", "JavaScript"], defaultValue: "Python" },
      { key: "timeout", label: "Timeout (seconds)", type: "number", defaultValue: 30 },
      { key: "code", label: "Code", type: "textarea", placeholder: "print('hello')", defaultValue: "" },
    ],
  },
  {
    id: "file-processing",
    name: "File Processing",
    description: "Parse PDFs, docs and spreadsheets.",
    category: "Data",
    icon: FileText,
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    fields: [
      { key: "fileTypes", label: "Accepted types", type: "text", defaultValue: "pdf, docx, csv" },
      { key: "ocr", label: "OCR for scanned files", type: "switch", defaultValue: true },
    ],
  },
  {
    id: "send-email",
    name: "Send Email",
    description: "Draft and send emails on your behalf.",
    category: "Communication",
    icon: Mail,
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    fields: [
      { key: "to", label: "Recipient", type: "text", placeholder: "team@example.com", defaultValue: "" },
      { key: "subject", label: "Subject", type: "text", placeholder: "Weekly summary", defaultValue: "" },
      { key: "requireApproval", label: "Require approval", type: "switch", defaultValue: true, hint: "Emails wait for a human to approve." },
    ],
  },
  {
    id: "slack",
    name: "Slack Message",
    description: "Post updates to Slack channels.",
    category: "Communication",
    icon: SlackIcon,
    tone: "bg-muted text-foreground",
    fields: [
      { key: "channel", label: "Channel", type: "text", placeholder: "#general", defaultValue: "#general" },
      { key: "mention", label: "Mention channel", type: "switch", defaultValue: false },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    description: "Read repositories, issues and pull requests.",
    category: "Integrations",
    icon: GitHubIcon,
    tone: "bg-muted text-foreground",
    fields: [
      { key: "repository", label: "Repository", type: "text", placeholder: "acme/web", defaultValue: "acme/web" },
      { key: "action", label: "Action", type: "select", options: ["List pull requests", "Review code", "Create issue"], defaultValue: "Review code" },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    description: "Search and update Notion pages.",
    category: "Integrations",
    icon: NotionIcon,
    tone: "bg-muted text-foreground",
    fields: [
      { key: "database", label: "Database", type: "text", placeholder: "Product roadmap", defaultValue: "" },
    ],
  },
  {
    id: "calculator",
    name: "Calculator",
    description: "Evaluate precise math expressions.",
    category: "Code",
    icon: Calculator,
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    fields: [{ key: "precision", label: "Decimal precision", type: "number", defaultValue: 2 }],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Search and read files in shared drives.",
    category: "Integrations",
    icon: GoogleIcon,
    tone: "bg-muted text-foreground",
    fields: [
      { key: "folder", label: "Folder", type: "text", placeholder: "Shared drive / Reports", defaultValue: "" },
      { key: "fileTypes", label: "File types", type: "select", options: ["All", "Docs", "Sheets", "PDFs"], defaultValue: "All" },
    ],
  },
  {
    id: "jira",
    name: "Jira",
    description: "Create, search and update issues.",
    category: "Integrations",
    icon: SquareKanban,
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    fields: [
      { key: "project", label: "Project key", type: "text", placeholder: "ENG", defaultValue: "ENG" },
      { key: "action", label: "Action", type: "select", options: ["Search issues", "Create issue", "Transition issue"], defaultValue: "Search issues" },
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Look up customers, invoices and subscriptions.",
    category: "Data",
    icon: CreditCard,
    tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    fields: [{ key: "resource", label: "Resource", type: "select", options: ["Customers", "Invoices", "Subscriptions"], defaultValue: "Customers" }],
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    description: "Look up encyclopedic facts and summaries.",
    category: "Search",
    icon: BookOpen,
    tone: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    fields: [
      { key: "language", label: "Language", type: "select", options: ["English", "German", "French", "Spanish"], defaultValue: "English" },
      { key: "sentences", label: "Summary sentences", type: "number", defaultValue: 5 },
    ],
  },
  {
    id: "translate",
    name: "Translate",
    description: "Translate text between 100+ languages.",
    category: "AI",
    icon: Languages,
    tone: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    fields: [
      { key: "target", label: "Target language", type: "select", options: ["English", "Spanish", "German", "French", "Japanese", "Hindi"], defaultValue: "English" },
      { key: "formality", label: "Formality", type: "select", options: ["Default", "Formal", "Informal"], defaultValue: "Default" },
    ],
  },
  {
    id: "image-generation",
    name: "Image Generation",
    description: "Create images from text prompts.",
    category: "AI",
    icon: ImagePlus,
    tone: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
    fields: [
      { key: "size", label: "Size", type: "select", options: ["1024×1024", "1792×1024", "1024×1792"], defaultValue: "1024×1024" },
      { key: "style", label: "Style", type: "select", options: ["Natural", "Vivid"], defaultValue: "Natural" },
    ],
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Check availability and schedule meetings.",
    category: "Communication",
    icon: CalendarDays,
    tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    fields: [
      { key: "calendar", label: "Calendar", type: "text", defaultValue: "primary" },
      { key: "duration", label: "Meeting length (min)", type: "number", defaultValue: 30 },
    ],
  },
  {
    id: "custom-tool",
    name: "Custom Tool",
    description: "Bring your own function with a JSON schema.",
    category: "Custom",
    icon: Wrench,
    tone: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    fields: [
      { key: "endpoint", label: "Endpoint", type: "text", placeholder: "https://…", defaultValue: "" },
      { key: "schema", label: "Input schema (JSON)", type: "textarea", placeholder: '{ "type": "object" }', defaultValue: "" },
    ],
  },
];

export const toolsById = new Map(tools.map((tool) => [tool.id, tool]));

/* ----------------------------------------------------------------------------
 * Models
 * ------------------------------------------------------------------------- */

export const models = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", description: "Fast multimodal flagship", badge: "Popular" },
  { id: "gpt-4o-mini", name: "GPT-4o mini", provider: "OpenAI", description: "Low-cost, low-latency tasks", badge: "Fast" },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", provider: "Anthropic", description: "Deep reasoning for complex work", badge: "Reasoning" },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", provider: "Anthropic", description: "Balanced speed and intelligence", badge: "Balanced" },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", provider: "Anthropic", description: "Near-instant responses", badge: "Fast" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", description: "Long-context analysis", badge: "Long context" },
] as const;

export function modelName(id: string) {
  return models.find((model) => model.id === id)?.name ?? id;
}

export const defaultSettings: ModelSettings = {
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1,
  streaming: true,
  memory: true,
  responseFormat: "markdown",
};

/* ----------------------------------------------------------------------------
 * Knowledge
 * ------------------------------------------------------------------------- */

export const knowledgeSources = [
  { id: "product-docs", name: "Product Documentation", description: "Guides, API reference and changelog", items: "248 pages", type: "Website" },
  { id: "help-center", name: "Help Center", description: "Customer-facing support articles", items: "132 articles", type: "Website" },
  { id: "company-wiki", name: "Company Wiki", description: "Internal processes and policies", items: "86 pages", type: "Notion" },
  { id: "sales-playbook", name: "Sales Playbook", description: "Positioning, pricing and objection handling", items: "24 docs", type: "Drive" },
  { id: "analytics-db", name: "Analytics Warehouse", description: "Product events and revenue tables", items: "41 tables", type: "Database" },
] as const;

export function knowledgeLabel(id: string) {
  if (id.startsWith("file:")) return id.slice(5);
  return knowledgeSources.find((source) => source.id === id)?.name ?? id;
}

/* ----------------------------------------------------------------------------
 * Instruction templates
 * ------------------------------------------------------------------------- */

export const instructionTemplates = [
  {
    name: "Researcher",
    text: "You are a meticulous research analyst.\n\n- Break the user's question into focused sub-questions.\n- Search multiple reputable sources and cross-check facts.\n- Cite every claim with a source link.\n- Finish with a concise summary and open questions.",
  },
  {
    name: "Support agent",
    text: "You are a friendly, patient customer support agent for our product.\n\n- Answer using the connected knowledge base first.\n- Ask a clarifying question when the request is ambiguous.\n- Never promise refunds or timelines; escalate to a human instead.\n- Keep answers short and end by asking if anything else is needed.",
  },
  {
    name: "Code reviewer",
    text: "You are a senior software engineer reviewing pull requests.\n\n- Focus on correctness, security and readability, in that order.\n- Suggest concrete code changes, not vague advice.\n- Flag missing tests for new behaviour.\n- Be direct but kind.",
  },
  {
    name: "Data analyst",
    text: "You are a data analyst.\n\n- Translate business questions into SQL against the analytics warehouse.\n- Validate results for obvious anomalies before reporting.\n- Present findings as a short narrative plus a table of key numbers.\n- State assumptions explicitly.",
  },
];

/* ----------------------------------------------------------------------------
 * Workflow node templates (builder palette)
 * ------------------------------------------------------------------------- */

export type NodeTemplate = {
  key: string;
  kind: WorkflowNodeKind;
  toolId?: string;
  label: string;
  description: string;
  icon: IconComponent;
  tone: string;
  group: "Triggers" | "AI" | "Agents" | "Logic" | "Tools" | "Output";
  /** Extra config merged into the node defaults (e.g. which agent to call). */
  config?: Record<string, NodeConfigValue>;
};

const kindVisuals: Record<Exclude<WorkflowNodeKind, "tool">, Omit<NodeTemplate, "key" | "kind" | "group">> = {
  input: { label: "User Input", description: "Starts the workflow with a prompt", icon: LogIn, tone: "bg-primary-soft text-primary-soft-foreground" },
  llm: { label: "LLM Agent", description: "Reason and plan with a model", icon: Brain, tone: "bg-linear-to-br from-[#7c6cff] to-[#4f46e5] text-white" },
  agent: { label: "Agent", description: "Delegate a task to one of your agents", icon: Bot, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  transform: { label: "Summarize", description: "Condense and format results", icon: WandSparkles, tone: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400" },
  condition: { label: "Condition", description: "Branch on an expression", icon: GitBranch, tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  output: { label: "Output", description: "Return the final answer", icon: FileOutput, tone: "bg-foreground text-background" },
};

export const nodeTemplates: NodeTemplate[] = [
  { key: "input", kind: "input", group: "Triggers", ...kindVisuals.input },
  { key: "llm", kind: "llm", group: "AI", ...kindVisuals.llm },
  { key: "transform", kind: "transform", group: "AI", ...kindVisuals.transform },
  { key: "condition", kind: "condition", group: "Logic", ...kindVisuals.condition },
  ...tools.map<NodeTemplate>((tool) => ({
    key: `tool:${tool.id}`,
    kind: "tool",
    toolId: tool.id,
    label: tool.name,
    description: tool.description,
    icon: tool.icon,
    tone: tool.tone,
    group: "Tools",
  })),
  { key: "output", kind: "output", group: "Output", ...kindVisuals.output },
];

/** Palette entries that call existing agents (used by workflows and as sub-agents). */
export function agentNodeTemplates(
  agents: Pick<Agent, "id" | "name" | "description" | "icon" | "color">[],
): NodeTemplate[] {
  return agents.map((agent) => ({
    key: `agent:${agent.id}`,
    kind: "agent",
    label: agent.name,
    description: agent.description,
    icon: agentIcons[agent.icon]?.icon ?? Bot,
    tone: agentColors[agent.color]?.tile ?? agentColors.violet.tile,
    group: "Agents",
    config: { agentId: agent.id },
  }));
}

export function getNodeVisual(data: Pick<WorkflowNodeData, "kind" | "toolId">) {
  if (data.kind === "tool") {
    const tool = data.toolId ? toolsById.get(data.toolId) : undefined;
    return {
      icon: tool?.icon ?? Wrench,
      tone: tool?.tone ?? "bg-muted text-foreground",
      subtitle: tool ? `Tool · ${tool.category}` : "Tool",
    };
  }
  const visual = kindVisuals[data.kind];
  const subtitles: Record<Exclude<WorkflowNodeKind, "tool">, string> = {
    input: "Trigger",
    llm: "Reasoning",
    agent: "Agent",
    transform: "Transform",
    condition: "If / else",
    output: "Response",
  };
  return { icon: visual.icon, tone: visual.tone, subtitle: subtitles[data.kind] };
}

export function defaultNodeConfig(
  kind: WorkflowNodeKind,
  toolId: string | undefined,
  settings: ModelSettings,
  instructions = "",
): Record<string, NodeConfigValue> {
  switch (kind) {
    case "input":
      return { variable: "input", sampleInput: "What are the latest trends in AI agent frameworks?" };
    case "llm":
      return { model: settings.model, temperature: settings.temperature, prompt: instructions };
    case "agent":
      return { agentId: "", handoff: "Full context", waitForResult: true };
    case "transform":
      return { instruction: "Summarize the findings into clear, cited bullet points.", maxWords: 200 };
    case "condition":
      return { expression: "{{ result.confidence }} > 0.8" };
    case "output":
      return { format: "Markdown", destination: "Return to user" };
    case "tool": {
      const tool = toolId ? toolsById.get(toolId) : undefined;
      return Object.fromEntries((tool?.fields ?? []).map((field) => [field.key, field.defaultValue]));
    }
  }
}
