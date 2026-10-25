import { migrate } from "../src/migrate.js";
import { testDatabaseUrl } from "./helpers.js";

/** Runs once before all test files: bring the test database's schema up to date. */
export default async function setup() {
  await migrate(testDatabaseUrl(), "up", () => {});
}
