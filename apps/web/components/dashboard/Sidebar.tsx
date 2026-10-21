"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Activity,
  Bot,
  Boxes,
  ChartNoAxesCombined,
  CircleHelp,
  Command,
  LayoutDashboard,
  Network,
  Settings2,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { useBilling } from "@/lib/settings/store";
import { meterPercent, useUsage } from "@/lib/settings/usage";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Runs", href: "/runs", icon: Activity },
  { label: "Workflows", href: "/workflows", icon: Network },
  { label: "Tools", href: "/tools", icon: Wrench },
  { label: "Knowledge", href: "/knowledge", icon: Boxes },
  { label: "Integrations", href: "/integrations", icon: Command },
  { label: "Analytics", href: "/analytics", icon: ChartNoAxesCombined },
];

const secondaryNavigation = [
  { label: "Settings", href: "/settings", icon: Settings2 },
  { label: "Help & Docs", href: "/help", icon: CircleHelp },
];

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Close on Escape and lock page scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (active: boolean) =>
    cn(
      "group flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all",
      active
        ? "bg-primary-soft text-primary-soft-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <>
      <button
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-65 flex-col border-r border-border bg-card transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        <div className="flex h-18 shrink-0 items-center justify-between px-6">
          <Logo href="/" />
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4">
          <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.16em] text-subtle-foreground">
            WORKSPACE
          </p>

          <nav aria-label="Main navigation" className="space-y-1">
            {navigation.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={linkClass(active)}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={cn(
                      "transition-transform group-hover:scale-110",
                      active ? "text-primary" : "text-subtle-foreground group-hover:text-foreground",
                    )}
                  />
                  <span>{label}</span>

                  {label === "Runs" && (
                    <span className="ml-auto flex items-center gap-1 rounded-md bg-success-soft px-1.5 py-0.5 text-[10px] font-semibold text-success">
                      <span className="size-1.5 animate-pulse rounded-full bg-success" />
                      Live
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 p-4">
          <nav aria-label="Secondary navigation" className="space-y-1">
            {secondaryNavigation.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={linkClass(isActive(href))}
              >
                <Icon size={18} className="text-subtle-foreground group-hover:text-foreground" />
                {label}
              </Link>
            ))}
          </nav>

          <ThemeSwitcher />

          <PlanUsage onNavigate={onClose} />
        </div>
      </aside>
    </>
  );
}

/** Plan + monthly run usage, from Settings → Billing & usage. */
function PlanUsage({ onNavigate }: { onNavigate?: () => void }) {
  const billing = useBilling();
  const usage = useUsage();
  const percent = meterPercent(usage.runs);
  const limit = usage.runs.limit;

  return (
    <Link
      href="/settings/billing"
      onClick={onNavigate}
      className="block rounded-xl border border-border bg-muted/60 p-3.5 transition-colors hover:border-primary/40"
    >
      <div className="mb-2.5 flex items-center gap-2">
        <Sparkles size={16} className="text-primary" />
        <span className="text-xs font-semibold">
          {usage.plan.name} {billing.status === "trialing" ? "trial" : "workspace"}
        </span>
        {limit !== null && (
          <span className="ml-auto text-[10px] font-medium text-muted-foreground">{Math.round(percent)}%</span>
        )}
      </div>
      {limit !== null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className={cn("h-full origin-left rounded-full animate-grow-x", percent >= 100 ? "bg-danger" : percent >= 80 ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>
      )}
      <p className="mt-2.5 text-[11px] leading-4 text-muted-foreground">
        {usage.runs.used.toLocaleString("en-US")}
        {limit === null ? " runs this month." : ` of ${limit.toLocaleString("en-US")} monthly runs used.`}
      </p>
    </Link>
  );
}
