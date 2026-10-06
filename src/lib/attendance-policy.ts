import type { AttendanceStatus } from "@/types/attendance";

/**
 * The one rule that decides whether an arrival counts as late.
 *
 * The company clock lives in `company_settings` as `workday_start` plus
 * `late_threshold_minutes`: a 10:00 AM start with a 15 minute grace period puts
 * the cutoff at 10:15 AM. This module is the only place that arithmetic happens,
 * and it is deliberately free of `server-only` so the correction form can
 * preview the outcome with exactly the code the server will use.
 *
 * The boundary is strict. Arriving at 10:15 AM is on time and 10:16 AM is late,
 * which falls out of comparing minutes-since-midnight with `>` rather than `>=`.
 */

/** The subset of company policy the late rule needs. */
export interface AttendancePolicy {
  /** `HH:mm`, the official start of the working day. */
  workdayStart: string;
  /** Grace period, in minutes, counted from `workdayStart`. */
  lateThresholdMinutes: number;
}

/**
 * The statuses that describe the arrival itself and are therefore derived from
 * the check-in time. The rest describe the day as a whole and are only ever set
 * deliberately by an admin.
 */
const TIME_DERIVED: ReadonlySet<AttendanceStatus> = new Set<AttendanceStatus>(["present", "late"]);

/** Statuses an admin picks to describe a whole day rather than an arrival. */
export function isTimeDerivedStatus(status: AttendanceStatus): boolean {
  return TIME_DERIVED.has(status);
}

/** `HH:mm` to minutes past midnight. Returns 0 for anything unparseable. */
export function parseClockMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return 0;
  return hours * 60 + minutes;
}

/** Minutes past local midnight for a timestamp, the same reading `toInstant` reverses. */
export function minutesSinceMidnight(value: Date): number {
  return value.getHours() * 60 + value.getMinutes();
}

/** Workday start plus the grace period: 10:00 + 15 minutes is 10:15 AM. */
export function lateCutoffMinutes(policy: AttendancePolicy): number {
  return parseClockMinutes(policy.workdayStart) + policy.lateThresholdMinutes;
}

/** Minutes past midnight as `HH:mm AM/PM`, for the "late after" readouts. */
export function formatClockMinutes(minutes: number): string {
  const normalised = ((minutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalised / 60);
  const suffix = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(normalised % 60).padStart(2, "0")} ${suffix}`;
}

/** The cutoff as a clock label, e.g. `10:15 AM`. */
export function lateCutoffLabel(policy: AttendancePolicy): string {
  return formatClockMinutes(lateCutoffMinutes(policy));
}

/** True when the check-in is strictly after the cutoff. 10:15 AM is on time. */
export function isLateArrival(checkIn: Date, policy: AttendancePolicy): boolean {
  return minutesSinceMidnight(checkIn) > lateCutoffMinutes(policy);
}

/**
 * The status a check-in time implies.
 *
 * A day that was clocked on time is `present` and one that arrived after the
 * cutoff is `late`; the stored value is only ever a cache of this decision.
 */
export function statusForCheckIn(checkIn: Date, policy: AttendancePolicy): AttendanceStatus {
  return isLateArrival(checkIn, policy) ? "late" : "present";
}

export interface ResolveStatusInput {
  /** The check-in being recorded or corrected. `null` for a day with no times. */
  checkIn: Date | null;
  /** What the caller asked for, i.e. the admin's selection on the correction form. */
  requested: AttendanceStatus;
  policy: AttendancePolicy;
}

/**
 * The single decision point every write path goes through.
 *
 * The rule is that the stored status can never contradict the stored check-in
 * time. When the requested status is one the time decides (`present` / `late`),
 * the time wins, which is what makes an admin changing a late arrival back to
 * 10:00 AM flip the record to on time. The day-level statuses are left alone:
 * a record an admin marked absent, on leave or a half day says something about
 * the day that a clock time cannot express or overrule.
 */
export function resolveAttendanceStatus({ checkIn, requested, policy }: ResolveStatusInput): AttendanceStatus {
  if (!checkIn) return requested;
  if (!isTimeDerivedStatus(requested)) return requested;
  return statusForCheckIn(checkIn, policy);
}