import { migrate } from "../src/migrate.js";
import { testDatabaseUrl } from "./helpers.js";
export default async function setup() {
  await migrate(testDatabaseUrl(), "up", () => {});
}
