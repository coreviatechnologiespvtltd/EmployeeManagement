import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db/client";
import { attendanceSelection } from "@/lib/db/selects";
import { likePattern, monthRange } from "@/lib/db/query-helpers";
import { attendanceRecords, departments, employees } from "@/lib/db/schema";
import { toAttendanceRecord, toNumber } from "@/lib/db/mappers";
import { requireActionRole } from "@/lib/auth/actions";
import { getCompanyPolicy, type CompanyPolicy } from "@/lib/api/settings";
import { currentMonth, localToday, monthLabel } from "@/lib/format";
import { lateCutoffMinutes, resolveAttendanceStatus, type AttendancePolicy } from "@/lib/attendance-policy";
import type { AuthUser } from "@/types/auth";
import type {
  AttendancePerson,
  AttendanceRecord,
  AttendanceStatus,
  MonthlyAttendanceSummary,
} from "@/types/attendance";

export interface AttendanceFilters {
  query?: string;
  /** Exact working day. Takes precedence over `from` / `to`. */
  date?: string;
  /** Inclusive `YYYY-MM-DD` bounds, for the register's date range filter. */
  from?: string;
  to?: string;
  month?: string;
  status?: AttendanceStatus | "all";
  department?: string;
  employeeId?: string;
}

const searchBlob = sql`concat_ws(' ', ${employees.fullName}, ${employees.username}, ${employees.id}, ${departments.name})`;

/**
 * The late cutoff expressed in UTC minutes-of-day.
 *
 * `check_in` is a `timestamptz`, and the rule is defined in the server's local
 * time. Resolving the cutoff through a real `Date` means the SQL comparison and
 * `isLateArrival()`'s `getHours()` reading agree on the same instant, whatever
 * timezone the process or the database session happens to run in.
 */
function cutoffUtcMinutes(policy: AttendancePolicy): number {
  const probe = new Date();
  probe.setHours(0, 0, 0, 0);
  probe.setMinutes(probe.getMinutes() + lateCutoffMinutes(policy));
  return probe.getUTCHours() * 60 + probe.getUTCMinutes();
}

/**
 * The status of a row, recomputed in SQL.
 *
 * This mirrors `resolveAttendanceStatus()` exactly so that a `status = 'late'`
 * filter, a `count(*) filter (...)` breakdown and the badge the row renders all
 * come from the same rule. Without it a status filter would read the stored
 * column while the table displayed a freshly derived value, and the two would
 * quietly disagree.
 */
function derivedStatus(cutoff: number) {
  return sql<string>`case
    when ${attendanceRecords.checkIn} is null
      or ${attendanceRecords.status} in ('absent', 'leave', 'half_day')
      then ${attendanceRecords.status}
    when (
      extract(hour from ${attendanceRecords.checkIn} at time zone 'UTC')::int * 60
      + extract(minute from ${attendanceRecords.checkIn} at time zone 'UTC')::int
    ) > ${cutoff}
      then 'late'
    else 'present'
  end`;
}

/**
 * Conditional aggregation for one month of attendance. `count(*) filter (...)`
 * is the idiomatic Postgres way to get a per-status breakdown in a single row.
 */
function summarySelection(cutoff: number) {
  const status = derivedStatus(cutoff);
  return {
    total: count(),
    present: sql<number>`count(*) filter (where ${status} = 'present')`,
    absent: sql<number>`count(*) filter (where ${status} = 'absent')`,
    late: sql<number>`count(*) filter (where ${status} = 'late')`,
    halfDay: sql<number>`count(*) filter (where ${status} = 'half_day')`,
    leave: sql<number>`count(*) filter (where ${status} = 'leave')`,
    totalHours: sql<string>`coalesce(sum(${attendanceRecords.workingHours}), 0)`,
    hoursCount: sql<number>`count(${attendanceRecords.workingHours})`,
  };
}

interface SummaryRow {
  total?: number | null;
  present?: number | null;
  absent?: number | null;
  late?: number | null;
  halfDay?: number | null;
  leave?: number | null;
  totalHours?: string | number | null;
  hoursCount?: number | null;
}

function summarise(row: SummaryRow | undefined, month: string): MonthlyAttendanceSummary {
  const totalHours = toNumber(row?.totalHours);
  const hoursCount = toNumber(row?.hoursCount);

  return {
    month,
    monthLabel: monthLabel(month),
    present: toNumber(row?.present),
    absent: toNumber(row?.absent),
    late: toNumber(row?.late),
    halfDay: toNumber(row?.halfDay),
    leave: toNumber(row?.leave),
    totalWorkingDays: toNumber(row?.total),
    totalHours: Number(totalHours.toFixed(1)),
    averageHours: hoursCount > 0 ? Number((totalHours / hoursCount).toFixed(2)) : 0,
  };
}

/**
 * The caller's own record for the current working day.
 *
 * Scoped by `employeeId`, which the caller resolves from their own session —
 * there is no way to read another person's day from here.
 */
export async function getTodayRecordForEmployee(employeeId: string): Promise<AttendanceRecord | null> {
  const policy = await getCompanyPolicy();
  const rows = await db
    .select(attendanceSelection)
    .from(attendanceRecords)
    .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.workDate, localToday())))
    .limit(1);

  const row = rows[0];
  return row ? toAttendanceRecord(row, policy) : null;
}

export async function getEmployeeAttendance(
  employeeId: string,
  month: string = currentMonth(),
): Promise<AttendanceRecord[]> {
  const { start, end } = monthRange(month);
  const policy = await getCompanyPolicy();

  const rows = await db
    .select(attendanceSelection)
    .from(attendanceRecords)
    .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        sql`${attendanceRecords.workDate} >= ${start}`,
        sql`${attendanceRecords.workDate} < ${end}`,
      ),
    )
    .orderBy(desc(attendanceRecords.workDate));

  return rows.map((row) => toAttendanceRecord(row, policy));
}

export async function getEmployeeMonthlySummary(
  employeeId: string,
  month: string = currentMonth(),
): Promise<MonthlyAttendanceSummary> {
  const { start, end } = monthRange(month);
  const cutoff = cutoffUtcMinutes(await getCompanyPolicy());

  const rows = await db
    .select(summarySelection(cutoff))
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        sql`${attendanceRecords.workDate} >= ${start}`,
        sql`${attendanceRecords.workDate} < ${end}`,
      ),
    );

  return summarise(rows[0], month);
}

/**
 * The last `months` months, including months with no rows at all, which the
 * mock produced by looping. A single grouped query reads the data once and the
 * gaps are filled in here.
 */
export async function getAttendanceTrend(
  employeeId: string,
  months: number,
): Promise<MonthlyAttendanceSummary[]> {
  const keys: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const first = keys[0]!;
  const { start } = monthRange(first);
  const cutoff = cutoffUtcMinutes(await getCompanyPolicy());

  const rows = await db
    .select({ month: sql<string>`to_char(${attendanceRecords.workDate}, 'YYYY-MM')`, ...summarySelection(cutoff) })
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.employeeId, employeeId), sql`${attendanceRecords.workDate} >= ${start}`))
    .groupBy(sql`to_char(${attendanceRecords.workDate}, 'YYYY-MM')`);

  const byMonth = new Map(rows.map((row) => [row.month, row]));

  return keys.map((key) => summarise(byMonth.get(key), key));
}

function buildFilters(filters: AttendanceFilters, cutoff: number) {
  const conditions = [];

  if (filters.query) {
    conditions.push(ilike(searchBlob, likePattern(filters.query)));
  }

  // An exact day is just a range of one, so the three date inputs collapse into
  // one pair of inclusive bounds.
  const from = filters.date ?? filters.from;
  const to = filters.date ?? filters.to;
  if (from) {
    conditions.push(gte(attendanceRecords.workDate, from));
  }
  if (to) {
    conditions.push(lte(attendanceRecords.workDate, to));
  }

  if (!from && !to && filters.month && filters.month !== "all") {
    const { start, end } = monthRange(filters.month);
    conditions.push(
      sql`${attendanceRecords.workDate} >= ${start}`,
      sql`${attendanceRecords.workDate} < ${end}`,
    );
  }

  // Filtered on the derived status rather than the stored column, so filtering
  // by "Late" returns exactly the rows that render a Late badge.
  if (filters.status && filters.status !== "all") {
    conditions.push(sql`${derivedStatus(cutoff)} = ${filters.status}`);
  }
  if (filters.department && filters.department !== "all") {
    conditions.push(eq(departments.name, filters.department));
  }
  if (filters.employeeId && filters.employeeId !== "all") {
    conditions.push(eq(attendanceRecords.employeeId, filters.employeeId));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getAllAttendance(filters: AttendanceFilters = {}): Promise<AttendanceRecord[]> {
  const policy = await getCompanyPolicy();
  const rows = await db
    .select(attendanceSelection)
    .from(attendanceRecords)
    .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(buildFilters(filters, cutoffUtcMinutes(policy)))
    .orderBy(desc(attendanceRecords.workDate), asc(employees.fullName));

  return rows.map((row) => toAttendanceRecord(row, policy));
}

/**
 * How many records match the same filters, without reading them.
 *
 * The register shows "42 of 500 records in range" so an admin can tell a narrow
 * search from an empty one. That second number is a `count(*)` rather than a
 * second fetch of every row.
 */
export async function countAttendance(filters: AttendanceFilters = {}): Promise<number> {
  const cutoff = cutoffUtcMinutes(await getCompanyPolicy());
  const rows = await db
    .select({ total: count() })
    .from(attendanceRecords)
    .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(buildFilters(filters, cutoff));

  return toNumber(rows[0]?.total);
}

/**
 * Every date that has at least one record, for the date picker on the admin
 * attendance register.
 *
 * This replaces the previous approach of loading the entire attendance table
 * and de-duplicating it in JavaScript, which pulled roughly a thousand rows to
 * build a list of dates.
 */
export async function getAttendanceDates(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ date: attendanceRecords.workDate })
    .from(attendanceRecords)
    .orderBy(desc(attendanceRecords.workDate));

  return rows.map((row) => row.date);
}

/**
 * The months a person actually has records in, newest first.
 *
 * Powers the month picker on the individual attendance pages so the history can
 * be browsed rather than being limited to the current month.
 */
export async function getAttendanceMonths(employeeId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ month: sql<string>`to_char(${attendanceRecords.workDate}, 'YYYY-MM')` })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.employeeId, employeeId))
    .orderBy(desc(sql`to_char(${attendanceRecords.workDate}, 'YYYY-MM')`));

  const months = rows.map((row) => row.month);
  const current = currentMonth();

  // The current month is always offered, even before the first check-in of the
  // month has been recorded.
  return months.includes(current) ? months : [current, ...months];
}

export async function getTodaysAttendance(): Promise<AttendanceRecord[]> {
  return getAllAttendance({ date: localToday() });
}

/**
 * Everyone the register can be filtered by — staff and admins alike, active or
 * not, so historical records for a deactivated account stay reachable.
 */
export async function listAttendancePeople(): Promise<AttendancePerson[]> {
  const rows = await db
    .select({
      id: employees.id,
      fullName: employees.fullName,
      username: employees.username,
      role: employees.role,
      department: departments.name,
    })
    .from(employees)
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .orderBy(asc(employees.fullName));

  return rows;
}

export async function getTodaysAttendanceStats() {
  const cutoff = cutoffUtcMinutes(await getCompanyPolicy());
  const status = derivedStatus(cutoff);

  const rows = await db
    .select({
      present: sql<number>`count(*) filter (where ${status} = 'present')`,
      late: sql<number>`count(*) filter (where ${status} = 'late')`,
      absent: sql<number>`count(*) filter (where ${status} = 'absent')`,
      halfDay: sql<number>`count(*) filter (where ${status} = 'half_day')`,
      leave: sql<number>`count(*) filter (where ${status} = 'leave')`,
      total: count(),
    })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.workDate, localToday()));

  const row = rows[0];
  return {
    present: toNumber(row?.present),
    late: toNumber(row?.late),
    absent: toNumber(row?.absent),
    halfDay: toNumber(row?.halfDay),
    leave: toNumber(row?.leave),
    total: toNumber(row?.total),
  };
}

export async function getDepartmentAttendanceBreakdown(date: string = localToday()) {
  const cutoff = cutoffUtcMinutes(await getCompanyPolicy());
  const status = derivedStatus(cutoff);

  const rows = await db
    .select({
      department: departments.name,
      present: sql<number>`count(*) filter (where ${status} = 'present')`,
      absent: sql<number>`count(*) filter (where ${status} = 'absent')`,
      late: sql<number>`count(*) filter (where ${status} = 'late')`,
      leave: sql<number>`count(*) filter (where ${status} = 'leave')`,
      total: count(),
    })
    .from(attendanceRecords)
    .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(attendanceRecords.workDate, date))
    .groupBy(departments.name)
    .orderBy(asc(departments.name));

  return rows.map((row) => ({
    department: row.department,
    present: toNumber(row.present),
    absent: toNumber(row.absent),
    late: toNumber(row.late),
    leave: toNumber(row.leave),
    total: toNumber(row.total),
  }));
}

export async function getMonthlySummaryForAll(month: string = currentMonth()) {
  const { start, end } = monthRange(month);
  const cutoff = cutoffUtcMinutes(await getCompanyPolicy());
  const status = derivedStatus(cutoff);

  const [rows, breakdown] = await Promise.all([
    db
      .select(summarySelection(cutoff))
      .from(attendanceRecords)
      .where(
        and(
          sql`${attendanceRecords.workDate} >= ${start}`,
          sql`${attendanceRecords.workDate} < ${end}`,
        ),
      ),
    db
      .select({
        department: departments.name,
        presentDays: sql<number>`count(*) filter (where ${status} in ('present', 'late'))`,
      })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .innerJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(
          sql`${attendanceRecords.workDate} >= ${start}`,
          sql`${attendanceRecords.workDate} < ${end}`,
        ),
      )
      .groupBy(departments.name)
      .orderBy(asc(departments.name)),
  ]);

  return {
    ...summarise(rows[0], month),
    monthLabel: monthLabel(month),
    byDepartment: breakdown.map((row) => ({
      department: row.department,
      presentDays: toNumber(row.presentDays),
    })),
  };
}

export interface CorrectAttendanceInput {
  recordId: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  remarks?: string;
}

/**
 * Parses a local `YYYY-MM-DDTHH:mm` value from the correction form into a UTC
 * ISO instant. Doing the conversion here rather than letting Postgres interpret
 * the string keeps the result independent of the connection's TimeZone setting.
 */
function toInstant(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/**
 * Reads one record back through the joins that resolve names and department.
 * Used after every write so callers get the same shape the read paths return.
 */
async function readRecordById(id: string): Promise<AttendanceRecord | null> {
  const policy = await getCompanyPolicy();
  const rows = await db
    .select(attendanceSelection)
    .from(attendanceRecords)
    .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(attendanceRecords.id, id))
    .limit(1);

  const row = rows[0];
  return row ? toAttendanceRecord(row, policy) : null;
}

/**
 * Rewrites the stored status of every clocked day that the current policy
 * disagrees with, and returns how many rows changed.
 *
 * Reading already derives the status, so this is not needed for the UI to be
 * correct. It exists so the persisted column stops being a second, drifting
 * source of truth: when an admin moves the cutoff from 10:15 AM to 10:00 AM,
 * every record that recorded a 10:05 arrival is re-stamped `late` in the same
 * request, which also keeps any external reader of the table in agreement.
 *
 * Absent, leave and half-day rows are skipped: those statuses are admin
 * decisions about the day, not consequences of an arrival time.
 */
export async function recalculateAttendanceStatuses(policy: CompanyPolicy): Promise<number> {
  const rows = await db
    .select({
      id: attendanceRecords.id,
      checkIn: attendanceRecords.checkIn,
      status: attendanceRecords.status,
    })
    .from(attendanceRecords)
    .where(
      and(
        isNotNull(attendanceRecords.checkIn),
        inArray(attendanceRecords.status, ["present", "late"]),
      ),
    );

  const changes: { id: string; status: AttendanceStatus }[] = [];
  for (const row of rows) {
    const next = resolveAttendanceStatus({
      checkIn: row.checkIn ? new Date(row.checkIn) : null,
      requested: row.status,
      policy,
    });
    if (next !== row.status) changes.push({ id: row.id, status: next });
  }

  if (changes.length === 0) return 0;

  // One statement rather than a loop, so a policy change cannot leave the table
  // half-updated if a later row fails. The `(id, status)` pairs are emitted as
  // a literal VALUES list: passing JS arrays as bind parameters would encode
  // them as single values rather than Postgres arrays.
  const pairs = changes.map((c) => sql`(${c.id}::text, ${c.status}::text)`);

  await db.execute(sql`
    update attendance_records as a
       set status = v.status, updated_at = now()
      from (values ${sql.join(pairs, sql`, `)}) as v(id, status)
     where a.id = v.id and a.status is distinct from v.status
  `);

  return changes.length;
}

export async function correctAttendance(input: CorrectAttendanceInput): Promise<AttendanceRecord | null> {
  await requireActionRole("admin");

  const policy = await getCompanyPolicy();
  const checkIn = toInstant(input.checkIn);
  const checkOut = toInstant(input.checkOut);

  if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
    throw new Error("Check-out time must be after check-in time.");
  }

  let workingHours: number | null = null;
  if (checkIn && checkOut) {
    const hours = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3_600_000;
    workingHours = hours > 0 ? Number(hours.toFixed(2)) : null;
  }

  // The submitted status is a request, not the answer. For an arrival-based
  // status the check-in time decides, so moving a late arrival back to 10:00 AM
  // stores `present` even if the form still had "Late" selected.
  const status = resolveAttendanceStatus({
    checkIn: checkIn ? new Date(checkIn) : null,
    requested: input.status,
    policy,
  });

  const updated = await db
    .update(attendanceRecords)
    .set({
      status,
      checkIn,
      checkOut,
      workingHours: workingHours === null ? null : String(workingHours),
      remarks: input.remarks?.trim() || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(attendanceRecords.id, input.recordId))
    .returning({ id: attendanceRecords.id });

  if (updated.length === 0) return null;

  return readRecordById(input.recordId);
}

/* -------------------------------------------------------------------------- */
/* Clocking in and out                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Records the caller's check-in for the current working day.
 *
 * One row per person per day is a database guarantee, not a UI convention: the
 * insert is an upsert on the unique `(employee_id, work_date)` index whose
 * update branch only fires when the day has no check-in yet. A second click —
 * from a double submission, a second tab, or a stale page — matches no row, so
 * the statement returns nothing and the repeat is refused here.
 *
 * The status comes from the same `resolveAttendanceStatus()` the admin
 * correction form uses, so an employee and an admin clocking in under the same
 * policy can never end up with different rules.
 */
export async function checkInToday(actor: AuthUser): Promise<AttendanceRecord> {
  await requireActionRole("employee", "admin");

  const workDate = localToday();
  const now = new Date();
  const policy = await getCompanyPolicy();
  const status = resolveAttendanceStatus({ checkIn: now, requested: "present", policy });
  const stamp = now.toISOString();

  const written = await db
    .insert(attendanceRecords)
    .values({ employeeId: actor.id, workDate, status, checkIn: stamp })
    .onConflictDoUpdate({
      target: [attendanceRecords.employeeId, attendanceRecords.workDate],
      set: { checkIn: stamp, status, updatedAt: stamp },
      setWhere: isNull(attendanceRecords.checkIn),
    })
    .returning({ id: attendanceRecords.id });

  if (written.length === 0) {
    throw new Error("You have already checked in today.");
  }

  const record = await readRecordById(written[0]!.id);
  if (!record) throw new Error("Your check-in could not be read back after saving.");
  return record;
}

/**
 * Records the caller's check-out for the current working day and derives the
 * working duration from the stored check-in.
 *
 * The write is a single conditional `UPDATE`, so the "checked out twice" and
 * "never checked in" guards hold even if two requests arrive together. The
 * remaining rules are enforced here: the checkout has to be later than the
 * check-in, and the status is re-derived from the check-in time, so a day that
 * had been marked absent or on leave is classified by when the person actually
 * arrived rather than assumed on time.
 */
export async function checkOutToday(actor: AuthUser): Promise<AttendanceRecord> {
  await requireActionRole("employee", "admin");

  const workDate = localToday();
  const now = new Date();

  const policy = await getCompanyPolicy();
  const current = await getTodayRecordForEmployee(actor.id);
  if (!current?.checkIn) {
    throw new Error("Check in before checking out.");
  }
  if (current.checkOut) {
    throw new Error("You have already checked out today.");
  }

  const hours = (now.getTime() - new Date(current.checkIn).getTime()) / 3_600_000;
  if (hours <= 0) {
    throw new Error("Check-out time must be after check-in time.");
  }

  const status = resolveAttendanceStatus({
    checkIn: new Date(current.checkIn),
    requested: current.status,
    policy,
  });

  const updated = await db
    .update(attendanceRecords)
    .set({
      checkOut: now.toISOString(),
      workingHours: hours.toFixed(2),
      status,
      updatedAt: now.toISOString(),
    })
    .where(
      and(
        eq(attendanceRecords.employeeId, actor.id),
        eq(attendanceRecords.workDate, workDate),
        isNotNull(attendanceRecords.checkIn),
        isNull(attendanceRecords.checkOut),
      ),
    )
    .returning({ id: attendanceRecords.id });

  if (updated.length === 0) {
    throw new Error("You have already checked out today.");
  }

  const record = await readRecordById(updated[0]!.id);
  if (!record) throw new Error("Your check-out could not be read back after saving.");
  return record;
}
