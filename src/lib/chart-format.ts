import { formatCompactCurrency, formatNumber } from "@/lib/format";

/**
 * Chart value formats are declared as a key rather than a function so charts
 * stay safe to render from Server Components: functions cannot cross the
 * server/client boundary.
 */
export type ChartValueFormat = "currency" | "number" | "days" | "hours";

const FORMATTERS: Record<ChartValueFormat, (value: number) => string> = {
  currency: (value) => formatCompactCurrency(value),
  number: (value) => formatNumber(value),
  days: (value) => `${formatNumber(value)} ${value === 1 ? "day" : "days"}`,
  hours: (value) => `${formatNumber(value)} ${value === 1 ? "hr" : "hrs"}`,
};

export function formatChartValue(value: number, format: ChartValueFormat = "currency"): string {
  return FORMATTERS[format](value);
}
