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
import type { CompanySettingsInput } from "@/lib/validations/settings";

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
 * The policy as a plain object, straight from the validated form input.
 *
 * `getCompanyPolicy()` is memoised per request, so it cannot be used to observe
 * a change made earlier in the same request. A caller that has just saved new
 * values needs the new ones back, and this reads them from what it wrote.
 */
export function policyFromInput(input: CompanySettingsInput): CompanyPolicy {
  return {
    leaveAllocationDays: input.leaveAllocationDays,
    workdayStart: input.workdayStart,
    lateThresholdMinutes: input.lateThresholdMinutes,
    standardWorkingHours: input.standardWorkingHours,
  };
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

/** The keys `setCompanySetting` accepts, and the JSON shape each one stores. */
export const COMPANY_SETTING_KEYS = [
  "leave_allocation_days",
  "workday_start",
  "late_threshold_minutes",
  "standard_working_hours",
] as const;

export type CompanySettingKey = (typeof COMPANY_SETTING_KEYS)[number];

/**
 * Writes a single policy value.
 *
 * Drizzle serialises the value for the `jsonb` column, so it is passed through
 * as the plain string or number it already is. Serialising it here would store
 * a JSON *string* rather than a JSON number or string, and `getCompanyPolicy()`
 * would then read back the wrong type.
 */
export async function setCompanySetting(key: string, value: string | number): Promise<void> {
  const rows = await db
    .select({ key: companySettings.key })
    .from(companySettings)
    .where(eq(companySettings.key, key))
    .limit(1);

  if (rows.length === 0) {
    throw new Error(`Unknown company setting: ${key}`);
  }

  await db.update(companySettings).set({ value }).where(eq(companySettings.key, key));
}

/**
 * Persists the whole policy the admin form edits, in one round trip.
 *
 * Written as a single UPDATE rather than four calls so the policy never
 * half-applies, and so `updated_at` moves together across the four rows.
 */
export async function saveCompanyPolicy(input: CompanyPolicy): Promise<void> {
  const values: Record<CompanySettingKey, string | number> = {
    leave_allocation_days: input.leaveAllocationDays,
    workday_start: input.workdayStart,
    late_threshold_minutes: input.lateThresholdMinutes,
    standard_working_hours: input.standardWorkingHours,
  };

  for (const key of COMPANY_SETTING_KEYS) {
    await db
      .update(companySettings)
      .set({ value: values[key] })
      .where(eq(companySettings.key, key));
  }
}
