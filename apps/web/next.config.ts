import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Trace files from the monorepo root so workspace packages land in the standalone bundle.
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  // Keep the dev-only indicator clear of the sidebar's plan card (bottom-left).
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
