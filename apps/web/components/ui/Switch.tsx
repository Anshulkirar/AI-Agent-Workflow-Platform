"use client";

import { cn } from "@/lib/cn";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: "sm" | "md";
  title?: string;
  className?: string;
};

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  size = "md",
  title,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "h-6 w-10" : "h-5 w-8",
        checked ? "bg-primary" : "bg-input",
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          size === "md" ? "size-5" : "size-4",
          checked
            ? size === "md"
              ? "translate-x-4.5"
              : "translate-x-3.5"
            : "translate-x-0.5",
        )}
      />
    </button>
  );
}
