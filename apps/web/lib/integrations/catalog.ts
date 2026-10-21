import {
  Archive,
  BookOpen,
  BrainCircuit,
  Building2,
  CalendarDays,
  Cloud,
  CreditCard,
  Database,
  GitMerge,
  Globe,
  HardDrive,
  Headset,
  Layers,
  Leaf,
  Mail,
  MessageCircle,
  MessagesSquare,
  Phone,
  Snowflake,
  Sparkles,
  SquareKanban,
  Table2,
  Users,
  Webhook,
  Workflow,
  Zap,
} from "lucide-react";
import { GitHubIcon, GoogleIcon, NotionIcon, OpenAIIcon, SlackIcon } from "@/components/icons/BrandIcons";
import type { IconComponent } from "@/lib/agents/catalog";
import type { NodeConfigValue } from "@/lib/agents/types";
import type { ConnectionField } from "@/lib/tools/catalog";
import type { IntegrationConnection } from "./types";

/*
 * Integrations are workspace-level connections to external services. Many of
 * them power tools from the shared catalog (lib/agents/catalog.ts) or serve the
 * models agents run on, which is how this page links to agents and workflows.
 */

export type IntegrationCategory =
  | "AI models"
  | "Communication"
  | "Productivity"
  | "Developer"
  | "Data & storage"
  | "CRM & business"
  | "APIs & automation";

export const integrationCategories: IntegrationCategory[] = [
  "AI models",
  "Communication",
  "Productivity",
  "Developer",
  "Data & storage",
  "CRM & business",
  "APIs & automation",
];

export type AuthMethod = "oauth" | "api_key" | "credentials" | "webhook";

export const authLabels: Record<AuthMethod, string> = {
  oauth: "OAuth 2.0",
  api_key: "API key",
  credentials: "Credentials",
  webhook: "Webhook",
};

export type IntegrationScope = {
  key: string;
  label: string;
  description: string;
  /** Can't be turned off — the integration doesn't work without it. */
  required?: boolean;
  /** Granted by default when connecting. */
  defaultOn?: boolean;
};

export type IntegrationDefinition = {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  publisher: string;
  icon: IconComponent;
  tone: string;
  auth: AuthMethod;
  fields: ConnectionField[];
  scopes: IntegrationScope[];
  /** Tools from the shared catalog this connection powers. */
  toolIds: string[];
  /** Model provider whose models this connection serves. */
  modelProvider?: "OpenAI" | "Anthropic" | "Google";
  /** Config key shown as the connected account (workspace, email, host…). */
  accountKey?: string;
  features: string[];
  popular?: boolean;
  isNew?: boolean;
};

/* --------------------------------------------------------------------------
 * Field helpers
 * ------------------------------------------------------------------------ */

const secret = (key: string, label: string, placeholder: string, hint?: string): ConnectionField => ({
  key,
  label,
  type: "password",
  placeholder,
  defaultValue: "",
  required: true,
  hint,
});

const text = (key: string, label: string, placeholder: string, extra: Partial<ConnectionField> = {}): ConnectionField => ({
  key,
  label,
  type: "text",
  placeholder,
  defaultValue: "",
  required: true,
  ...extra,
});

const email = (key = "account", label = "Account email"): ConnectionField =>
  text(key, label, "you@company.com", { validate: "email", hint: "The account you'll authorize in the consent screen." });

const url = (key: string, label: string, placeholder: string): ConnectionField => text(key, label, placeholder, { validate: "url" });

const select = (key: string, label: string, options: string[], hint?: string): ConnectionField => ({
  key,
  label,
  type: "select",
  options,
  defaultValue: options[0]!,
  hint,
});

const toggle = (key: string, label: string, defaultValue: boolean, hint?: string): ConnectionField => ({
  key,
  label,
  type: "switch",
  defaultValue,
  hint,
});

const scope = (key: string, label: string, description: string, flags: Pick<IntegrationScope, "required" | "defaultOn"> = { defaultOn: true }): IntegrationScope => ({
  key,
  label,
  description,
  ...flags,
});

const sqlFields = (port: number, engine: string): ConnectionField[] => [
  text("host", "Host", `${engine}.example.com`, { validate: "hostname" }),
  { key: "port", label: "Port", type: "number", defaultValue: port, required: true, validate: "port" },
  text("database", "Database", "analytics"),
  text("username", "Username", "agentflow_ro"),
  secret("password", "Password", "••••••••"),
  toggle("ssl", "Require SSL", true),
  toggle("readOnly", "Read-only mode", true, "Blocks INSERT, UPDATE and DELETE statements."),
];

const readOnlyQueries = [
  scope("read_schema", "Read schemas", "List tables, columns and types.", { required: true }),
  scope("read_rows", "Run read queries", "Execute SELECT statements.", { required: true }),
  scope("write_rows", "Write data", "Allow INSERT/UPDATE when read-only mode is off.", {}),
];

const brandTone = "bg-muted text-foreground ring-1 ring-border";

/* --------------------------------------------------------------------------
 * Catalog
 * ------------------------------------------------------------------------ */

export const integrations: IntegrationDefinition[] = [
  // AI models
  {
    id: "openai",
    name: "OpenAI",
    description: "Run agents on GPT-4o and GPT-4o mini with your own API key and usage limits.",
    category: "AI models",
    publisher: "OpenAI",
    icon: OpenAIIcon,
    tone: brandTone,
    auth: "api_key",
    fields: [
      secret("apiKey", "API key", "sk-…", "Create one in your OpenAI dashboard under API keys."),
      text("organization", "Organization ID", "org-…", { required: false }),
      select("region", "Data residency", ["United States", "Europe"]),
    ],
    scopes: [
      scope("chat", "Chat completions", "Generate responses for agents and workflows.", { required: true }),
      scope("embeddings", "Embeddings", "Index knowledge sources for retrieval."),
      scope("images", "Image generation", "Used by the Image Generation tool.", {}),
    ],
    toolIds: ["image-generation"],
    modelProvider: "OpenAI",
    features: ["Bring your own key", "Per-agent usage tracking", "Automatic retries on 429"],
    popular: true,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Use Claude Opus, Sonnet and Haiku models for reasoning-heavy and high-volume agents.",
    category: "AI models",
    publisher: "Anthropic",
    icon: BrainCircuit,
    tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    auth: "api_key",
    fields: [secret("apiKey", "API key", "sk-ant-…", "Create one in the Anthropic Console."), select("tier", "Rate-limit tier", ["Standard", "Scale"])],
    scopes: [
      scope("messages", "Messages API", "Generate responses for agents and workflows.", { required: true }),
      scope("batches", "Batch processing", "Run large scheduled jobs at lower cost.", {}),
    ],
    toolIds: [],
    modelProvider: "Anthropic",
    features: ["Prompt caching", "Long-context models", "Per-agent usage tracking"],
    popular: true,
  },
  {
    id: "google-ai",
    name: "Google Gemini",
    description: "Connect Gemini models for long-context analysis over large documents.",
    category: "AI models",
    publisher: "Google",
    icon: GoogleIcon,
    tone: brandTone,
    auth: "api_key",
    fields: [secret("apiKey", "API key", "AIza…"), text("project", "Google Cloud project", "acme-agents", { required: false })],
    scopes: [scope("generate", "Generate content", "Generate responses for agents.", { required: true })],
    toolIds: [],
    modelProvider: "Google",
    features: ["1M-token context", "Multimodal input"],
  },
  {
    id: "azure-openai",
    name: "Azure OpenAI",
    description: "Route OpenAI models through your Azure tenant for enterprise compliance.",
    category: "AI models",
    publisher: "Microsoft",
    icon: Cloud,
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    auth: "api_key",
    fields: [url("endpoint", "Resource endpoint", "https://acme.openai.azure.com"), secret("apiKey", "API key", "Paste a key"), text("deployment", "Deployment name", "gpt-4o-prod")],
    scopes: [scope("chat", "Chat completions", "Generate responses through your deployment.", { required: true })],
    toolIds: [],
    accountKey: "endpoint",
    features: ["Private networking", "Regional data residency"],
    isNew: true,
  },

  // Communication
  {
    id: "slack",
    name: "Slack",
    description: "Let agents post updates, answer questions in channels and send alerts.",
    category: "Communication",
    publisher: "Slack",
    icon: SlackIcon,
    tone: brandTone,
    auth: "oauth",
    fields: [url("workspace", "Workspace URL", "https://acme.slack.com"), text("defaultChannel", "Default channel", "#general", { required: false })],
    scopes: [
      scope("chat_write", "Post messages", "Send messages as the AgentFlow bot.", { required: true }),
      scope("channels_read", "Read public channels", "Answer questions using channel history."),
      scope("users_read", "Read user profiles", "Mention people by name.", {}),
    ],
    toolIds: ["slack"],
    accountKey: "workspace",
    features: ["Slash commands", "Run alerts", "Threaded replies"],
    popular: true,
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Read, triage and draft email replies from a Google Workspace mailbox.",
    category: "Communication",
    publisher: "Google",
    icon: GoogleIcon,
    tone: brandTone,
    auth: "oauth",
    fields: [email(), toggle("draftsOnly", "Save as drafts only", true, "Agents draft replies; a person presses send.")],
    scopes: [
      scope("read", "Read email", "Fetch messages and threads.", { required: true }),
      scope("compose", "Compose drafts", "Create draft replies."),
      scope("send", "Send email", "Send without human review.", {}),
    ],
    toolIds: ["send-email"],
    accountKey: "account",
    features: ["Label-based routing", "Human approval"],
    popular: true,
  },
  {
    id: "microsoft-teams",
    name: "Microsoft Teams",
    description: "Bring agents into Teams channels and chats for your organization.",
    category: "Communication",
    publisher: "Microsoft",
    icon: MessagesSquare,
    tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    auth: "oauth",
    fields: [email("account", "Admin account"), text("tenant", "Tenant domain", "acme.onmicrosoft.com", { validate: "hostname" })],
    scopes: [scope("messages", "Send channel messages", "Post as the AgentFlow app.", { required: true }), scope("read", "Read channel messages", "Use conversation context.")],
    toolIds: [],
    accountKey: "tenant",
    features: ["Adaptive cards", "Tenant-wide install"],
  },
  {
    id: "discord",
    name: "Discord",
    description: "Run community support agents inside your Discord server.",
    category: "Communication",
    publisher: "Discord",
    icon: MessageCircle,
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    auth: "api_key",
    fields: [secret("botToken", "Bot token", "MTA…"), text("guildId", "Server ID", "112233445566778899")],
    scopes: [scope("send", "Send messages", "Reply in channels and threads.", { required: true }), scope("read", "Read message history", "Use conversation context.")],
    toolIds: [],
    accountKey: "guildId",
    features: ["Thread replies", "Role-based access"],
  },
  {
    id: "twilio",
    name: "Twilio",
    description: "Send SMS and WhatsApp notifications from workflows.",
    category: "Communication",
    publisher: "Twilio",
    icon: Phone,
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    auth: "api_key",
    fields: [text("accountSid", "Account SID", "AC…"), secret("authToken", "Auth token", "••••••••"), text("from", "Sender number", "+15551234567")],
    scopes: [scope("sms", "Send SMS", "Send text messages.", { required: true }), scope("whatsapp", "Send WhatsApp messages", "Use approved templates.", {})],
    toolIds: [],
    accountKey: "accountSid",
    features: ["Delivery receipts", "Opt-out handling"],
  },

  // Productivity
  {
    id: "notion",
    name: "Notion",
    description: "Read and update pages and databases your team shares with AgentFlow.",
    category: "Productivity",
    publisher: "Notion",
    icon: NotionIcon,
    tone: brandTone,
    auth: "oauth",
    fields: [text("workspace", "Workspace name", "Acme HQ")],
    scopes: [
      scope("read", "Read content", "Read pages and databases you share.", { required: true }),
      scope("update", "Update content", "Edit pages and add database rows."),
      scope("insert", "Create pages", "Publish new pages from agent output.", {}),
    ],
    toolIds: ["notion"],
    accountKey: "workspace",
    features: ["Knowledge sync", "Database writes"],
    popular: true,
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Search and read Docs, Sheets and PDFs in the drives you select.",
    category: "Productivity",
    publisher: "Google",
    icon: GoogleIcon,
    tone: brandTone,
    auth: "oauth",
    fields: [email(), select("syncFrequency", "Knowledge sync", ["Every hour", "Every 6 hours", "Daily", "Manual"])],
    scopes: [scope("read", "Read files", "Read files in selected drives.", { required: true }), scope("metadata", "Read file metadata", "Show titles and owners in citations.")],
    toolIds: ["google-drive"],
    accountKey: "account",
    features: ["Knowledge sync", "Shared drives"],
    popular: true,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Check availability and schedule meetings on behalf of your team.",
    category: "Productivity",
    publisher: "Google",
    icon: CalendarDays,
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    auth: "oauth",
    fields: [email()],
    scopes: [scope("freebusy", "Read free/busy", "Find open time slots.", { required: true }), scope("events", "Create events", "Book meetings and send invites.")],
    toolIds: ["calendar"],
    accountKey: "account",
    features: ["Time-zone aware", "Invite guests"],
  },
  {
    id: "confluence",
    name: "Confluence",
    description: "Ground agents in your team's Confluence spaces and runbooks.",
    category: "Productivity",
    publisher: "Atlassian",
    icon: BookOpen,
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    auth: "api_key",
    fields: [url("site", "Site URL", "https://acme.atlassian.net"), email("email", "Account email"), secret("token", "API token", "ATATT…")],
    scopes: [scope("read", "Read spaces", "Index pages for retrieval.", { required: true })],
    toolIds: [],
    accountKey: "site",
    features: ["Space filters", "Knowledge sync"],
  },
  {
    id: "airtable",
    name: "Airtable",
    description: "Use Airtable bases as lightweight databases for agent workflows.",
    category: "Productivity",
    publisher: "Airtable",
    icon: Table2,
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    auth: "api_key",
    fields: [secret("token", "Personal access token", "pat…"), text("baseId", "Base ID", "app…")],
    scopes: [scope("read", "Read records", "Query tables.", { required: true }), scope("write", "Write records", "Create and update rows.")],
    toolIds: [],
    accountKey: "baseId",
    features: ["Formula fields", "Linked records"],
  },

  // Developer
  {
    id: "github",
    name: "GitHub",
    description: "Review pull requests, triage issues and read code across your repositories.",
    category: "Developer",
    publisher: "GitHub",
    icon: GitHubIcon,
    tone: brandTone,
    auth: "oauth",
    fields: [text("org", "Organization", "acme"), select("repoAccess", "Repository access", ["Selected repositories", "All repositories"])],
    scopes: [
      scope("repo_read", "Read repositories", "Read code, commits and pull requests.", { required: true }),
      scope("pr_write", "Comment on pull requests", "Post reviews and inline comments."),
      scope("issues", "Manage issues", "Create, label and close issues.", {}),
    ],
    toolIds: ["github"],
    accountKey: "org",
    features: ["PR reviews", "Webhook triggers", "Fine-grained repo access"],
    popular: true,
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "Connect self-managed or cloud GitLab for merge-request reviews.",
    category: "Developer",
    publisher: "GitLab",
    icon: GitMerge,
    tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    auth: "api_key",
    fields: [url("baseUrl", "GitLab URL", "https://gitlab.com"), secret("token", "Access token", "glpat-…")],
    scopes: [scope("read_api", "Read API", "Read projects and merge requests.", { required: true }), scope("api", "Write API", "Comment on merge requests.")],
    toolIds: [],
    accountKey: "baseUrl",
    features: ["Self-managed support", "MR reviews"],
  },
  {
    id: "jira",
    name: "Jira",
    description: "Create, update and search issues from agent conversations.",
    category: "Developer",
    publisher: "Atlassian",
    icon: SquareKanban,
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    auth: "api_key",
    fields: [url("site", "Site URL", "https://acme.atlassian.net"), email("email", "Account email"), secret("token", "API token", "ATATT…")],
    scopes: [scope("read", "Read issues", "Search projects and issues.", { required: true }), scope("write", "Create issues", "File bugs and tasks.")],
    toolIds: ["jira"],
    accountKey: "site",
    features: ["JQL search", "Issue creation"],
  },
  {
    id: "linear",
    name: "Linear",
    description: "Turn customer feedback and incidents into Linear issues automatically.",
    category: "Developer",
    publisher: "Linear",
    icon: Zap,
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    auth: "api_key",
    fields: [secret("apiKey", "API key", "lin_api_…"), text("team", "Default team", "ENG", { required: false })],
    scopes: [scope("read", "Read issues", "Search issues and projects.", { required: true }), scope("write", "Create issues", "File and update issues.")],
    toolIds: [],
    features: ["Triage automation", "Project updates"],
    isNew: true,
  },

  // Data & storage
  {
    id: "postgresql",
    name: "PostgreSQL",
    description: "Query your Postgres warehouse with read-only SQL from agents.",
    category: "Data & storage",
    publisher: "AgentFlow",
    icon: Database,
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    auth: "credentials",
    fields: sqlFields(5432, "db"),
    scopes: readOnlyQueries,
    toolIds: ["database-query"],
    accountKey: "host",
    features: ["Read-only guardrails", "Schema introspection", "SSL"],
    popular: true,
  },
  {
    id: "mysql",
    name: "MySQL",
    description: "Connect MySQL or MariaDB databases for reporting agents.",
    category: "Data & storage",
    publisher: "AgentFlow",
    icon: Database,
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    auth: "credentials",
    fields: sqlFields(3306, "mysql"),
    scopes: readOnlyQueries,
    toolIds: ["database-query"],
    accountKey: "host",
    features: ["Read-only guardrails", "SSL"],
  },
  {
    id: "snowflake",
    name: "Snowflake",
    description: "Run analytical queries against Snowflake warehouses.",
    category: "Data & storage",
    publisher: "Snowflake",
    icon: Snowflake,
    tone: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    auth: "credentials",
    fields: [text("account", "Account identifier", "acme-xy12345"), text("warehouse", "Warehouse", "ANALYTICS_WH"), text("username", "Username", "AGENTFLOW"), secret("password", "Password", "••••••••")],
    scopes: readOnlyQueries,
    toolIds: ["database-query"],
    accountKey: "account",
    features: ["Warehouse auto-suspend aware", "Role-based access"],
  },
  {
    id: "bigquery",
    name: "BigQuery",
    description: "Query BigQuery datasets with a scoped service account.",
    category: "Data & storage",
    publisher: "Google",
    icon: GoogleIcon,
    tone: brandTone,
    auth: "credentials",
    fields: [
      text("projectId", "Project ID", "acme-analytics"),
      { key: "serviceAccount", label: "Service account key (JSON)", type: "textarea", placeholder: '{ "type": "service_account", … }', defaultValue: "", required: true, validate: "json" },
      { key: "maxBytes", label: "Max bytes billed per query (GB)", type: "number", min: 1, max: 1000, defaultValue: 10, required: true },
    ],
    scopes: readOnlyQueries,
    toolIds: ["database-query"],
    accountKey: "projectId",
    features: ["Cost guardrails", "Dataset filters"],
  },
  {
    id: "mongodb",
    name: "MongoDB",
    description: "Look up documents in MongoDB Atlas collections.",
    category: "Data & storage",
    publisher: "MongoDB",
    icon: Leaf,
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    auth: "credentials",
    fields: [secret("uri", "Connection string", "mongodb+srv://…"), text("database", "Database", "app")],
    scopes: [scope("read", "Read documents", "Find and aggregate.", { required: true })],
    toolIds: [],
    accountKey: "database",
    features: ["Aggregation pipelines", "Atlas Search"],
  },
  {
    id: "pinecone",
    name: "Pinecone",
    description: "Store and search knowledge embeddings in a managed vector index.",
    category: "Data & storage",
    publisher: "Pinecone",
    icon: Layers,
    tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    auth: "api_key",
    fields: [secret("apiKey", "API key", "pcsk_…"), text("index", "Index name", "agentflow-knowledge"), select("cloud", "Cloud region", ["aws-us-east-1", "gcp-europe-west4", "azure-eastus2"])],
    scopes: [scope("query", "Query vectors", "Retrieve relevant chunks.", { required: true }), scope("upsert", "Write vectors", "Index new knowledge sources.")],
    toolIds: [],
    accountKey: "index",
    features: ["Hybrid search", "Namespaces per agent"],
    isNew: true,
  },
  {
    id: "aws-s3",
    name: "Amazon S3",
    description: "Read files from S3 buckets and store agent outputs.",
    category: "Data & storage",
    publisher: "Amazon Web Services",
    icon: Archive,
    tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    auth: "credentials",
    fields: [text("bucket", "Bucket", "acme-agent-files"), select("region", "Region", ["us-east-1", "us-west-2", "eu-west-1", "ap-south-1"]), text("accessKeyId", "Access key ID", "AKIA…"), secret("secretKey", "Secret access key", "••••••••")],
    scopes: [scope("read", "Read objects", "Download files for processing.", { required: true }), scope("write", "Write objects", "Save generated reports.")],
    toolIds: ["file-processing"],
    accountKey: "bucket",
    features: ["Prefix filters", "Server-side encryption"],
  },

  // CRM & business
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Enrich leads, update opportunities and log activity from agents.",
    category: "CRM & business",
    publisher: "Salesforce",
    icon: Cloud,
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    auth: "oauth",
    fields: [url("instance", "Instance URL", "https://acme.my.salesforce.com"), select("environment", "Environment", ["Production", "Sandbox"])],
    scopes: [scope("read", "Read records", "Accounts, contacts and opportunities.", { required: true }), scope("write", "Update records", "Log activities and update fields.")],
    toolIds: [],
    accountKey: "instance",
    features: ["Lead enrichment", "Activity logging"],
    popular: true,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Qualify leads and sync conversation notes to HubSpot contacts.",
    category: "CRM & business",
    publisher: "HubSpot",
    icon: Users,
    tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    auth: "oauth",
    fields: [text("portal", "Portal ID", "24681357")],
    scopes: [scope("contacts", "Contacts", "Read and update contacts.", { required: true }), scope("deals", "Deals", "Read deal stages.")],
    toolIds: [],
    accountKey: "portal",
    features: ["Lead scoring", "Timeline notes"],
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Look up customers, invoices and subscriptions for billing support.",
    category: "CRM & business",
    publisher: "Stripe",
    icon: CreditCard,
    tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    auth: "api_key",
    fields: [secret("secretKey", "Restricted API key", "rk_live_…", "Use a restricted key with read-only access."), select("mode", "Mode", ["Live", "Test"])],
    scopes: [scope("customers", "Read customers", "Look up billing details.", { required: true }), scope("invoices", "Read invoices", "Explain charges."), scope("refunds", "Issue refunds", "Requires human approval.", {})],
    toolIds: ["stripe"],
    features: ["Restricted keys", "Test mode"],
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Draft replies, tag and route tickets with support agents.",
    category: "CRM & business",
    publisher: "Zendesk",
    icon: Headset,
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    auth: "api_key",
    fields: [text("subdomain", "Subdomain", "acme", { hint: "From acme.zendesk.com" }), email("email", "Agent email"), secret("token", "API token", "••••••••")],
    scopes: [scope("read", "Read tickets", "Fetch tickets and history.", { required: true }), scope("write", "Update tickets", "Tag, route and draft replies.")],
    toolIds: [],
    accountKey: "subdomain",
    features: ["Macro suggestions", "Auto-tagging"],
  },
  {
    id: "company-directory",
    name: "Company directory",
    description: "Sync people and teams from your HR system so agents can route requests.",
    category: "CRM & business",
    publisher: "AgentFlow",
    icon: Building2,
    tone: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    auth: "api_key",
    fields: [url("endpoint", "Directory API", "https://hr.example.com/api"), secret("token", "API token", "••••••••")],
    scopes: [scope("people", "Read people", "Names, teams and managers.", { required: true })],
    toolIds: [],
    accountKey: "endpoint",
    features: ["Org-chart routing"],
  },

  // APIs & automation
  {
    id: "rest-api",
    name: "REST API",
    description: "Connect any HTTP API with base URL, auth and default headers.",
    category: "APIs & automation",
    publisher: "AgentFlow",
    icon: Globe,
    tone: "bg-primary-soft text-primary-soft-foreground",
    auth: "api_key",
    fields: [
      url("baseUrl", "Base URL", "https://api.example.com"),
      select("authType", "Authentication", ["Bearer token", "API key header", "None"]),
      { ...secret("token", "Token", "Paste a token"), required: false },
      { key: "headers", label: "Default headers (JSON)", type: "textarea", placeholder: '{ "Accept": "application/json" }', defaultValue: "", validate: "json" },
    ],
    scopes: [scope("get", "Read requests", "GET requests.", { required: true }), scope("write", "Write requests", "POST, PUT, PATCH and DELETE.")],
    toolIds: ["api-request"],
    accountKey: "baseUrl",
    features: ["Any HTTP API", "Header templates"],
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Trigger workflows from any system with signed incoming webhooks.",
    category: "APIs & automation",
    publisher: "AgentFlow",
    icon: Webhook,
    tone: "bg-primary-soft text-primary-soft-foreground",
    auth: "webhook",
    fields: [
      text("name", "Endpoint name", "orders-created"),
      select("signing", "Signature verification", ["HMAC SHA-256", "None"]),
      toggle("replay", "Reject replayed requests", true, "Requests older than 5 minutes are rejected."),
    ],
    scopes: [scope("trigger", "Trigger workflows", "Start workflows with an event trigger.", { required: true })],
    toolIds: [],
    accountKey: "name",
    features: ["Signed payloads", "Replay protection", "Event triggers"],
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Hand off agent results to 6,000+ apps through Zapier.",
    category: "APIs & automation",
    publisher: "Zapier",
    icon: Workflow,
    tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    auth: "api_key",
    fields: [secret("apiKey", "API key", "Paste your Zapier key")],
    scopes: [scope("trigger", "Trigger Zaps", "Send events to Zapier.", { required: true })],
    toolIds: [],
    features: ["Zap triggers", "Multi-step automations"],
  },
  {
    id: "make",
    name: "Make",
    description: "Send workflow outputs to Make scenarios via custom webhooks.",
    category: "APIs & automation",
    publisher: "Make",
    icon: Sparkles,
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    auth: "webhook",
    fields: [url("hookUrl", "Scenario webhook URL", "https://hook.eu1.make.com/…")],
    scopes: [scope("trigger", "Trigger scenarios", "Post events to Make.", { required: true })],
    toolIds: [],
    accountKey: "hookUrl",
    features: ["Scenario triggers"],
  },
  {
    id: "sftp",
    name: "SFTP",
    description: "Pick up nightly exports and drop generated files on an SFTP server.",
    category: "Data & storage",
    publisher: "AgentFlow",
    icon: HardDrive,
    tone: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    auth: "credentials",
    fields: [text("host", "Host", "files.example.com", { validate: "hostname" }), { key: "port", label: "Port", type: "number", defaultValue: 22, required: true, validate: "port" }, text("username", "Username", "agentflow"), secret("password", "Password or key passphrase", "••••••••")],
    scopes: [scope("read", "Read files", "Download files.", { required: true }), scope("write", "Upload files", "Store outputs.")],
    toolIds: ["file-processing"],
    accountKey: "host",
    features: ["Key-based auth", "Scheduled pickups"],
  },
  {
    id: "email-smtp",
    name: "SMTP email",
    description: "Send transactional email from your own domain via SMTP.",
    category: "Communication",
    publisher: "AgentFlow",
    icon: Mail,
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    auth: "credentials",
    fields: [
      text("host", "SMTP host", "smtp.example.com", { validate: "hostname" }),
      { key: "port", label: "Port", type: "number", defaultValue: 587, required: true, validate: "port" },
      text("from", "From address", "agents@example.com", { validate: "email" }),
      text("username", "Username", "agents@example.com"),
      secret("password", "Password", "••••••••"),
    ],
    scopes: [scope("send", "Send email", "Deliver messages from your domain.", { required: true })],
    toolIds: ["send-email"],
    accountKey: "from",
    features: ["Custom domain", "DKIM friendly"],
  },
];

export const integrationsById = new Map(integrations.map((integration) => [integration.id, integration]));

export function defaultIntegrationConfig(definition: IntegrationDefinition): Record<string, NodeConfigValue> {
  return Object.fromEntries(definition.fields.map((field) => [field.key, field.defaultValue]));
}

export function defaultScopes(definition: IntegrationDefinition) {
  return definition.scopes.filter((item) => item.required || item.defaultOn).map((item) => item.key);
}

/** "••••a21f" — never show a full secret back to the user. */
export function maskSecret(value: string) {
  if (!value) return "Not set";
  return `••••${value.slice(-4)}`;
}

/** Short label for the connected account: workspace, email, host or masked key. */
export function accountLabel(definition: IntegrationDefinition, connection: Pick<IntegrationConnection, "config">) {
  if (definition.accountKey) {
    const value = connection.config[definition.accountKey];
    if (value !== undefined && value !== "") return String(value).replace(/^https?:\/\//, "");
  }
  const secretField = definition.fields.find((field) => field.type === "password");
  return secretField ? `Key ${maskSecret(String(connection.config[secretField.key] ?? ""))}` : definition.name;
}

/** Placeholder URL shown for webhook integrations — no endpoint actually exists. */
export function webhookUrl(name: NodeConfigValue | undefined) {
  const slug = String(name || "endpoint").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  return `https://hooks.agentflow.example/demo/${slug}`;
}
