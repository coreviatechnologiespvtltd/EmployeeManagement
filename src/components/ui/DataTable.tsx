import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  /** Hidden below the given breakpoint to keep tables readable on mobile. */
  hideBelow?: "sm" | "md" | "lg" | "xl";
}

const hideClasses = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  caption?: string;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

/**
 * Horizontally scrollable on small screens rather than breaking the layout.
 * `min-w` guarantees the scroll container engages instead of squashing cells.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  emptyMessage = "No records found.",
  className,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "cv-scrollbar-thin overflow-x-auto rounded-card border border-ink-100 bg-white shadow-card",
        className,
      )}
    >
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-ink-100 bg-surface-subtle">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "whitespace-nowrap px-5 py-3 text-xs font-semibold tracking-wide text-ink-500 uppercase",
                  column.headerClassName,
                  column.hideBelow && hideClasses[column.hideBelow],
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-ink-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "transition-colors duration-150 hover:bg-surface-subtle",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("px-5 py-3.5 align-middle text-ink-700", column.className, column.hideBelow && hideClasses[column.hideBelow])}
                  >
                    {column.render(row)}
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
