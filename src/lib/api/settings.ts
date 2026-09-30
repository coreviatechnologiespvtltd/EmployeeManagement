import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { companySettings } from "@/lib/db/schema";
import {
  LATE_THRESHOLD_MINUTES,
  LEAVE_ALLOCATION_DAYS,
  STANDARD_WORKING_HOURS,
  WORKDAY_START,
} from "@/lib/constants";

/**
 * Company policy, stored in `company_settings` instead of hardcoded in
 * `lib/constants.ts`.
 *
 * The constants above remain the fallback, so the app still boots correctly if
 * the settings rows are missing. Once seeded, the leave allocation, workday
 * start, late threshold and standard day length are data — changeable with an
 * UPDATE rather than a redeploy.
 */

export interface CompanyPolicy {
  leaveAllocationDays: number;
  workdayStart: string;
  lateThresholdMinutes: number;
  standardWorkingHours: number;
}

const FALLBACK: CompanyPolicy = {
  leaveAllocationDays: LEAVE_ALLOCATION_DAYS,
  workdayStart: WORKDAY_START,
  lateThresholdMinutes: LATE_THRESHOLD_MINUTES,
  standardWorkingHours: STANDARD_WORKING_HOURS,
};

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Memoised per request: policy is read by several pages in one render pass. */
export const getCompanyPolicy = cache(async (): Promise<CompanyPolicy> => {
  const rows = await db
    .select({ key: companySettings.key, value: companySettings.value })
    .from(companySettings);

  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return {
    leaveAllocationDays:
      readNumber(byKey.get("leave_allocation_days")) ?? FALLBACK.leaveAllocationDays,
    workdayStart: readString(byKey.get("workday_start")) ?? FALLBACK.workdayStart,
    lateThresholdMinutes:
      readNumber(byKey.get("late_threshold_minutes")) ?? FALLBACK.lateThresholdMinutes,
    standardWorkingHours:
      readNumber(byKey.get("standard_working_hours")) ?? FALLBACK.standardWorkingHours,
  };
});

/** Convenience for the leave balance calculation. */
export async function getLeaveAllocationDays(): Promise<number> {
  return (await getCompanyPolicy()).leaveAllocationDays;
}

/**
 * The shift end time, derived from the workday start and the standard day
 * length so the attendance correction form does not carry its own hardcoded
 * "18:00".
 */
export async function getStandardShift(): Promise<{ checkIn: string; checkOut: string }> {
  const { workdayStart, standardWorkingHours } = await getCompanyPolicy();
  return {
    checkIn: workdayStart,
    checkOut: addHours(workdayStart, standardWorkingHours),
  };
}

/** `09:00` plus 8 hours becomes `17:00`, crossing midnight if it ever has to. */
function addHours(time: string, hours: number): string {
  const [hourPart, minutePart] = time.split(":");
  const startMinutes = Number(hourPart) * 60 + Number(minutePart);
  const total = (startMinutes + Math.round(hours * 60)) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Writes a single policy value. Used by the seed and by future admin settings. */
export async function setCompanySetting(key: string, value: string | number): Promise<void> {
  const rows = await db
    .select({ key: companySettings.key })
    .from(companySettings)
    .where(eq(companySettings.key, key))
    .limit(1);

  if (rows.length === 0) {
    throw new Error(`Unknown company setting: ${key}`);
  }

  await db
    .update(companySettings)
    .set({ value, updatedAt: new Date().toISOString() })
    .where(eq(companySettings.key, key));
}
