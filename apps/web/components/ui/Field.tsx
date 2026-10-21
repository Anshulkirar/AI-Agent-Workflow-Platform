import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl border border-input bg-card text-sm outline-none transition placeholder:text-subtle-foreground focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15";

export const inputClass = cn(control, "h-10 px-3.5");
export const textareaClass = cn(control, "resize-y px-3.5 py-2.5 leading-6");

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Label + control + hint/error, consistently spaced. */
export function Field({ label, htmlFor, hint, error, aside, className, children }: FieldProps) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger animate-fade-in">
          <CircleAlert size={13} className="shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select {...props} className={cn(inputClass, "appearance-none pr-9")}>
        {children}
      </select>
      <ChevronDown
        size={15}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle-foreground"
      />
    </div>
  );
}

/** Range input with a value read-out. */
export function Slider({
  id,
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => String(v),
  marks,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  marks?: [string, string, string?];
}) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-[var(--primary)]"
          style={{
            background: `linear-gradient(to right, var(--primary) ${percent}%, var(--input) ${percent}%)`,
          }}
        />
        <output
          htmlFor={id}
          className="w-14 rounded-lg border border-border bg-muted px-2 py-1 text-center text-xs font-semibold tabular-nums"
        >
          {format(value)}
        </output>
      </div>
      {marks && (
        <div className="mt-1.5 flex justify-between pr-[68px] text-[10px] text-subtle-foreground">
          {marks.map((mark) => (mark ? <span key={mark}>{mark}</span> : null))}
        </div>
      )}
    </div>
  );
}
