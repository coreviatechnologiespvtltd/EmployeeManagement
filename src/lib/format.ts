const CURRENCY = "NPR";
const LOCALE = "en-NP";

export function formatCurrency(amount: number, withSymbol = true): string {
  const formatted = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return withSymbol ? `${CURRENCY} ${formatted}` : formatted;
}

export function formatCompactCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${CURRENCY} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    const thousands = amount / 1_000;
    const precision = Number.isInteger(thousands) ? 0 : 1;
    return `${CURRENCY} ${thousands.toFixed(precision)}K`;
  }
  return formatCurrency(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

export function formatDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" },
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, options).format(date);
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "—";
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (whole === 0 && minutes === 0) return "0h 00m";
  if (whole === 0) return `${minutes}m`;
  if (minutes === 0) return `${whole}h`;
  return `${whole}h ${minutes.toString().padStart(2, "0")}m`;
}

export function formatRelative(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 30) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -30) return `${Math.abs(diffDays)} days ago`;
  return formatDate(value);
}

export function monthLabel(month: string, style: "long" | "short" = "long"): string {
  const date = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return month;
  return new Intl.DateTimeFormat(LOCALE, { month: style, year: "numeric" }).format(date);
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diff >= 0 ? diff + 1 : 0;
}
