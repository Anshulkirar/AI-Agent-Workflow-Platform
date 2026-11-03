import { createPool } from "@agentflow/db";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

export function testDatabaseUrl() {
  const url = process.env.WORKFLOW_TEST_DATABASE_URL;
  if (!url)
    throw new Error(
      "WORKFLOW_TEST_DATABASE_URL is not set — see .env.example.",
    );
  if (!new URL(url).pathname.endsWith("_test"))
    throw new Error(
      "WORKFLOW_TEST_DATABASE_URL must point to a *_test database.",
    );
  return url;
}
export async function setupTestApp() {
  const config = loadConfig({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    WORKFLOW_DATABASE_URL: testDatabaseUrl(),
  });
  const db = createPool(config.WORKFLOW_DATABASE_URL, { max: 4 });
  const app = buildApp({ config, db });
  await app.ready();
  return {
    app,
    db,
    reset: () => db.query("TRUNCATE workflows CASCADE"),
    close: async () => {
      await app.close();
      await db.end();
    },
  };
}
export const headers = (userId = "11111111-1111-4111-8111-111111111111") => ({
  "x-user-id": userId,
});
export const graph = {
  nodes: [
    {
      id: "input",
      position: { x: 0, y: 0 },
      data: { kind: "input", label: "User input", config: {} },
    },
    {
      id: "output",
      position: { x: 300, y: 0 },
      data: { kind: "output", label: "Output", config: {} },
    },
  ],
  edges: [{ id: "edge-1", source: "input", target: "output" }],
};
export const workflow = {
  name: "Support triage",
  description: "Triage requests",
  icon: "bot",
  color: "blue",
  status: "draft",
  trigger: { type: "manual" },
  tags: ["support"],
  graph,
  settings: {
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxTokens: 1000,
    topP: 1,
    streaming: true,
    memory: false,
    responseFormat: "text",
  },
};
