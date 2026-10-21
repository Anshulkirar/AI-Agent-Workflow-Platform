"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  Bell,
  Building2,
  ChartNoAxesCombined,
  Command,
  CreditCard,
  KeyRound,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkspaceSettings } from "@/lib/settings/store";

const groups = [
  {
    label: "Account",
    items: [
      { label: "Profile", href: "/settings/profile", icon: UserRound },
      { label: "Notifications", href: "/settings/notifications", icon: Bell },
      { label: "Security", href: "/settings/security", icon: ShieldCheck },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "General", href: "/settings/workspace", icon: Building2 },
      { label: "Team", href: "/settings/team", icon: Users },
      { label: "API keys", href: "/settings/api-keys", icon: KeyRound },
      { label: "Billing & usage", href: "/settings/billing", icon: CreditCard },
    ],
  },
  {
    label: "Elsewhere",
    items: [
      { label: "Integrations", href: "/integrations", icon: Command, external: true },
      { label: "Analytics", href: "/analytics", icon: ChartNoAxesCombined, external: true },
    ],
  },
];

export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const workspace = useWorkspaceSettings();

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Settings</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Manage your account and the <span className="font-medium text-foreground">{workspace.name}</span> workspace.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <nav aria-label="Settings" className="lg:sticky lg:top-24 lg:self-start">
          {/* Mobile: one scrollable row of pills. Desktop: grouped list. */}
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:block lg:space-y-5 lg:overflow-visible lg:px-0 lg:pb-0">
            {groups.map((group) => (
              <div key={group.label} className="contents lg:block">
                <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-subtle-foreground lg:block">{group.label}</p>
                <ul className="contents lg:block lg:space-y-0.5">
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    const external = "external" in item;
                    return (
                      <li key={item.href} className="shrink-0">
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group flex items-center gap-2.5 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium transition-colors lg:border-transparent",
                            active
                              ? "border-primary/30 bg-primary-soft text-primary-soft-foreground"
                              : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground lg:bg-transparent",
                          )}
                        >
                          <item.icon size={16} className={active ? "text-primary" : "text-subtle-foreground group-hover:text-foreground"} />
                          {item.label}
                          {external && <ArrowUpRight size={13} className="ml-auto text-subtle-foreground" aria-label="(opens section)" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </div>
  );
}
