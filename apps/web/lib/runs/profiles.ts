import type { StepTemplate } from "./types";

/*
 * Realistic execution "shapes" per kind of agent/workflow. Seeds and the
 * simulator use these to produce believable steps, logs and output.
 */

export type RunProfile = {
  inputs: string[];
  steps: StepTemplate[];
  output: (input: string) => string;
};

const init = (label = "Initialize agent"): StepTemplate => ({
  name: label,
  kind: "system",
  seconds: 2.1,
  tokens: 412,
  input: "Load instructions, tools and memory",
  output: "Loaded system prompt (1,204 chars), 4 tools and 3 memory items.",
  details: ["Resolved model configuration", "Restored conversation memory (3 items)"],
});

export const profiles: Record<string, RunProfile> = {
  research: {
    inputs: [
      "Research latest AI agent frameworks and compare them.",
      "Summarize recent papers on retrieval-augmented generation.",
      "What are the main approaches to evaluating LLM agents?",
    ],
    steps: [
      init(),
      { name: "Web search", kind: "tool", toolId: "web-search", seconds: 8.4, tokens: 1840, input: 'query: "{{input}}", max_results: 8', output: "Found 12 results across 8 domains (github.com, arxiv.org, docs sites).", details: ["GET search.api/v1?q=… → 200 (612 ms)", "Ranked 12 results by relevance"] },
      { name: "Fetch documentation", kind: "tool", toolId: "web-scraping", seconds: 12.3, tokens: 4210, input: "5 URLs from search results", output: "Scraped 5 pages (48.2 KB of text) and extracted 31 relevant passages.", details: ["Fetched docs.langchain.com (1.9 s)", "Fetched microsoft.github.io/autogen (2.4 s)", "Skipped 1 page: robots.txt disallow"] },
      { name: "Analyze results", kind: "llm", seconds: 6.2, tokens: 3520, input: "31 passages + comparison rubric", output: "Compared 5 frameworks on orchestration, tooling, memory, observability and licensing." },
      { name: "Generate summary", kind: "transform", seconds: 4.1, tokens: 2470, input: "Analysis notes", output: "Wrote a 420-word comparison with 6 citations." },
    ],
    output: (input) =>
      [
        "## Comparison of AI agent frameworks",
        "",
        `**Request:** ${input}`,
        "",
        "Here is a comparison of popular AI agent frameworks including LangChain, LlamaIndex, AutoGen, CrewAI and AgentFlow:",
        "",
        "1. **LangChain** — the broadest ecosystem of integrations; graph-based orchestration via LangGraph.",
        "2. **LlamaIndex** — strongest for retrieval over private data and document pipelines.",
        "3. **AutoGen** — multi-agent conversations with flexible human-in-the-loop patterns.",
        "4. **CrewAI** — role-based agent teams with a simple, opinionated API.",
        "5. **AgentFlow** — visual builder, managed runs and built-in observability.",
        "",
        "### Recommendation",
        "- Choose **LlamaIndex** for document-heavy RAG, **AutoGen/CrewAI** for multi-agent collaboration, and **AgentFlow** when teams need visual orchestration with monitoring.",
        "",
        "_Sources: 6 citations from official documentation and GitHub repositories._",
      ].join("\n"),
  },
  code: {
    inputs: ["Review PR #482: add rate limiting to the public API.", "Write unit tests for the billing service.", "Explain why the CI build is failing on main."],
    steps: [
      init(),
      { name: "Fetch pull request", kind: "tool", toolId: "github", seconds: 3.2, tokens: 920, input: "acme/web#482", output: "Fetched 14 changed files (+412 / −96 lines).", details: ["GET api.github.com/repos/acme/web/pulls/482 → 200"] },
      { name: "Run test suite", kind: "tool", toolId: "code-execution", seconds: 14.6, tokens: 640, input: "npm test -- --runInBand", output: "212 tests passed, 0 failed (coverage 87.4%).", details: ["Sandbox started (python 3.12, node 22)", "Executed in 13.9 s"] },
      { name: "Review changes", kind: "llm", seconds: 8.8, tokens: 5120, input: "Diff + test results + style guide", output: "Found 2 issues (1 security, 1 readability) and 3 suggestions." },
      { name: "Post review", kind: "tool", toolId: "github", seconds: 2.1, tokens: 380, input: "Review body with 5 comments", output: "Posted review with 5 inline comments." },
    ],
    output: () =>
      ["## Pull request review", "", "**Verdict:** Request changes", "", "1. **Security:** the rate-limit key uses the raw `X-Forwarded-For` header — trust only the first proxy hop.", "2. **Readability:** extract the window calculation into a helper with a unit test.", "", "### Suggestions", "- Add a `Retry-After` header to 429 responses.", "- Document the limits in the API reference.", "- Consider a per-key burst allowance.", "", "_All 212 tests passed._"].join("\n"),
  },
  data: {
    inputs: ["Analyze Q3 revenue by region and flag anomalies.", "Which features correlate with churn last quarter?", "Build a weekly active users report."],
    steps: [
      init(),
      { name: "Query warehouse", kind: "tool", toolId: "database-query", seconds: 9.4, tokens: 760, input: "SELECT region, SUM(amount) FROM orders WHERE quarter = 'Q3' GROUP BY region", output: "Returned 24 rows from analytics.orders.", details: ["Connected to Analytics warehouse (read-only)", "Query planned in 41 ms"] },
      { name: "Run analysis", kind: "tool", toolId: "code-execution", seconds: 6.8, tokens: 1240, input: "pandas notebook: anomaly detection (z-score > 2.5)", output: "Detected 2 anomalies: EMEA (−18%) and APAC (+31%)." },
      { name: "Generate report", kind: "transform", seconds: 4.5, tokens: 2380, input: "Analysis results", output: "Produced a 6-section report with 2 charts." },
    ],
    output: () =>
      ["## Q3 revenue by region", "", "**Total:** $4.82M (+9.4% QoQ)", "", "1. **North America** — $2.31M, in line with forecast.", "2. **EMEA** — $1.12M, **−18%** vs. forecast (anomaly).", "3. **APAC** — $0.94M, **+31%** vs. forecast (anomaly).", "4. **LATAM** — $0.45M, steady.", "", "### Next steps", "- Investigate the EMEA decline: two enterprise renewals slipped to Q4.", "- APAC growth is driven by the new self-serve plan."].join("\n"),
  },
  content: {
    inputs: ["Write a launch blog post for our new visual builder.", "Draft 5 LinkedIn posts about AI agents in customer support.", "Create a newsletter for October product updates."],
    steps: [
      init(),
      { name: "Research topic", kind: "tool", toolId: "web-search", seconds: 7.9, tokens: 1520, input: "{{input}}", output: "Collected 9 sources and 4 competitor examples." },
      { name: "Draft outline", kind: "llm", seconds: 6.4, tokens: 2210, input: "Sources + brand voice guide", output: "Outline with 5 sections and 2 headline options." },
      { name: "Write draft", kind: "llm", seconds: 21.6, tokens: 6840, input: "Approved outline", output: "Wrote 1,180-word draft." },
      { name: "Polish & format", kind: "transform", seconds: 7.2, tokens: 1960, input: "Draft", output: "Edited for tone, added meta description and CTA." },
    ],
    output: () =>
      ["## Introducing the AgentFlow visual builder", "", "**Headline options:**", "1. Build AI agents the way you think — visually", "2. From idea to production agent in minutes", "", "Today we're launching a drag-and-drop canvas for designing, testing and deploying AI agents…", "", "### What's inside", "- Visual workflows with tools, conditions and sub-agents", "- One-click test runs with step-by-step traces", "- Versioned deployments with built-in monitoring", "", "_1,180 words · reading time 5 min_"].join("\n"),
  },
  support: {
    inputs: ["Customer asks: how do I reset my API key?", "Ticket #8812: billing charged twice this month.", "How can I export my workflow runs?"],
    steps: [
      init(),
      { name: "Classify intent", kind: "llm", seconds: 1.8, tokens: 620, input: "{{input}}", output: "Intent: account_security (confidence 0.94)." },
      { name: "Search help center", kind: "tool", toolId: "web-search", seconds: 3.6, tokens: 980, input: "help-center: reset API key", output: "Found 3 matching articles." },
      { name: "Draft reply", kind: "llm", seconds: 5.1, tokens: 1430, input: "Articles + customer context", output: "Drafted a 4-step answer with a link to the docs." },
      { name: "Send email", kind: "tool", toolId: "send-email", seconds: 1.2, tokens: 120, input: "Reply draft", output: "Email queued for agent approval." },
    ],
    output: () =>
      ["Hi there,", "", "You can reset your API key in a few steps:", "", "1. Open **Settings → API keys**.", "2. Click **Regenerate** next to the key.", "3. Confirm, then copy the new key — it's shown only once.", "4. Update the key anywhere it's used (old keys stop working immediately).", "", "Let me know if anything else comes up!"].join("\n"),
  },
  email: {
    inputs: ["Triage this morning's inbox.", "Draft replies to all partner emails from today.", "Summarize unread emails from customers."],
    steps: [
      init(),
      { name: "Fetch inbox", kind: "tool", toolId: "api-request", seconds: 2.8, tokens: 340, input: "GET /mail/inbox?unread=true", output: "Fetched 23 unread emails." },
      { name: "Categorize", kind: "llm", seconds: 6.1, tokens: 2890, input: "23 emails", output: "Urgent 2 · Needs reply 7 · FYI 11 · Newsletters 3." },
      { name: "Draft replies", kind: "llm", seconds: 9.7, tokens: 3410, input: "7 emails needing replies", output: "Drafted 7 replies for review." },
    ],
    output: () => ["## Inbox triage", "", "- **Urgent (2):** contract renewal from Northwind, security questionnaire from Globex.", "- **Needs reply (7):** drafts ready for your review.", "- **FYI (11)** and **Newsletters (3)** archived.", "", "_7 drafts are waiting in your Drafts folder._"].join("\n"),
  },
  scraping: {
    inputs: ["Collect competitor pricing changes this week.", "Track new feature announcements from competitors.", "Check pricing pages of the top 5 competitors."],
    steps: [
      init(),
      { name: "Scrape pricing pages", kind: "tool", toolId: "web-scraping", seconds: 9.8, tokens: 1120, input: "5 competitor URLs", output: "Scraped 5 pricing pages (3 changed since last week).", details: ["Rendered JS for 2 pages", "Extracted 14 plan tiers"] },
      { name: "Compare with last week", kind: "llm", seconds: 5.9, tokens: 2210, input: "This week vs. last week snapshots", output: "Found 3 meaningful changes." },
      { name: "Email summary", kind: "tool", toolId: "send-email", seconds: 1.6, tokens: 240, input: "Summary", output: "Sent summary to growth@acme.com." },
    ],
    output: () => ["## Competitor pricing — weekly changes", "", "1. **Acme AI** raised Pro from $39 → $49/month.", "2. **FlowStack** added a free tier (1,000 runs/month).", "3. **AgentHub** removed annual discounts.", "", "_No changes detected for 2 competitors._"].join("\n"),
  },
  meeting: {
    inputs: ["Summarize the product sync transcript.", "Extract action items from the Q4 planning call."],
    steps: [
      init(),
      { name: "Parse transcript", kind: "tool", toolId: "file-processing", seconds: 3.1, tokens: 1840, input: "transcript.vtt (42 min)", output: "Parsed 612 utterances from 6 speakers." },
      { name: "Extract decisions", kind: "llm", seconds: 7.4, tokens: 3920, input: "Transcript", output: "Found 4 decisions and 7 action items." },
      { name: "Post to Slack", kind: "tool", toolId: "slack", seconds: 1.1, tokens: 160, input: "Summary", output: "Posted summary to #product." },
    ],
    output: () => ["## Product sync — summary", "", "### Decisions", "- Ship the visual builder GA on Nov 3.", "- Pause the mobile app redesign until Q1.", "", "### Action items", "1. **Maya** — finalize launch blog post (Oct 24)", "2. **Leo** — load-test the run queue (Oct 22)", "3. **Sam** — update pricing page copy (Oct 25)"].join("\n"),
  },
};

/** Which profile each seeded agent/workflow uses. */
export const sourceProfile: Record<string, keyof typeof profiles> = {
  "research-agent": "research",
  "code-assistant": "code",
  "data-analyst": "data",
  "sql-copilot": "data",
  "content-generator": "content",
  "customer-support": "support",
  "email-assistant": "email",
  "web-research": "scraping",
  "meeting-summarizer": "meeting",
  "research-workflow": "research",
  "content-pipeline": "content",
  "data-analysis": "data",
  "support-workflow": "support",
  "lead-generation": "scraping",
  "email-automation": "email",
  "weekly-digest": "meeting",
};

export function profileFor(sourceId: string): RunProfile {
  return profiles[sourceProfile[sourceId] ?? "research"] ?? profiles.research!;
}
