"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { formatChartValue, type ChartValueFormat } from "@/lib/chart-format";

export interface LineChartPoint {
  label: string;
  value: number;
}

/**
 * Dependency-free SVG line chart with a soft area fill, matching the
 * white / soft-blue design system. Uses a fixed viewBox and scales to width.
 */
export function LineChart({
  data,
  height = 220,
  valueFormat = "currency",
  emptyMessage = "No data to display yet.",
  className,
}: {
  data: LineChartPoint[];
  height?: number;
  valueFormat?: ChartValueFormat;
  emptyMessage?: string;
  className?: string;
}) {
  const formatValue = (value: number) => formatChartValue(value, valueFormat);
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (data.length < 2 || data.every((d) => d.value === 0)) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-lg border border-dashed border-ink-200 text-sm text-ink-400", className)}
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  const width = 600;
  const padding = { top: 16, right: 12, bottom: 28, left: 12 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || max || 1;
  const yMin = min - range * 0.15;
  const yMax = max + range * 0.15;

  const xAt = (index: number) => padding.left + (index / (data.length - 1)) * innerWidth;
  const yAt = (value: number) => padding.top + (1 - (value - yMin) / (yMax - yMin)) * innerHeight;

  const points = data.map((datum, index) => `${xAt(index)},${yAt(datum.value)}`);
  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `M ${xAt(0)},${padding.top + innerHeight} L ${points.join(" L ")} L ${xAt(data.length - 1)},${padding.top + innerHeight} Z`;

  return (
    <div className={cn("w-full", className)}>
      <div className="cv-scrollbar-thin overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Trend of ${data.length} periods`}
          className="h-auto w-full min-w-[420px]"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((ratio) => {
            const y = padding.top + ratio * innerHeight;
            return (
              <line
                key={ratio}
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="var(--color-ink-100)"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
            );
          })}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-brand-600)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((datum, index) => (
            <g key={`${datum.label}-${index}`}>
              <circle
                cx={xAt(index)}
                cy={yAt(datum.value)}
                r={activeIndex === index ? 5 : 3.5}
                fill="var(--color-surface)"
                stroke="var(--color-brand-600)"
                strokeWidth="2"
                className="transition-all duration-150"
              />
              <rect
                x={xAt(index) - innerWidth / (data.length - 1) / 2}
                y={padding.top}
                width={innerWidth / (data.length - 1)}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(index)}
                tabIndex={0}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                role="img"
                aria-label={`${datum.label}: ${formatValue(datum.value)}`}
                className="cursor-pointer"
              />
              <text
                x={xAt(index)}
                y={height - 8}
                textAnchor="middle"
                className="fill-ink-500 text-[10px]"
              >
                {datum.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {activeIndex !== null && (
        <p className="mt-2 text-center text-xs text-ink-500">
          <span className="font-semibold text-ink-800">{data[activeIndex]!.label}</span> ·{" "}
          {formatValue(data[activeIndex]!.value)}
        </p>
      )}

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
    </div>
  );
}
