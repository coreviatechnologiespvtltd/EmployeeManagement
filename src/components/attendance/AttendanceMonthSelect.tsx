"use client";

import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { Select } from "@/components/ui/Select";
import { currentMonth, monthLabel } from "@/lib/format";

/**
 * Month switcher for the individual attendance pages.
 *
 * The month lives in the URL rather than component state so the choice survives
 * a refresh and can be shared, and so the server component can do the range
 * query in one pass.
 */
export function AttendanceMonthSelect({
  months,
  month,
}: {
  months: string[];
  month: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isCurrentMonth = month === currentMonth();

  return (
    <Select
      aria-label="Select attendance month"
      className="h-9 w-44"
      value={month}
      // `usePathname` is a plain string, so it needs the same assertion the
      // generated route union would otherwise give us.
      onChange={(event) =>
        router.push((isCurrentMonth ? pathname : `?month=${event.target.value}`) as Route)
      }
      options={months.map((value) => ({ value, label: monthLabel(value) }))}
    />
  );
}