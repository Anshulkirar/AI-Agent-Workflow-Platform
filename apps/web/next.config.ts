import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Trace files from the monorepo root so workspace packages land in the standalone bundle.
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
};

export default nextConfig;
