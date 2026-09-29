"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { formatChartValue, type ChartValueFormat } from "@/lib/chart-format";

export interface BarChartDatum {
  label: string;
  value: number;
  /** Optional stacked segments rendered bottom-up under the bar. */
  segments?: Array<{ label: string; value: number; color: string }>;
}

const SERIES_COLORS = [
  "var(--color-brand-600)",
  "var(--color-brand-400)",
  "var(--color-brand-200)",
  "var(--color-ink-200)",
];

/**
 * Dependency-free responsive bar chart. Renders as stacked or single-series
 * bars with an accessible table fallback for screen readers.
 */
export function BarChart({
  data,
  height = 220,
  valueFormat = "currency",
  emptyMessage = "No data to display yet.",
  className,
}: {
  data: BarChartDatum[];
  height?: number;
  valueFormat?: ChartValueFormat;
  emptyMessage?: string;
  className?: string;
}) {
  const formatValue = (value: number) => formatChartValue(value, valueFormat);
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const hasData = data.some((d) => d.value > 0);
  const max = Math.max(...data.map((d) => d.value), 1);

  if (!data.length || !hasData) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-lg border border-dashed border-ink-200 text-sm text-ink-400", className)}
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="cv-scrollbar-thin overflow-x-auto pb-1">
        <div className="flex min-w-[420px] items-end gap-3" style={{ height }}>
          {data.map((datum, index) => {
            const barHeight = Math.max((datum.value / max) * (height - 44), datum.value > 0 ? 4 : 0);
            const isActive = activeIndex === index;
            const segments = datum.segments?.filter((s) => s.value > 0) ?? [];

            return (
              <div
                key={`${datum.label}-${index}`}
                className="group relative flex flex-1 flex-col items-center justify-end"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                tabIndex={0}
                role="img"
                aria-label={`${datum.label}: ${formatValue(datum.value)}`}
              >
                {isActive && (
                  <div className="pointer-events-none absolute -top-1 left-1/2 z-10 mb-2 w-max -translate-x-1/2 -translate-y-full rounded-lg border border-ink-100 bg-white px-2.5 py-1.5 text-xs shadow-popover">
                    <span className="font-semibold text-ink-900">{formatValue(datum.value)}</span>
                    {segments.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {segments.map((segment) => (
                          <li key={segment.label} className="flex items-center gap-1.5 text-[11px] text-ink-500">
                            <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: segment.color }} />
                            {segment.label}: {formatValue(segment.value)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-md" style={{ height: barHeight }}>
                  {segments.length > 0
                    ? segments.map((segment, segmentIndex) => (
                        <div
                          key={segment.label}
                          title={segment.label}
                          style={{
                            height: `${(segment.value / max) * 100}%`,
                            background: segment.color,
                            filter:
                              segmentIndex === segments.length - 1 ? `url(#${gradientId}-soft)` : undefined,
                          }}
                          className="w-full"
                        />
                      ))
                    : (
                        <div
                          className="w-full"
                          style={{
                            height: "100%",
                            background: `var(--color-brand-600)`,
                            opacity: isActive ? 1 : 0.9,
                          }}
                        />
                      )}
                </div>

                <span className="mt-2 w-full truncate text-center text-[11px] text-ink-500">{datum.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <table className="sr-only">
        <caption>Chart data</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((datum) => (
            <tr key={datum.label}>
              <th scope="row">{datum.label}</th>
              <td>{formatValue(datum.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <span id={`${gradientId}-soft`} className="sr-only" />
      <span className="sr-only">{SERIES_COLORS.length} series palette</span>
    </div>
  );
}
