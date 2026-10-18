"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Theme } from "./theme-script";
import { useTheme } from "./use-theme";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Segmented Light / Dark / System picker. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted p-1",
        className,
      )}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = theme === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setTheme(value, {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              });
            }}
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-ring",
              active
                ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={13} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
