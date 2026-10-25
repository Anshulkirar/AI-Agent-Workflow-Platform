"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type FocusEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
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
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { useBilling } from "@/lib/settings/store";
import { meterPercent, useUsage } from "@/lib/settings/usage";
import { DESKTOP_MEDIA_QUERY, useSidebarCollapsed } from "./use-sidebar";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Runs", href: "/runs", icon: Activity },
  { label: "Workflows", href: "/workflows", icon: Network },
  { label: "Tools", href: "/tools", icon: Wrench },
  { label: "Knowledge", href: "/knowledge", icon: Boxes },
  { label: "Integrations", href: "/integrations", icon: Command },
  { label: "Analytics", href: "/analytics", icon: ChartNoAxesCombined },
];

const secondaryNavigation: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings2 },
  { label: "Help & Docs", href: "/help", icon: CircleHelp },
];

/** Text that fades out (but stays in the accessibility tree) when collapsed. */
const fadeWhenCollapsed = "whitespace-nowrap transition-opacity duration-200 collapsed:opacity-0";

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

/**
 * Desktop: sticky column under the top navbar that collapses to icons.
 * Mobile: slide-out drawer opened from the navbar's menu button.
 */
export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const tooltip = useCollapsedTooltip();

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

  const renderItem = ({ label, href, icon: Icon }: NavItem) => {
    const active = isActive(href);

    return (
      <Link
        key={href}
        href={href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        {...tooltip.bind(label)}
        className={cn(
          "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors",
          active
            ? "bg-primary-soft text-primary-soft-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon
          size={18}
          strokeWidth={active ? 2.2 : 1.8}
          className={cn(
            "shrink-0 transition-transform group-hover:scale-110",
            active ? "text-primary" : "text-subtle-foreground group-hover:text-foreground",
          )}
        />
        <span className={fadeWhenCollapsed}>{label}</span>

        {label === "Runs" && (
          <>
            <span className={cn("ml-auto flex items-center gap-1 rounded-md bg-success-soft px-1.5 py-0.5 text-[10px] font-semibold text-success", fadeWhenCollapsed)}>
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              Live
            </span>
            {/* Collapsed: the Live badge shrinks to a dot on the icon. */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-6.5 top-2 size-2 rounded-full bg-success opacity-0 ring-2 ring-card transition-opacity collapsed:opacity-100"
            />
          </>
        )}
      </Link>
    );
  };

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
        id="app-sidebar"
        ref={tooltip.anchorRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-65 flex-col overflow-hidden border-r border-border bg-card transition-[translate,width] duration-300 ease-out",
          "lg:sticky lg:top-18 lg:bottom-auto lg:z-20 lg:h-[calc(100dvh-4.5rem)] lg:shrink-0 lg:self-start lg:translate-x-0 collapsed:w-18",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        {/* The top navbar carries the logo on desktop; the drawer needs its own. */}
        <div className="flex h-18 shrink-0 items-center justify-between px-6 lg:hidden">
          <Logo href="/" />
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div onScroll={tooltip.hide} className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-4 lg:pt-6">
          <div className="relative mb-3 h-4 px-3">
            <p className={cn("text-[10px] font-bold tracking-[0.16em] text-subtle-foreground", fadeWhenCollapsed)}>
              WORKSPACE
            </p>
            <span
              aria-hidden
              className="absolute left-2.5 top-1/2 h-px w-5 bg-border opacity-0 transition-opacity collapsed:opacity-100"
            />
          </div>

          <nav aria-label="Main navigation" className="space-y-1">
            {navigation.map(renderItem)}
          </nav>
        </div>

        <div className="space-y-3 p-4">
          <nav aria-label="Secondary navigation" className="space-y-1">
            {secondaryNavigation.map(renderItem)}
          </nav>

          <PlanUsage onNavigate={onClose} tooltip={tooltip} />
        </div>
      </aside>

      {tooltip.node}
    </>
  );
}

type CollapsedTooltip = ReturnType<typeof useCollapsedTooltip>;

/**
 * Labels for the icon-only sidebar. Portaled to <body> so the sidebar's
 * scroll container can't clip them.
 */
function useCollapsedTooltip() {
  const collapsed = useSidebarCollapsed();
  const anchorRef = useRef<HTMLElement>(null);
  const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);

  const show = (label: string) => (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    if (!collapsed || !window.matchMedia(DESKTOP_MEDIA_QUERY).matches) return;
    const item = event.currentTarget.getBoundingClientRect();
    const sidebar = anchorRef.current?.getBoundingClientRect();
    setTip({ label, top: item.top + item.height / 2, left: (sidebar?.right ?? item.right) + 8 });
  };
  const hide = () => setTip(null);

  const visible = collapsed ? tip : null;

  return {
    anchorRef,
    hide,
    bind: (label: string) => ({
      onMouseEnter: show(label),
      onMouseLeave: hide,
      onFocus: show(label),
      onBlur: hide,
    }),
    node:
      visible &&
      createPortal(
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-lg shadow-black/20 animate-fade-in"
          style={{ top: visible.top, left: visible.left }}
        >
          {visible.label}
        </div>,
        document.body,
      ),
  };
}

/** Plan + monthly run usage, from Settings → Billing & usage. */
function PlanUsage({ onNavigate, tooltip }: { onNavigate?: () => void; tooltip: CollapsedTooltip }) {
  const billing = useBilling();
  const usage = useUsage();
  const percent = meterPercent(usage.runs);
  const limit = usage.runs.limit;
  const planLabel = `${usage.plan.name} ${billing.status === "trialing" ? "trial" : "workspace"}`;
  const meterTone = percent >= 100 ? "bg-danger" : percent >= 80 ? "bg-amber-500" : "bg-primary";

  return (
    <>
      {/* Fixed width so the card doesn't reflow while the sidebar animates. */}
      <Link
        href="/settings/billing"
        onClick={onNavigate}
        className="block w-57 rounded-xl border border-border bg-muted/60 p-3.5 transition-colors hover:border-primary/40 collapsed:hidden"
      >
        <div className="mb-2.5 flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <span className="text-xs font-semibold">{planLabel}</span>
          {limit !== null && (
            <span className="ml-auto text-[10px] font-medium text-muted-foreground">{Math.round(percent)}%</span>
          )}
        </div>
        {limit !== null && (
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className={cn("h-full origin-left rounded-full animate-grow-x", meterTone)}
              style={{ width: `${Math.max(percent, 2)}%` }}
            />
          </div>
        )}
        <p className="mt-2.5 text-[11px] leading-4 text-muted-foreground">
          {usage.runs.used.toLocaleString("en-US")}
          {limit === null ? " runs this month." : ` of ${limit.toLocaleString("en-US")} monthly runs used.`}
        </p>
      </Link>

      <Link
        href="/settings/billing"
        aria-label={`${planLabel}${limit === null ? "" : `, ${Math.round(percent)}% of monthly runs used`}`}
        {...tooltip.bind(limit === null ? planLabel : `${planLabel} · ${Math.round(percent)}% used`)}
        className="relative hidden size-10 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-muted/60 transition-colors hover:border-primary/40 collapsed:flex"
      >
        <Sparkles size={15} className="text-primary" />
        {limit !== null && (
          <span className="h-1 w-5 overflow-hidden rounded-full bg-border">
            <span className={cn("block h-full rounded-full", meterTone)} style={{ width: `${Math.max(percent, 8)}%` }} />
          </span>
        )}
      </Link>
    </>
  );
}
