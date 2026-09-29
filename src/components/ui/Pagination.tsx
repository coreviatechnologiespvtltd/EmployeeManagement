"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export function Pagination({
  page,
  pageCount,
  onPageChange,
  totalItems,
  pageSize,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
  className?: string;
}) {
  if (totalItems === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-5 py-3", className)}
    >
      <p className="text-xs text-ink-500">
        Showing <span className="font-medium text-ink-700">{from}</span>–
        <span className="font-medium text-ink-700">{to}</span> of{" "}
        <span className="font-medium text-ink-700">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
          Prev
        </Button>
        <span className="px-2 text-xs text-ink-600">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          Next
          <ChevronRight aria-hidden className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function pageCountFor(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
