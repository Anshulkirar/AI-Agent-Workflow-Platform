/*
 * Help & Docs content. Article bodies use the MarkdownLite subset
 * (paragraphs, `-`/`1.` lists, `###` headings, **bold**, _italic_, `code`).
 */

export type DocIconKey =
  | "rocket"
  | "bot"
  | "workflow"
  | "wrench"
  | "book"
  | "activity"
  | "code"
  | "card"
  | "help";

export type DocArticle = {
  id: string;
  title: string;
  summary: string;
  body: string;
  /** Extra search terms that don't appear in the text. */
  keywords?: string[];
  code?: { label: string; language: string; source: string };
  /** In-app destinations related to the article. */
  links?: { label: string; href: string }[];
};

export type DocSection = {
  id: string;
  title: string;
  description: string;
  icon: DocIconKey;
  articles: DocArticle[];
};

export const docSections: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Set up your workspace and ship your first agent in minutes.",
    icon: "rocket",
    articles: [
      {
        id: "quickstart",
        title: "Quickstart: your first agent in 5 minutes",
        summary: "Create an agent, give it a tool, and watch it run.",
        keywords: ["tutorial", "begin", "first", "setup"],
        body: `1. Open **Agents** and click **Create Agent**.
2. Give it a name and purpose in **Basic Info**, then describe how it should behave in **Instructions**.
3. Pick one or two **Tools** — Web Search is a good start — and optionally attach a **Knowledge** collection.
4. Choose a model on **Model & Settings**, check everything on **Review**, and create the agent.
5. Open the agent's builder and press **Test run** to see each step execute live.
Every run is recorded under **Runs**, where you can inspect inputs, outputs, logs and token usage.`,
        links: [
          { label: "Create an agent", href: "/agents/new" },
          { label: "View runs", href: "/runs" },
        ],
      },
      {
        id: "core-concepts",
        title: "Core concepts",
        summary: "Agents, workflows, tools, knowledge and runs — how they fit together.",
        keywords: ["overview", "glossary", "terminology"],
        body: `- **Agent** — a model plus instructions, tools and knowledge that completes a task.
- **Workflow** — a graph that chains agents, tools, conditions and transforms, started by a trigger.
- **Tool** — an action an agent can take, such as searching the web or calling your API.
- **Knowledge** — documents, URLs and text that are chunked and embedded so agents can cite them.
- **Integration** — a connection to an external service (Slack, GitHub, Notion…) that powers tools and triggers.
- **Run** — one execution of an agent or workflow, with a full step-by-step trace.`,
      },
      {
        id: "workspace-setup",
        title: "Set up your workspace and team",
        summary: "Name your workspace, invite teammates and assign roles.",
        keywords: ["invite", "members", "roles", "organization"],
        body: `Go to **Settings → General** to set the workspace name and defaults. Under **Settings → Team** you can invite teammates by email and assign a role.
### Tips
- Give production access only to people who deploy agents.
- Turn on two-factor authentication in **Settings → Security** before inviting others.`,
        links: [
          { label: "Workspace settings", href: "/settings/workspace" },
          { label: "Team", href: "/settings/team" },
        ],
      },
      {
        id: "navigation",
        title: "Finding your way around",
        summary: "Sidebar, search, keyboard shortcuts and themes.",
        keywords: ["shortcut", "keyboard", "dark mode", "theme", "sidebar", "collapse"],
        body: `- Press \`/\` anywhere to jump to the search bar.
- Use the ☰ button in the top bar to collapse the sidebar to icons — your choice is remembered. On mobile it opens the navigation drawer.
- Switch between light and dark mode with the toggle in the top bar, or pick **System** in **Settings → Profile**.`,
      },
    ],
  },
  {
    id: "agents",
    title: "Agents",
    description: "Build, configure and test AI agents.",
    icon: "bot",
    articles: [
      {
        id: "create-agent",
        title: "Create an agent with the wizard",
        summary: "The six setup steps and what each one controls.",
        keywords: ["new agent", "wizard", "steps"],
        body: `The wizard walks you through six steps:
1. **Basic Info** — name, purpose, icon and color.
2. **Instructions** — the system prompt that defines behavior and tone.
3. **Tools** — actions the agent may take.
4. **Knowledge** — collections it can search and cite.
5. **Model & Settings** — model, temperature and limits.
6. **Review** — confirm and create.
You can change any of these later from the agent's **Edit** page.`,
        links: [{ label: "Create an agent", href: "/agents/new" }],
      },
      {
        id: "instructions",
        title: "Writing effective instructions",
        summary: "Prompting patterns that make agents reliable.",
        keywords: ["prompt", "system prompt", "prompting"],
        body: `Good instructions are specific about the goal, the audience and the output format.
- State the role and the task in the first sentence.
- List hard rules ("Never invent citations") separately from preferences.
- Describe the output shape — headings, bullet lists, JSON fields.
- Tell the agent when to use each tool and when to stop.
Keep instructions short enough to scan; move reference material into **Knowledge** instead.`,
      },
      {
        id: "models",
        title: "Choosing a model and settings",
        summary: "Temperature, max tokens and picking the right model.",
        keywords: ["temperature", "tokens", "llm", "claude", "gpt"],
        body: `Pick a larger model for multi-step reasoning and a faster one for classification or routing.
- **Temperature** — lower (0–0.3) for factual or structured output, higher for creative writing.
- **Max tokens** — caps the length of each response and helps control cost.
Model choice applies per agent, so you can mix fast and capable models inside one workflow.`,
      },
      {
        id: "builder",
        title: "Using the visual builder",
        summary: "Edit an agent's flow on a canvas and test it live.",
        keywords: ["canvas", "nodes", "graph", "test run"],
        body: `Every agent has a builder that shows its flow as nodes: **Input**, **LLM**, **Tool**, **Transform**, **Condition** and **Output**.
- Drag nodes from the palette and connect their handles.
- Select a node to edit its configuration in the side panel.
- Press **Test run** to execute the graph and watch each node light up as it completes.
Remember to save — the builder tells you when you have unsaved changes.`,
        links: [{ label: "Open agents", href: "/agents" }],
      },
    ],
  },
  {
    id: "workflows",
    title: "Workflows",
    description: "Chain agents and tools into automated pipelines.",
    icon: "workflow",
    articles: [
      {
        id: "workflow-basics",
        title: "Workflow basics",
        summary: "When to use a workflow instead of a single agent.",
        keywords: ["pipeline", "automation", "orchestration"],
        body: `Use a workflow when a task has distinct stages — research, then draft, then review — or when you need branching logic. Workflows can include multiple **Agent** nodes, **Tool** calls, **Condition** branches and **Transform** steps. Independent branches run in parallel automatically.`,
        links: [{ label: "Create a workflow", href: "/workflows/new" }],
      },
      {
        id: "triggers",
        title: "Triggers: manual, schedule, webhook and event",
        summary: "Start workflows on demand, on a timer, or from other systems.",
        keywords: ["cron", "schedule", "webhook", "event", "automate"],
        body: `- **Manual** — run from the dashboard or the API.
- **Schedule** — run on a recurring schedule, such as every weekday at 9:00.
- **Webhook** — run when an external system sends an HTTP request to the workflow's URL.
- **Event** — run when something happens in a connected integration, such as a new GitHub issue.
Only **Active** workflows respond to schedules, webhooks and events. **Paused** and **Draft** workflows can still be run manually.`,
      },
      {
        id: "conditions",
        title: "Branching with conditions",
        summary: "Route execution down different paths based on results.",
        keywords: ["if", "branch", "logic", "yes no"],
        body: `A **Condition** node evaluates the previous step's output and continues down its **Yes** or **No** handle. Steps on the branch that isn't taken are marked **skipped** in the run trace, so you can always see which path was followed.`,
      },
      {
        id: "workflow-status",
        title: "Activating, pausing and archiving",
        summary: "Control which workflows can run.",
        keywords: ["pause", "archive", "draft", "active"],
        body: `Workflows move through **Draft → Active → Paused → Archived**. Pausing is instant and keeps the configuration intact; archiving hides the workflow from the default list. Select several workflows in the list to change their status in bulk.`,
        links: [{ label: "Open workflows", href: "/workflows" }],
      },
    ],
  },
  {
    id: "tools-integrations",
    title: "Tools & Integrations",
    description: "Give agents abilities and connect external services.",
    icon: "wrench",
    articles: [
      {
        id: "builtin-tools",
        title: "Built-in tools",
        summary: "Install ready-made tools and test the connection.",
        keywords: ["install", "connect", "web search"],
        body: `Browse **Tools** to install ready-made capabilities. Each tool shows its connection status: **Connected**, **Needs setup** or **Error**. Open a tool to configure credentials and run a connection test before giving it to an agent.`,
        links: [{ label: "Browse tools", href: "/tools" }],
      },
      {
        id: "custom-tools",
        title: "Custom HTTP tools",
        summary: "Turn any REST endpoint into a tool your agents can call.",
        keywords: ["api", "http", "rest", "endpoint", "bearer", "api key"],
        body: `Create a custom tool to call your own API.
1. Go to **Tools → New tool**.
2. Set the method (\`GET\`, \`POST\`, \`PUT\`, \`PATCH\` or \`DELETE\`) and URL.
3. Choose authentication: **None**, **API key** or **Bearer token**.
4. Describe what the tool does — agents use the description to decide when to call it.
5. Use the test panel to send a sample request before saving.`,
        links: [{ label: "Create a custom tool", href: "/tools/new" }],
      },
      {
        id: "integrations",
        title: "Connecting integrations",
        summary: "Link Slack, GitHub, Notion and more to your workspace.",
        keywords: ["slack", "github", "notion", "oauth", "connect"],
        body: `Open **Integrations**, pick a service and follow the connection steps. Once connected, the integration's tools become available to agents and its events can trigger workflows. You can disconnect at any time; agents that depend on it will show a warning.`,
        links: [{ label: "Open integrations", href: "/integrations" }],
      },
    ],
  },
  {
    id: "knowledge",
    title: "Knowledge Base",
    description: "Ground agents in your own documents and data.",
    icon: "book",
    articles: [
      {
        id: "add-sources",
        title: "Adding sources",
        summary: "Upload files, crawl URLs or paste text.",
        keywords: ["upload", "pdf", "docx", "csv", "crawl", "website", "import"],
        body: `Knowledge supports three source types:
- **Files** — PDF, DOCX, TXT, Markdown, CSV, XLSX, JSON and HTML.
- **URLs** — a single page or a crawl of a whole site.
- **Text** — paste content directly.
Group related sources into **collections** and attach collections to agents in the wizard's Knowledge step.`,
        links: [{ label: "Open knowledge", href: "/knowledge" }],
      },
      {
        id: "processing",
        title: "How processing works",
        summary: "From upload to searchable: parsing, chunking and embedding.",
        keywords: ["embedding", "chunk", "index", "rag", "vector", "failed"],
        body: `Each source moves through **queued → processing → ready**. While processing it is parsed, split into chunks, embedded and indexed. If a source shows **failed**, open it to see the error — the most common causes are password-protected files and pages that block crawlers.`,
      },
      {
        id: "sync",
        title: "Keeping sources up to date",
        summary: "Schedule re-syncs for URLs and connected sources.",
        keywords: ["sync", "refresh", "daily", "weekly"],
        body: `URL sources can re-sync **manually**, **daily** or **weekly**. Re-syncing replaces the old chunks, so agents always cite the latest version of the page.`,
      },
    ],
  },
  {
    id: "runs",
    title: "Runs",
    description: "Monitor executions, debug failures and track usage.",
    icon: "activity",
    articles: [
      {
        id: "run-statuses",
        title: "Run and step statuses",
        summary: "What running, success, failed and cancelled mean.",
        keywords: ["status", "cancelled", "failed", "pending", "skipped"],
        body: `A run is **running**, **success**, **failed** or **cancelled**. Each step inside it is **pending**, **running**, **success**, **failed** or **skipped** (for example, the untaken side of a condition). Filter the Runs list by status to find problems quickly.`,
        links: [{ label: "Open runs", href: "/runs" }],
      },
      {
        id: "debugging",
        title: "Debugging a failed run",
        summary: "Use the timeline, logs and input/output tabs.",
        keywords: ["error", "debug", "logs", "trace", "timeline", "retry"],
        body: `Open the run and start with the **Timeline** to see which step failed. Then check:
- **Logs** — tool responses and error messages, filterable by level.
- **Input / Output** — exactly what each step received and returned.
- **Metrics** — duration and token usage per step.
Most failures come from tool credentials or rate limits; fix the tool, then run again.`,
      },
      {
        id: "usage-metrics",
        title: "Tokens, cost and analytics",
        summary: "Track usage across agents, workflows and time.",
        keywords: ["tokens", "cost", "analytics", "metrics", "export"],
        body: `Every run records tokens and duration. **Analytics** aggregates these across agents and workflows with selectable date ranges, and its tables can be sorted to find your most expensive or slowest agents.`,
        links: [{ label: "Open analytics", href: "/analytics" }],
      },
    ],
  },
  {
    id: "api-sdk",
    title: "API / SDK",
    description: "Run agents and fetch results from your own code.",
    icon: "code",
    articles: [
      {
        id: "authentication",
        title: "Authentication and API keys",
        summary: "Create keys and authenticate requests.",
        keywords: ["api key", "token", "bearer", "secret", "auth"],
        body: `Create keys in **Settings → API keys**. Live keys start with \`af_live_\` and test keys with \`af_test_\`. Send the key as a bearer token on every request. Keys are shown once at creation — store them in a secret manager and rotate them if they leak.`,
        code: {
          label: "Authenticated request",
          language: "bash",
          source: `curl "$AGENTFLOW_API_URL/v1/agents" \\
  -H "Authorization: Bearer $AGENTFLOW_API_KEY"`,
        },
        links: [{ label: "Manage API keys", href: "/settings/api-keys" }],
      },
      {
        id: "run-agent-api",
        title: "Run an agent",
        summary: "Start a run and pass input over HTTP.",
        keywords: ["post", "execute", "invoke", "trigger", "rest"],
        body: `Start a run by posting input to an agent. The response includes the run \`id\`, which you can poll for status and output. \`AGENTFLOW_API_URL\` is your deployment's API address — \`http://localhost:4000\` when self-hosting with the default \`API_PORT\`.`,
        code: {
          label: "Start a run",
          language: "bash",
          source: `curl -X POST "$AGENTFLOW_API_URL/v1/agents/AGENT_ID/runs" \\
  -H "Authorization: Bearer $AGENTFLOW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Summarize this week'"'"'s support tickets"}'`,
        },
      },
      {
        id: "typescript",
        title: "Using the API from TypeScript",
        summary: "A typed client with fetch and the shared types package.",
        keywords: ["sdk", "typescript", "javascript", "node", "client", "fetch"],
        body: `Any HTTP client works. In TypeScript, a small wrapper around \`fetch\` is all you need; inside this monorepo, \`@agentflow/types\` provides shared types for responses.`,
        code: {
          label: "TypeScript",
          language: "ts",
          source: `const api = (path: string, init?: RequestInit) =>
  fetch(\`\${process.env.AGENTFLOW_API_URL}/v1\${path}\`, {
    ...init,
    headers: {
      Authorization: \`Bearer \${process.env.AGENTFLOW_API_KEY}\`,
      "Content-Type": "application/json",
    },
  }).then((res) => res.json());

const run = await api("/agents/AGENT_ID/runs", {
  method: "POST",
  body: JSON.stringify({ input: "Draft a release note for v2.4" }),
});`,
        },
      },
      {
        id: "webhooks-health",
        title: "Webhooks and health checks",
        summary: "Trigger workflows over HTTP and monitor the API.",
        keywords: ["webhook", "health", "status", "uptime", "monitoring"],
        body: `Workflows with a **Webhook** trigger get a unique URL — send a \`POST\` with a JSON body and it becomes the workflow's input. For uptime monitoring, \`GET /health\` returns \`{"status":"ok"}\` when the API is running.`,
        code: {
          label: "Health check",
          language: "bash",
          source: `curl "$AGENTFLOW_API_URL/health"
# {"status":"ok"}`,
        },
      },
    ],
  },
  {
    id: "billing",
    title: "Billing",
    description: "Plans, usage limits, invoices and trials.",
    icon: "card",
    articles: [
      {
        id: "plans",
        title: "Plans and limits",
        summary: "What Free, Pro and Enterprise include.",
        keywords: ["pricing", "free", "pro", "enterprise", "limits", "seats"],
        body: `- **Free** — 3 agents, 500 runs per month and 7-day run history.
- **Pro** — unlimited agents, 25,000 runs per month, workflows & scheduling and 90-day history.
- **Enterprise** — unlimited runs, SSO & audit logs, dedicated infrastructure and priority support.
Yearly billing is 20% cheaper than monthly.`,
        links: [{ label: "Billing & usage", href: "/settings/billing" }],
      },
      {
        id: "usage-limits",
        title: "Tracking usage and limits",
        summary: "Monitor monthly runs before you hit your cap.",
        keywords: ["quota", "overage", "runs", "usage"],
        body: `The usage card at the bottom of the sidebar shows how many of your monthly runs you've used. The meter turns amber at 80% and red at 100%. Full details — runs, agents, seats and storage — are in **Settings → Billing & usage**.`,
      },
      {
        id: "trial",
        title: "Free trial and plan changes",
        summary: "How the Pro trial works and how to change plans.",
        keywords: ["trial", "upgrade", "downgrade", "cancel", "invoice"],
        body: `The Pro trial includes every Pro feature for 14 days. Change plans at any time from **Settings → Billing & usage**, where you can also switch between monthly and yearly billing and update the details shown on invoices.`,
      },
    ],
  },
  {
    id: "faqs",
    title: "FAQs",
    description: "Quick answers to common questions.",
    icon: "help",
    articles: [
      {
        id: "faq-roles",
        title: "Who can see and edit my agents?",
        summary: "Access follows workspace roles: owner, admin, member and viewer.",
        keywords: ["permissions", "roles", "access", "security", "viewer", "admin"],
        body: `Everyone in a workspace can see its agents, workflows and runs. What they can change depends on their role — **owner**, **admin**, **member** or **viewer**. Manage roles in **Settings → Team**, and review sign-in activity in **Settings → Security**.`,
      },
      {
        id: "faq-models",
        title: "Which model providers are supported?",
        summary: "Anthropic and OpenAI models, configured per agent.",
        keywords: ["anthropic", "openai", "claude", "gpt", "provider"],
        body: `AgentFlow supports Anthropic and OpenAI models. Self-hosted deployments configure provider keys with \`ANTHROPIC_API_KEY\` and \`OPENAI_API_KEY\`; the model itself is chosen per agent.`,
      },
      {
        id: "faq-limit",
        title: "What happens when I reach my run limit?",
        summary: "New runs pause until the next cycle or an upgrade.",
        keywords: ["limit", "quota", "exceeded"],
        body: `When you reach your monthly run limit, new runs are paused until the next billing cycle. Upgrade your plan to resume immediately — existing agents and history are unaffected.`,
      },
      {
        id: "faq-cancel-run",
        title: "Can I stop a run that's in progress?",
        summary: "Yes — cancelled runs keep their partial trace.",
        keywords: ["stop", "cancel", "abort"],
        body: `Yes. Cancel it from the run's page. Steps that already finished keep their output, and the run is marked **cancelled**.`,
      },
      {
        id: "faq-export",
        title: "Can I export my data?",
        summary: "Download run details, logs and analytics.",
        keywords: ["export", "download", "csv", "backup"],
        body: `Yes. Run details and logs can be downloaded from each run's page, and **Analytics** data can be exported for your selected date range.`,
      },
      {
        id: "faq-self-host",
        title: "Can I self-host AgentFlow?",
        summary: "Yes, with Docker Compose.",
        keywords: ["docker", "self host", "on-prem", "deploy"],
        body: `Yes. Copy \`.env.example\` to \`.env\`, set your database, Redis and provider keys, then run \`npm run docker:up\`. The web app listens on \`WEB_PORT\` (3000) and the API on \`API_PORT\` (4000).`,
      },
    ],
  },
];
