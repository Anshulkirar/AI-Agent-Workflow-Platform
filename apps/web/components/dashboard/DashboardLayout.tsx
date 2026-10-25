"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/Toaster";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { toggleSidebarCollapsed, useIsDesktop, useSidebarCollapsed } from "./use-sidebar";

/**
 * App shell shared by every page under app/(dashboard): a full-width navbar
 * on top, with the sidebar and page content side by side beneath it.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const collapsed = useSidebarCollapsed();
  // The drawer is mobile-only; ignore it if the viewport grows past `lg`.
  const sidebarOpen = drawerOpen && !isDesktop;
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className="min-h-screen bg-background">
      <Topbar
        menuExpanded={isDesktop ? !collapsed : sidebarOpen}
        onMenuClick={() => (isDesktop ? toggleSidebarCollapsed() : setDrawerOpen(true))}
      />

      <div className="lg:flex">
        <Sidebar open={sidebarOpen} onClose={closeDrawer} />

        <main className="w-full min-w-0 flex-1">
          <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
