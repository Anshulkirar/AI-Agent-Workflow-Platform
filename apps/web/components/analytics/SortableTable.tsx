"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  /** Sort value; columns without one aren't sortable. */
  sortValue?: (row: T) => number | string;
  render: (row: T) => ReactNode;
  className?: string;
};

/** Table with clickable column headers (desc first for numbers). */
export function SortableTable<T extends { id: string }>({
  rows,
  columns,
  caption,
  initialSort,
  emptyMessage = "No data for this period.",
}: {
  rows: T[];
  columns: Column<T>[];
  caption: string;
  initialSort: string;
  emptyMessage?: string;
}) {
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" }>({ key: initialSort, direction: "desc" });
  const column = columns.find((item) => item.key === sort.key);
  const sorted = column?.sortValue
    ? [...rows].sort((a, b) => {
        const left = column.sortValue!(a);
        const right = column.sortValue!(b);
        const order = typeof left === "string" ? left.localeCompare(String(right)) : left - Number(right);
        return sort.direction === "asc" ? order : -order;
      })
    : rows;

  const toggle = (item: Column<T>) =>
    setSort((current) =>
      current.key === item.key
        ? { key: item.key, direction: current.direction === "desc" ? "asc" : "desc" }
        : { key: item.key, direction: item.align === "right" ? "desc" : "asc" },
    );

  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-y border-border bg-muted/50 text-xs text-muted-foreground">
            {columns.map((item) => {
              const active = sort.key === item.key;
              const Icon = active ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
              return (
                <th
                  key={item.key}
                  scope="col"
                  aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                  className={cn("px-3 py-2.5 font-medium first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6", item.align === "right" ? "text-right" : "text-left")}
                >
                  {item.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded transition-colors hover:text-foreground",
                        active && "text-foreground",
                        item.align === "right" && "flex-row-reverse",
                      )}
                    >
                      {item.label}
                      <Icon size={12} className={active ? "text-primary" : "text-subtle-foreground"} />
                    </button>
                  ) : (
                    item.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-muted/40">
                {columns.map((item) => (
                  <td
                    key={item.key}
                    className={cn(
                      "px-3 py-3 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6",
                      item.align === "right" && "text-right tabular-nums",
                      item.className,
                    )}
                  >
                    {item.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
