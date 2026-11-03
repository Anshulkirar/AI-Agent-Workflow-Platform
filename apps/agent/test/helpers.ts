import { createPool } from "@agentflow/db";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
export function testDatabaseUrl() {
  const url = process.env.AGENT_TEST_DATABASE_URL;
  if (!url)
    throw new Error("AGENT_TEST_DATABASE_URL is not set — see .env.example.");
  if (!new URL(url).pathname.endsWith("_test"))
    throw new Error("AGENT_TEST_DATABASE_URL must point to a *_test database.");
  return url;
}
export async function setupTestApp() {
  const config = loadConfig({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    AGENT_DATABASE_URL: testDatabaseUrl(),
  });
  const db = createPool(config.AGENT_DATABASE_URL, { max: 4 });
  const app = buildApp({ config, db });
  await app.ready();
  return {
    app,
    db,
    reset: () => db.query("TRUNCATE agents CASCADE"),
    close: async () => {
      await app.close();
      await db.end();
    },
  };
}
export const headers = (userId = "11111111-1111-4111-8111-111111111111") => ({
  "x-user-id": userId,
});
export const agent = {
  name: "Support agent",
  description: "Answers support questions",
  icon: "headset",
  color: "blue",
  status: "draft",
  instructions: "Be helpful and concise.",
  tools: ["support-search"],
  knowledge: ["docs:faq"],
  settings: {
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxTokens: 1000,
    topP: 1,
    streaming: true,
    memory: true,
    responseFormat: "text",
  },
};
