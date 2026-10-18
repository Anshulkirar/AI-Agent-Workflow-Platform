"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { runActivity } from "@/lib/mock-data";
import { Card, CardHeader } from "./Card";

const ranges = [
  { days: 7, label: "7D" },
  { days: 14, label: "14D" },
  { days: 30, label: "30D" },
];

// Rounds up to a multiple of 20 so the quarter ticks stay whole numbers.
function niceMax(value: number) {
  return Math.max(20, Math.ceil(value / 20) * 20);
}

export function RunActivityChart() {
  const [days, setDays] = useState(7);
  const [hovered, setHovered] = useState<number | null>(null);

  const data = runActivity.slice(-days);
  const max = niceMax(Math.max(...data.map((point) => point.success)));
  const ticks = [max, (max * 3) / 4, max / 2, max / 4, 0];
  const labelEvery = days === 7 ? 1 : days === 14 ? 2 : 5;

  const totalSuccess = data.reduce((sum, point) => sum + point.success, 0);
  const totalFailed = data.reduce((sum, point) => sum + point.failed, 0);
  const total = totalSuccess + totalFailed;
  const hoveredPoint = hovered === null ? null : data[hovered];

  return (
    <Card>
      <CardHeader
        title="Run Activity"
        subtitle={`${total.toLocaleString("en-US")} runs · ${((totalSuccess / total) * 100).toFixed(1)}% successful`}
        action={
          <div
            role="radiogroup"
            aria-label="Date range"
            className="flex rounded-lg border border-border bg-muted p-0.5"
          >
            {ranges.map((range) => (
              <button
                key={range.days}
                type="button"
                role="radio"
                aria-checked={days === range.days}
                aria-label={`Last ${range.days} days`}
                onClick={() => {
                  setDays(range.days);
                  setHovered(null);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
                  days === range.days
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-success" />
          Success
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-failed" />
          Failed
        </span>
      </div>

      <div className="flex gap-2">
        {/* Y axis */}
        <div aria-hidden className="flex h-48 w-6 flex-col justify-between text-right text-[10px] tabular-nums text-subtle-foreground">
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 leading-none last:translate-y-0">
              {tick}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Grid */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex h-48 flex-col justify-between">
            {ticks.map((tick) => (
              <span
                key={tick}
                className={cn(
                  "block border-t",
                  tick === 0 ? "border-border" : "border-dashed border-border/70",
                )}
              />
            ))}
          </div>

          {/* Bars */}
          <div
            key={days}
            className="relative flex h-48 items-stretch"
            onMouseLeave={() => setHovered(null)}
          >
            {data.map((point, index) => (
              <div
                key={point.date}
                tabIndex={0}
                aria-label={`${point.label}: ${point.success} successful, ${point.failed} failed`}
                onMouseEnter={() => setHovered(index)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                className={cn(
                  "flex min-w-0 flex-1 items-end justify-center gap-0.5 rounded-md px-0.75 outline-none sm:px-1 transition-[opacity,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-ring",
                  hovered === index && "bg-muted/80",
                  hovered !== null && hovered !== index && "opacity-40",
                )}
              >
                <span
                  className="w-full max-w-3.5 origin-bottom rounded-t-sm bg-chart-success animate-grow-y"
                  style={{
                    height: `${(point.success / max) * 100}%`,
                    animationDelay: `${index * (days === 30 ? 12 : 35)}ms`,
                  }}
                />
                <span
                  className="w-full max-w-3.5 origin-bottom rounded-t-sm bg-chart-failed animate-grow-y"
                  style={{
                    height: `${(point.failed / max) * 100}%`,
                    animationDelay: `${index * (days === 30 ? 12 : 35) + 60}ms`,
                  }}
                />
              </div>
            ))}

            {hoveredPoint && hovered !== null && (
              <div
                role="status"
                className={cn(
                  "pointer-events-none absolute top-0 z-10 w-36 rounded-xl border border-border bg-card p-3 text-xs shadow-xl shadow-black/10 animate-fade-in",
                  // Sit beside the hovered day, flipping sides past the midpoint.
                  hovered >= data.length / 2 ? "-translate-x-full -ml-2" : "ml-2",
                )}
                style={{
                  left: `${((hovered >= data.length / 2 ? hovered : hovered + 1) / data.length) * 100}%`,
                }}
              >
                <p className="font-semibold">{hoveredPoint.label}</p>
                <p className="mt-2 flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-sm bg-chart-success" />
                    Success
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {hoveredPoint.success}
                  </span>
                </p>
                <p className="mt-1 flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-sm bg-chart-failed" />
                    Failed
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {hoveredPoint.failed}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* X axis */}
          <div aria-hidden className="mt-2 flex">
            {data.map((point, index) => (
              <span
                key={point.date}
                className="min-w-0 flex-1 text-center text-[10px] text-subtle-foreground"
              >
                {(data.length - 1 - index) % labelEvery === 0
                  ? days === 7
                    ? point.label
                    : point.label.replace(/^\w+ /, "")
                  : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Daily agent runs, last {days} days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Successful</th>
            <th scope="col">Failed</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.date}>
              <th scope="row">{point.label}</th>
              <td>{point.success}</td>
              <td>{point.failed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
