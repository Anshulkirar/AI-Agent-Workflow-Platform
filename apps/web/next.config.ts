import path from "node:path";
import type { NextConfig } from "next";

// The API gateway. Read when the config loads — for `next build` that means build time.
const apiUrl = process.env.API_URL ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  // Trace files from the monorepo root so workspace packages land in the standalone bundle.
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  // Keep the dev-only indicator clear of the sidebar's plan card (bottom-left).
  devIndicators: { position: "bottom-right" },
  // Browser → /api/* on this origin → gateway. Same-origin requests mean the session cookie is
  // first-party (SameSite=Lax works) and there is no CORS to configure.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
