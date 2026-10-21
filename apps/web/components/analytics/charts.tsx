"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/* --------------------------------------------------------------------------
 * Scales
 * ------------------------------------------------------------------------ */

function niceStep(range: number, count: number) {
  const raw = range / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude;
}

/** Rounded axis domain + ticks. Zero-based for magnitudes; tight for rates. */
function scale(values: number[], zeroBased: boolean, count = 4) {
  const finite = values.filter(Number.isFinite);
  const max = Math.max(...finite, 0);
  const min = zeroBased ? 0 : Math.min(...finite, max);
  if (max <= min) {
    const top = max > 0 ? max * 1.2 : 1;
    return { lo: zeroBased ? 0 : Math.max(0, min - top * 0.1), hi: top, ticks: [top, 0] };
  }
  const step = niceStep(max - min, count);
  const lo = zeroBased ? 0 : Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = hi; value >= lo - step / 2; value -= step) ticks.push(Math.round(value * 1e6) / 1e6);
  return { lo, hi, ticks };
}

function xLabelIndices(length: number, max = 6) {
  if (length <= max) return Array.from({ length }, (_, index) => index);
  const every = Math.ceil((length - 1) / (max - 1));
  const indices: number[] = [];
  for (let index = length - 1; index >= 0; index -= every) indices.unshift(index);
  return indices;
}

/** Arrow keys / Home / End move the highlighted point. */
function useChartCursor(length: number) {
  const [active, setActive] = useState<number | null>(null);
  const onKeyDown = (event: KeyboardEvent) => {
    if (!length) return;
    const current = active ?? length - 1;
    const next =
      event.key === "ArrowRight" ? Math.min(length - 1, current + 1)
      : event.key === "ArrowLeft" ? Math.max(0, current - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? length - 1
      : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  };
  return { active, setActive, onKeyDown };
}

function YAxis({ ticks, format, height }: { ticks: number[]; format: (value: number) => string; height: number }) {
  return (
    <div aria-hidden className="flex w-11 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-subtle-foreground" style={{ height }}>
      {ticks.map((tick) => (
        <span key={tick} className="-translate-y-1/2 leading-none last:translate-y-0 first:translate-y-0">
          {format(tick)}
        </span>
      ))}
    </div>
  );
}

function Grid({ ticks, height }: { ticks: number[]; height: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height }}>
      {ticks.map((tick) => (
        <span key={tick} className="block border-t border-border/70 last:border-border" />
      ))}
    </div>
  );
}

function Tooltip({ index, length, children }: { index: number; length: number; children: ReactNode }) {
  const position = length === 1 ? 50 : (index / (length - 1)) * 100;
  const flip = position > 55;
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none absolute top-0 z-10 w-max min-w-40 max-w-56 rounded-xl border border-border bg-card p-3 text-xs shadow-xl shadow-black/10",
        flip ? "-translate-x-full -ml-3" : "ml-3",
      )}
      style={{ left: `${position}%` }}
    >
      {children}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------------------
 * Line / area chart
 * ------------------------------------------------------------------------ */

export type LineSeries = {
  key: string;
  label: string;
  color: string;
  values: number[];
  area?: boolean;
  /** Per-point labels in the tooltip (e.g. the matching previous-period date). */
  pointLabels?: string[];
  /** Thinner, recessive comparison line. */
  muted?: boolean;
};

export function LineChart({
  labels,
  series,
  format,
  axisFormat = format,
  height = 220,
  zeroBased = true,
  ariaLabel,
}: {
  labels: string[];
  series: LineSeries[];
  format: (value: number) => string;
  axisFormat?: (value: number) => string;
  height?: number;
  zeroBased?: boolean;
  ariaLabel: string;
}) {
  const gradientId = useId();
  const length = labels.length;
  const { lo, hi, ticks } = scale(series.flatMap((item) => item.values), zeroBased);
  const { active, setActive, onKeyDown } = useChartCursor(length);
  const x = (index: number) => (length === 1 ? 50 : (index / (length - 1)) * 100);
  const y = (value: number) => (1 - (value - lo) / (hi - lo || 1)) * 100;

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setActive(length === 1 ? 0 : Math.round(ratio * (length - 1)));
  };

  return (
    <div>
      <div className="flex gap-2">
        <YAxis ticks={ticks} format={axisFormat} height={height} />
        <div className="relative min-w-0 flex-1">
          <Grid ticks={ticks} height={height} />
          <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-x-0 top-0 w-full overflow-visible" style={{ height }}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[...series].reverse().map((item) => {
              const points = item.values.map((value, index) => `${x(index)},${y(value)}`);
              const line = `M${points.join(" L")}`;
              return (
                <g key={item.key} style={{ color: item.color }}>
                  {item.area && length > 1 && <path d={`${line} L${x(length - 1)},100 L${x(0)},100 Z`} fill={`url(#${gradientId})`} />}
                  <path
                    d={line}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={item.muted ? 1.5 : 2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={item.muted ? 0.75 : 1}
                  />
                </g>
              );
            })}
          </svg>

          {/* Hover + keyboard layer */}
          <div
            role="img"
            tabIndex={0}
            aria-label={`${ariaLabel}. Use left and right arrow keys to read values.`}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            onKeyDown={onKeyDown}
            className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ height }}
          >
            {active !== null && (
              <>
                <span aria-hidden className="absolute inset-y-0 w-px bg-border" style={{ left: `${x(active)}%` }} />
                {series.map((item) => (
                  <span
                    key={item.key}
                    aria-hidden
                    className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
                    style={{ left: `${x(active)}%`, top: `${y(item.values[active] ?? 0)}%`, background: item.color }}
                  />
                ))}
                <Tooltip index={active} length={length}>
                  <p className="font-semibold">{labels[active]}</p>
                  {series.map((item) => (
                    <p key={item.key} className="mt-1.5 flex items-center justify-between gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-sm" style={{ background: item.color }} />
                        {item.label}
                        {item.pointLabels?.[active] && <span className="text-subtle-foreground">({item.pointLabels[active]})</span>}
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">{format(item.values[active] ?? 0)}</span>
                    </p>
                  ))}
                </Tooltip>
              </>
            )}
          </div>

          <div aria-hidden className="relative mt-2 h-4">
            {xLabelIndices(length).map((index) => (
              <span
                key={index}
                className={cn(
                  "absolute whitespace-nowrap text-[10px] text-subtle-foreground",
                  index === 0 ? "" : index === length - 1 ? "-translate-x-full" : "-translate-x-1/2",
                )}
                style={{ left: `${x(index)}%` }}
              >
                {labels[index]}
              </span>
            ))}
          </div>
        </div>
      </div>
      <DataTable caption={ariaLabel} labels={labels} columns={series.map((item) => ({ label: item.label, values: item.values }))} format={format} />
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Stacked bar chart
 * ------------------------------------------------------------------------ */

export type BarSeries = { key: string; label: string; color: string; values: number[] };

export function StackedBarChart({
  labels,
  series,
  format,
  axisFormat = format,
  height = 220,
  ariaLabel,
}: {
  labels: string[];
  series: BarSeries[];
  format: (value: number) => string;
  axisFormat?: (value: number) => string;
  height?: number;
  ariaLabel: string;
}) {
  const length = labels.length;
  const totals = labels.map((_, index) => series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0));
  const { hi, ticks } = scale(totals, true);
  const { active, setActive, onKeyDown } = useChartCursor(length);
  const dense = length > 30;

  return (
    <div>
      <div className="flex gap-2">
        <YAxis ticks={ticks} format={axisFormat} height={height} />
        <div className="relative min-w-0 flex-1">
          <Grid ticks={ticks} height={height} />
          <div
            role="img"
            tabIndex={0}
            aria-label={`${ariaLabel}. Use left and right arrow keys to read values.`}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
            className="relative flex items-stretch rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ height }}
          >
            {labels.map((label, index) => (
              <div
                key={`${label}-${index}`}
                onPointerEnter={() => setActive(index)}
                className={cn(
                  "flex min-w-0 flex-1 flex-col-reverse items-center gap-[2px] rounded-sm transition-[opacity,background-color] duration-150",
                  dense ? "px-[1px]" : "px-0.5 sm:px-1.5",
                  active === index && "bg-muted/80",
                  active !== null && active !== index && "opacity-50",
                )}
              >
                {series.map((item, seriesIndex) => {
                  const value = item.values[index] ?? 0;
                  if (!value) return null;
                  const top = series.slice(seriesIndex + 1).every((rest) => !(rest.values[index] ?? 0));
                  return (
                    <span
                      key={item.key}
                      className={cn("w-full max-w-4 shrink-0 origin-bottom animate-grow-y", top && "rounded-t-[4px]")}
                      style={{ height: `${(value / hi) * 100}%`, background: item.color, animationDelay: `${Math.min(index, 40) * 10}ms` }}
                    />
                  );
                })}
              </div>
            ))}

            {active !== null && (
              <Tooltip index={active} length={length}>
                <p className="font-semibold">{labels[active]}</p>
                {[...series].reverse().map((item) => (
                  <p key={item.key} className="mt-1.5 flex items-center justify-between gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-sm" style={{ background: item.color }} />
                      {item.label}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">{format(item.values[active] ?? 0)}</span>
                  </p>
                ))}
                {series.length > 1 && (
                  <p className="mt-1.5 flex justify-between gap-4 border-t border-border pt-1.5 text-muted-foreground">
                    Total <span className="font-semibold tabular-nums text-foreground">{format(totals[active] ?? 0)}</span>
                  </p>
                )}
              </Tooltip>
            )}
          </div>
          <div aria-hidden className="mt-2 flex">
            {labels.map((label, index) => (
              <span key={`${label}-${index}`} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-[10px] text-subtle-foreground">
                {xLabelIndices(length, 7).includes(index) ? label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <DataTable caption={ariaLabel} labels={labels} columns={series.map((item) => ({ label: item.label, values: item.values }))} format={format} />
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Donut + legend (part-to-whole, ≤ 6 segments)
 * ------------------------------------------------------------------------ */

export type DonutItem = { id: string; label: string; value: number; color: string; hint?: string };

export function DonutChart({
  items,
  format,
  centerLabel,
  ariaLabel,
}: {
  items: DonutItem[];
  format: (value: number) => string;
  centerLabel: string;
  ariaLabel: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const size = 160;
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = items.length > 1 ? 2.5 : 0;
  let offset = 0;
  const focused = items.find((item) => item.id === active);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={ariaLabel}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
          {items.map((item) => {
            const length = (item.value / total) * circumference;
            const segment = (
              <circle
                key={item.id}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={active === item.id ? stroke + 4 : stroke}
                strokeDasharray={`${Math.max(0, length - gap)} ${circumference}`}
                strokeDashoffset={-offset}
                opacity={active && active !== item.id ? 0.35 : 1}
                className="cursor-pointer transition-[opacity,stroke-width] duration-200"
                onPointerEnter={() => setActive(item.id)}
                onPointerLeave={() => setActive(null)}
              />
            );
            offset += length;
            return segment;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-bold tabular-nums">{format(focused?.value ?? total)}</span>
          <span className="max-w-24 truncate text-[11px] text-muted-foreground">{focused?.label ?? centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onPointerEnter={() => setActive(item.id)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(item.id)}
              onBlur={() => setActive(null)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                active === item.id ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: item.color }} />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-foreground">{item.label}</span>
                {item.hint && <span className="ml-1.5 text-muted-foreground">{item.hint}</span>}
              </span>
              <span className="font-semibold tabular-nums">{format(item.value)}</span>
              <span className="w-10 text-right tabular-nums text-muted-foreground">{Math.round((item.value / total) * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Sparkline
 * ------------------------------------------------------------------------ */

export function Sparkline({ values, color = "var(--primary)", className }: { values: number[]; color?: string; className?: string }) {
  const gradientId = useId();
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${30 - ((value - min) / (max - min || 1)) * 26 - 2}`);
  return (
    <svg aria-hidden viewBox="0 0 100 30" preserveAspectRatio="none" className={cn("h-8 w-full", className)} style={{ color }}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M${points.join(" L")} L100,30 L0,30 Z`} fill={`url(#${gradientId})`} />
      <path d={`M${points.join(" L")}`} fill="none" stroke="currentColor" strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/* --------------------------------------------------------------------------
 * Screen-reader table
 * ------------------------------------------------------------------------ */

function DataTable({
  caption,
  labels,
  columns,
  format,
}: {
  caption: string;
  labels: string[];
  columns: { label: string; values: number[] }[];
  format: (value: number) => string;
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          {columns.map((column) => (
            <th key={column.label} scope="col">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {labels.map((label, index) => (
          <tr key={`${label}-${index}`}>
            <th scope="row">{label}</th>
            {columns.map((column) => (
              <td key={column.label}>{format(column.values[index] ?? 0)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Pulsing placeholder used while a (simulated) query is in flight. */
export function ChartSkeleton({ height = 220, className }: { height?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-end gap-1.5 px-12", className)} style={{ height }}>
      {Array.from({ length: 18 }, (_, index) => (
        <span key={index} className="flex-1 animate-pulse rounded-t-md bg-muted" style={{ height: `${30 + ((index * 37) % 60)}%`, animationDelay: `${index * 40}ms` }} />
      ))}
    </div>
  );
}
