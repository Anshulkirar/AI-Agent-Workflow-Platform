import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { sidebarInitScript } from "@/components/dashboard/sidebar-script";
import { themeInitScript } from "@/components/theme/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AgentFlow — Build, orchestrate and deploy AI agents",
    template: "%s · AgentFlow",
  },
  description:
    "Create powerful AI agents, connect tools, automate workflows, and run them at scale — all in one platform.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#090a13" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The theme and sidebar scripts mutate <html> before hydration, hence the suppression.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript + sidebarInitScript }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
