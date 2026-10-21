import { agentColors, agentIcons, tools, toolsById, type ToolDefinition, type ToolField, type IconComponent } from "@/lib/agents/catalog";
import type { CustomToolDefinition, ToolInstall } from "./types";

/*
 * Marketplace metadata and connection schemas for the tools in the shared
 * catalog (lib/agents/catalog.ts). Tool definitions themselves live there.
 */

export type ConnectionField = ToolField & {
  required?: boolean;
  validate?: "url" | "email" | "port" | "json" | "hostname";
};

export type ToolMeta = {
  publisher: string;
  verified: boolean;
  installs: number;
  rating: number;
  version: string;
  pricing: "Free" | "Usage-based" | "Pro";
  featured?: boolean;
  permissions: string[];
  connection: ConnectionField[];
};

const apiKey = (label = "API key", placeholder = "sk-…"): ConnectionField => ({
  key: "apiKey",
  label,
  type: "password",
  placeholder,
  defaultValue: "",
  required: true,
});

export const toolMeta: Record<string, ToolMeta> = {
  "web-search": {
    publisher: "AgentFlow",
    verified: true,
    installs: 48_200,
    rating: 4.9,
    version: "2.4.0",
    pricing: "Usage-based",
    featured: true,
    permissions: ["Send queries to the search provider"],
    connection: [
      { key: "provider", label: "Search provider", type: "select", options: ["Brave Search", "Bing", "Google Programmable Search", "Tavily"], defaultValue: "Brave Search" },
      apiKey(),
      { key: "region", label: "Region", type: "select", options: ["Global", "United States", "Europe", "India"], defaultValue: "Global" },
      { key: "safeSearch", label: "Safe search", type: "switch", defaultValue: true },
    ],
  },
  "web-scraping": {
    publisher: "AgentFlow",
    verified: true,
    installs: 31_900,
    rating: 4.7,
    version: "1.9.2",
    pricing: "Usage-based",
    permissions: ["Fetch public web pages"],
    connection: [
      { key: "userAgent", label: "User agent", type: "text", defaultValue: "AgentFlowBot/1.0", required: true },
      { key: "rateLimit", label: "Rate limit (requests / min)", type: "number", min: 1, max: 600, defaultValue: 60, required: true },
      { key: "renderJs", label: "Render JavaScript", type: "switch", defaultValue: true, hint: "Slower, but works on single-page apps." },
      { key: "respectRobots", label: "Respect robots.txt", type: "switch", defaultValue: true },
    ],
  },
  "api-request": {
    publisher: "AgentFlow",
    verified: true,
    installs: 39_400,
    rating: 4.8,
    version: "3.1.0",
    pricing: "Free",
    featured: true,
    permissions: ["Call HTTP endpoints you configure"],
    connection: [
      { key: "baseUrl", label: "Base URL", type: "text", placeholder: "https://api.example.com", defaultValue: "", required: true, validate: "url" },
      { key: "authType", label: "Authentication", type: "select", options: ["None", "Bearer token", "API key header"], defaultValue: "Bearer token" },
      { key: "token", label: "Token", type: "password", placeholder: "Paste a token", defaultValue: "" },
      { key: "headers", label: "Default headers (JSON)", type: "textarea", placeholder: '{ "Accept": "application/json" }', defaultValue: "", validate: "json" },
      { key: "timeout", label: "Timeout (seconds)", type: "number", min: 1, max: 120, defaultValue: 30 },
    ],
  },
  "database-query": {
    publisher: "AgentFlow",
    verified: true,
    installs: 22_700,
    rating: 4.6,
    version: "2.0.3",
    pricing: "Free",
    permissions: ["Run read-only SQL", "Read table schemas"],
    connection: [
      { key: "engine", label: "Database", type: "select", options: ["PostgreSQL", "MySQL", "Snowflake", "BigQuery"], defaultValue: "PostgreSQL" },
      { key: "host", label: "Host", type: "text", placeholder: "db.example.com", defaultValue: "", required: true, validate: "hostname" },
      { key: "port", label: "Port", type: "number", defaultValue: 5432, required: true, validate: "port" },
      { key: "database", label: "Database name", type: "text", placeholder: "analytics", defaultValue: "", required: true },
      { key: "username", label: "Username", type: "text", defaultValue: "", required: true },
      { key: "password", label: "Password", type: "password", defaultValue: "", required: true },
      { key: "ssl", label: "Require SSL", type: "switch", defaultValue: true },
      { key: "readOnly", label: "Read-only mode", type: "switch", defaultValue: true, hint: "Blocks INSERT, UPDATE and DELETE statements." },
    ],
  },
  "code-execution": {
    publisher: "AgentFlow",
    verified: true,
    installs: 27_300,
    rating: 4.8,
    version: "1.6.0",
    pricing: "Usage-based",
    permissions: ["Run code in an isolated sandbox"],
    connection: [
      { key: "runtime", label: "Runtime", type: "select", options: ["Python 3.12", "Node.js 22", "Both"], defaultValue: "Both" },
      { key: "memory", label: "Memory limit", type: "select", options: ["256 MB", "512 MB", "1 GB", "2 GB"], defaultValue: "512 MB" },
      { key: "timeout", label: "Max execution time (seconds)", type: "number", min: 1, max: 300, defaultValue: 30, required: true },
      { key: "network", label: "Allow network access", type: "switch", defaultValue: false },
    ],
  },
  "file-processing": {
    publisher: "AgentFlow",
    verified: true,
    installs: 25_100,
    rating: 4.7,
    version: "1.4.1",
    pricing: "Free",
    permissions: ["Read files you share with the agent"],
    connection: [
      { key: "maxSizeMb", label: "Max file size (MB)", type: "number", min: 1, max: 100, defaultValue: 25, required: true },
      { key: "types", label: "Allowed file types", type: "text", defaultValue: "pdf, docx, csv, txt, md", required: true },
      { key: "ocr", label: "OCR for scanned documents", type: "switch", defaultValue: true },
    ],
  },
  "send-email": {
    publisher: "AgentFlow",
    verified: true,
    installs: 18_800,
    rating: 4.5,
    version: "1.2.0",
    pricing: "Free",
    permissions: ["Send email from your domain"],
    connection: [
      { key: "host", label: "SMTP host", type: "text", placeholder: "smtp.example.com", defaultValue: "", required: true, validate: "hostname" },
      { key: "port", label: "SMTP port", type: "number", defaultValue: 587, required: true, validate: "port" },
      { key: "from", label: "From address", type: "text", placeholder: "agents@example.com", defaultValue: "", required: true, validate: "email" },
      { key: "username", label: "Username", type: "text", defaultValue: "", required: true },
      { key: "password", label: "Password", type: "password", defaultValue: "", required: true },
      { key: "requireApproval", label: "Require human approval", type: "switch", defaultValue: true },
    ],
  },
  slack: {
    publisher: "Slack",
    verified: true,
    installs: 21_500,
    rating: 4.8,
    version: "2.2.0",
    pricing: "Free",
    permissions: ["Post messages", "Read public channels"],
    connection: [
      { key: "workspace", label: "Workspace URL", type: "text", placeholder: "https://acme.slack.com", defaultValue: "", required: true, validate: "url" },
      { ...apiKey("Bot token", "xoxb-…"), key: "botToken" },
      { key: "defaultChannel", label: "Default channel", type: "text", defaultValue: "#general" },
    ],
  },
  github: {
    publisher: "GitHub",
    verified: true,
    installs: 26_900,
    rating: 4.9,
    version: "3.0.1",
    pricing: "Free",
    featured: true,
    permissions: ["Read repositories", "Comment on pull requests"],
    connection: [
      { ...apiKey("Personal access token", "ghp_…"), key: "token" },
      { key: "org", label: "Organization", type: "text", placeholder: "acme", defaultValue: "", required: true },
    ],
  },
  notion: {
    publisher: "Notion",
    verified: true,
    installs: 17_200,
    rating: 4.6,
    version: "1.8.0",
    pricing: "Free",
    permissions: ["Read and update shared pages"],
    connection: [{ ...apiKey("Integration token", "secret_…"), key: "token" }],
  },
  calculator: {
    publisher: "AgentFlow",
    verified: true,
    installs: 14_600,
    rating: 4.7,
    version: "1.0.4",
    pricing: "Free",
    permissions: ["None — runs locally"],
    connection: [],
  },
  "google-drive": {
    publisher: "Google",
    verified: true,
    installs: 19_300,
    rating: 4.6,
    version: "2.1.0",
    pricing: "Free",
    featured: true,
    permissions: ["Read files in selected drives"],
    connection: [
      { key: "account", label: "Google account", type: "text", placeholder: "you@company.com", defaultValue: "", required: true, validate: "email" },
      { ...apiKey("OAuth refresh token", "1//…"), key: "token" },
    ],
  },
  jira: {
    publisher: "Atlassian",
    verified: true,
    installs: 12_900,
    rating: 4.4,
    version: "1.5.2",
    pricing: "Free",
    permissions: ["Read and create issues"],
    connection: [
      { key: "site", label: "Site URL", type: "text", placeholder: "https://acme.atlassian.net", defaultValue: "", required: true, validate: "url" },
      { key: "email", label: "Account email", type: "text", defaultValue: "", required: true, validate: "email" },
      { ...apiKey("API token", "ATATT…"), key: "token" },
    ],
  },
  stripe: {
    publisher: "Stripe",
    verified: true,
    installs: 9_800,
    rating: 4.7,
    version: "1.3.0",
    pricing: "Free",
    permissions: ["Read customers, invoices and subscriptions"],
    connection: [{ ...apiKey("Restricted API key", "rk_live_…"), key: "secretKey" }],
  },
  wikipedia: {
    publisher: "AgentFlow",
    verified: true,
    installs: 16_400,
    rating: 4.5,
    version: "1.1.0",
    pricing: "Free",
    permissions: ["Query the public Wikipedia API"],
    connection: [],
  },
  translate: {
    publisher: "AgentFlow",
    verified: true,
    installs: 11_200,
    rating: 4.6,
    version: "1.0.2",
    pricing: "Usage-based",
    permissions: ["Send text to the translation provider"],
    connection: [
      { key: "provider", label: "Provider", type: "select", options: ["DeepL", "Google Translate"], defaultValue: "DeepL" },
      apiKey(),
    ],
  },
  "image-generation": {
    publisher: "AgentFlow",
    verified: true,
    installs: 13_700,
    rating: 4.3,
    version: "0.9.0",
    pricing: "Pro",
    permissions: ["Send prompts to the image model"],
    connection: [{ key: "quality", label: "Default quality", type: "select", options: ["Standard", "HD"], defaultValue: "Standard" }],
  },
  calendar: {
    publisher: "AgentFlow",
    verified: true,
    installs: 10_100,
    rating: 4.4,
    version: "1.2.3",
    pricing: "Free",
    permissions: ["Read free/busy", "Create events"],
    connection: [
      { key: "provider", label: "Calendar provider", type: "select", options: ["Google Calendar", "Outlook"], defaultValue: "Google Calendar" },
      { key: "account", label: "Account email", type: "text", defaultValue: "", required: true, validate: "email" },
    ],
  },
};

/** Catalog tools that can be installed from the marketplace (custom tools are built, not installed). */
export const marketplaceTools: ToolDefinition[] = tools.filter((tool) => tool.id !== "custom-tool" && toolMeta[tool.id]);

/** Connection schema for a custom HTTP tool. */
export const customToolConnection: ConnectionField[] = [];

/** One shape for catalog and custom tools, used throughout the Tools UI. */
export type ResolvedTool = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: IconComponent;
  tone: string;
  isCustom: boolean;
  meta?: ToolMeta;
  install?: ToolInstall;
};

export function resolveTool(id: string, install?: ToolInstall): ResolvedTool | null {
  if (install?.custom) {
    const custom: CustomToolDefinition = install.custom;
    return {
      id,
      name: custom.name,
      description: custom.description,
      category: "Custom",
      icon: agentIcons[custom.icon]?.icon ?? agentIcons.bot.icon,
      tone: agentColors[custom.color]?.tile ?? agentColors.violet.tile,
      isCustom: true,
      install,
    };
  }
  const tool = toolsById.get(id);
  if (!tool) return null;
  return {
    id,
    name: tool.name,
    description: tool.description,
    category: tool.category,
    icon: tool.icon,
    tone: tool.tone,
    isCustom: false,
    meta: toolMeta[id],
    install,
  };
}

export function connectionFieldsFor(tool: ResolvedTool): ConnectionField[] {
  return tool.isCustom ? customToolConnection : (tool.meta?.connection ?? []);
}

export function defaultConnectionConfig(fields: ConnectionField[]) {
  return Object.fromEntries(fields.map((field) => [field.key, field.defaultValue]));
}

export const statusMeta = {
  connected: { label: "Connected", badge: "bg-success-soft text-success", dot: "bg-success" },
  needs_setup: { label: "Needs setup", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  error: { label: "Error", badge: "bg-danger-soft text-danger", dot: "bg-danger" },
} as const;
