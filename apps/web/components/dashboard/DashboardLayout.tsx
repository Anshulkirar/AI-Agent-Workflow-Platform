"use client";

import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/Toaster";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/** App shell shared by every page under app/(dashboard). */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background lg:flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="w-full flex-1">
          <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
