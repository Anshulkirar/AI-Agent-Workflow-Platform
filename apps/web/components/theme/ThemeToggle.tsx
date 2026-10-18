"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme } from "./use-theme";

/**
 * Animated light/dark switch. Visual state is driven by the `dark` class on
 * <html> (set before paint), so it renders correctly on first load.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        toggleTheme({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }}
      className={cn(
        "group relative inline-flex h-8 w-15 shrink-0 items-center rounded-full border border-border bg-muted p-0.75 transition-colors duration-300 hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {/* Track icons */}
      <Sun
        aria-hidden
        className="absolute left-2.25 size-3.5 text-amber-500 opacity-0 transition-opacity duration-300 dark:opacity-60"
      />
      <Moon
        aria-hidden
        className="absolute right-2.25 size-3.5 text-subtle-foreground opacity-100 transition-opacity duration-300 dark:opacity-0"
      />

      {/* Thumb */}
      <span className="relative flex size-6 items-center justify-center overflow-hidden rounded-full bg-white shadow-md shadow-black/10 ring-1 ring-black/5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active:scale-90 dark:translate-x-6.5 dark:bg-primary dark:shadow-primary/40 dark:ring-white/10">
        <Sun
          aria-hidden
          className="absolute size-3.5 text-amber-500 transition-all duration-300 dark:-rotate-90 dark:scale-0"
        />
        <Moon
          aria-hidden
          className="absolute size-3.5 rotate-90 scale-0 text-white transition-all duration-300 dark:rotate-0 dark:scale-100"
        />
      </span>
    </button>
  );
}
