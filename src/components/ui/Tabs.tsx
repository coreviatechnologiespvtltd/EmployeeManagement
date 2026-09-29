"use client";

import { cn } from "@/lib/cn";

export interface TabsItem {
  value: string;
  label: string;
  count?: number;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
  ariaLabel = "Tabs",
}: {
  items: TabsItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("cv-scrollbar-thin flex gap-1 overflow-x-auto border-b border-ink-100", className)}
    >
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors duration-150",
              isActive
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-500 hover:border-ink-200 hover:text-ink-800",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  isActive ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-600",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
