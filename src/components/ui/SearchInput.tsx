"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <label htmlFor="cv-search" className="sr-only">
        {label}
      </label>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        id="cv-search"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-ink-200 bg-white pr-9 pl-9 text-sm text-ink-900 transition-colors duration-150 placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
        >
          <X aria-hidden className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
