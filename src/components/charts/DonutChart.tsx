"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/** Dependency-free SVG donut chart with a centred total. */
export function DonutChart({
  data,
  size = 180,
  thickness = 22,
  centerLabel,
  centerValue,
  emptyMessage = "No data to display yet.",
  className,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  emptyMessage?: string;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-lg border border-dashed border-ink-200 text-sm text-ink-400", className)}
        style={{ height: size }}
      >
        {emptyMessage}
      </div>
    );
  }

  // Precompute arc offsets so the render pass stays side-effect free.
  const arcs = data.reduce<Array<{ slice: DonutSlice; dash: number; offset: number }>>(
    (acc, slice) => {
      const dash = (slice.value / total) * circumference;
      acc.push({ slice, dash, offset: acc.length === 0 ? 0 : acc[acc.length - 1]!.offset + acc[acc.length - 1]!.dash });
      return acc;
    },
    [],
  );

  return (
    <div className={cn("flex flex-col items-center gap-5 sm:flex-row sm:items-center", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={data.map((s) => `${s.label}: ${formatNumber(s.value)}`).join(", ")}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-ink-100)"
            strokeWidth={thickness}
          />
          {arcs.map(({ slice, dash, offset }, index) => (
            <circle
              key={slice.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={activeIndex === index ? thickness + 4 : thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              tabIndex={0}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-ink-900">
            {activeIndex !== null ? formatNumber(data[activeIndex]!.value) : centerValue}
          </span>
          <span className="max-w-[70%] truncate text-[11px] text-ink-500">
            {activeIndex !== null ? data[activeIndex]!.label : centerLabel}
          </span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2">
        {data.map((slice, index) => (
          <li
            key={slice.label}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-1 text-xs transition-colors",
              activeIndex === index ? "bg-surface-subtle" : "",
            )}
          >
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: slice.color }} />
            <span className="min-w-0 flex-1 truncate text-ink-600">{slice.label}</span>
            <span className="font-medium text-ink-900">{formatNumber(slice.value)}</span>
            <span className="w-10 text-right text-ink-400">
              {Math.round((slice.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
