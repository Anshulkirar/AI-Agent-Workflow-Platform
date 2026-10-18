"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  labelAction?: ReactNode;
};

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField(
    { label, error, icon, trailing, labelAction, id, className, ...props },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className={className}>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor={inputId} className="text-sm font-medium">
            {label}
          </label>
          {labelAction}
        </div>

        <div
          className={cn(
            "flex h-11 items-center gap-2.5 rounded-xl border bg-card px-3.5 transition-all focus-within:ring-4",
            error
              ? "border-danger focus-within:ring-danger/15"
              : "border-input focus-within:border-primary focus-within:ring-primary/15",
          )}
        >
          {icon && (
            <span className={cn("shrink-0", error ? "text-danger" : "text-subtle-foreground")}>
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
            {...props}
          />
          {trailing}
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger animate-fade-in"
          >
            <CircleAlert className="size-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  },
);
