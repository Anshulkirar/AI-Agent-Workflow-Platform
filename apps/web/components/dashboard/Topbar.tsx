"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  CreditCard,
  LogOut,
  Menu,
  Search,
  Settings2,
  UserRound,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { UserAvatar } from "@/components/settings/SettingsKit";
import { authClient } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/current-user";
import { plansById } from "@/lib/settings/plans";
import { useBilling, useProfile } from "@/lib/settings/store";

const pageNames: Record<string, string> = {
  dashboard: "Dashboard",
  agents: "Agents",
  runs: "Runs",
  workflows: "Workflows",
  tools: "Tools",
  knowledge: "Knowledge",
  integrations: "Integrations",
  analytics: "Analytics",
  settings: "Settings",
  help: "Help & Docs",
};

type TopbarProps = {
  /** Desktop: sidebar is expanded. Mobile: drawer is open. */
  menuExpanded?: boolean;
  onMenuClick?: () => void;
};

export default function Topbar({ menuExpanded = false, onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const user = useCurrentUser();
  const profile = useProfile();
  const [signingOut, setSigningOut] = useState(false);
  const billing = useBilling();
  const planLabel = `${plansById[billing.planId].name} ${billing.status === "trialing" ? "trial" : "plan"}`;
  const menuRef = useRef<HTMLDivElement>(null);

  const signOut = async () => {
    setSigningOut(true);
    // Leave even if the request fails: the server clears the cookie whenever it can be reached.
    await authClient.logout().catch(() => undefined);
    router.replace("/login");
    router.refresh();
  };

  const segments = pathname.split("/").filter(Boolean);
  const currentPage = pageNames[segments[0] ?? ""] ?? "Dashboard";

  // "/" focuses search, like the keyboard hint suggests.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    // Spans the full width above the sidebar, so collapsing it never shifts the navbar.
    <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-border bg-background/80 pl-2.5 pr-4 backdrop-blur-xl sm:pl-4.5 sm:pr-6 lg:pr-8">
      <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:w-65">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Toggle navigation"
          aria-controls="app-sidebar"
          aria-expanded={menuExpanded}
          title={menuExpanded ? "Collapse sidebar" : "Expand sidebar"}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Menu size={20} />
        </button>

        <Logo href="/dashboard" className="max-sm:[&>span]:hidden" />
      </div>

      <div className="flex min-w-0 flex-1 items-center">
        <span className="sr-only">{currentPage}</span>

        <label className="flex h-10 w-full max-w-md items-center gap-2 rounded-xl border border-border bg-card px-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
          <Search size={16} className="shrink-0 text-subtle-foreground" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search agents, runs, tools..."
            aria-label="Search AgentFlow"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
          />
          <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline">
            /
          </kbd>
        </label>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle className="max-sm:hidden" />

        <button
          type="button"
          aria-label="Notifications (3 unread)"
          className="relative rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <Bell size={17} />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-card" />
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2.5 rounded-xl p-1 text-left transition hover:bg-muted sm:pr-2"
          >
            <UserAvatar name={user.name} email={user.email} color={profile.avatarColor} />
            <span className="hidden sm:block">
              <span className="block max-w-32 truncate text-sm font-semibold leading-tight">
                {user.name}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {planLabel}
              </span>
            </span>
            <ChevronDown
              size={15}
              className={cn(
                "hidden text-muted-foreground transition-transform sm:block",
                menuOpen && "rotate-180",
              )}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-black/10 animate-fade-in"
            >
              <div className="border-b border-border px-3 pb-2.5 pt-1.5">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 sm:hidden">
                <span className="text-sm text-muted-foreground">Dark mode</span>
                <ThemeToggle />
              </div>
              {[
                { label: "Profile", href: "/settings/profile", icon: UserRound },
                { label: "Settings", href: "/settings/workspace", icon: Settings2 },
                { label: "Billing & usage", href: "/settings/billing", icon: CreditCard },
              ].map((item) => (
                <Link
                  key={item.label}
                  role="menuitem"
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <item.icon size={15} />
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                disabled={signingOut}
                className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-soft disabled:opacity-60"
              >
                <LogOut size={15} />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
