import "server-only";

import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { attendanceSelection } from "@/lib/db/selects";
import { likePattern, monthRange } from "@/lib/db/query-helpers";
import { attendanceRecords, departments, employees } from "@/lib/db/schema";
import { toAttendanceRecord, toNumber } from "@/lib/db/mappers";
import { requireActionRole } from "@/lib/auth/actions";
import { currentMonth, monthLabel, today } from "@/lib/format";
import type {
  AttendanceRecord,
  AttendanceStatus,
  MonthlyAttendanceSummary,
} from "@/types/attendance";

export interface AttendanceFilters {
  query?: string;
  date?: string;
  month?: string;
  status?: AttendanceStatus | "all";
  department?: string;
}

const searchBlob = sql`concat_ws(' ', ${employees.fullName}, ${employees.id}, ${departments.name})`;

/**
 * Conditional aggregation for one month of attendance. `count(*) filter (...)`
 * is the idiomatic Postgres way to get a per-status breakdown in a single row.
 */
function summarySelection() {
  return {
    total: count(),
    present: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'present')`,
    absent: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'absent')`,
    late: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'late')`,
    halfDay: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'half_day')`,
    leave: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'leave')`,
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

export async function getTodayRecordForEmployee(employeeId: string): Promise<AttendanceRecord | null> {
  const rows = await db
    .select(attendanceSelection)
    .from(attendanceRecords)
    .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.workDate, today())))
    .limit(1);

  const row = rows[0];
  return row ? toAttendanceRecord(row) : null;
}

export async function getEmployeeAttendance(
  employeeId: string,
  month: string = currentMonth(),
): Promise<AttendanceRecord[]> {
  const { start, end } = monthRange(month);

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

  return rows.map(toAttendanceRecord);
}

export async function getEmployeeMonthlySummary(
  employeeId: string,
  month: string = currentMonth(),
): Promise<MonthlyAttendanceSummary> {
  const { start, end } = monthRange(month);

  const rows = await db
    .select(summarySelection())
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

  const rows = await db
    .select({ month: sql<string>`to_char(${attendanceRecords.workDate}, 'YYYY-MM')`, ...summarySelection() })
    .from(attendanceRecords)
    .where(and(eq(attendanceRecords.employeeId, employeeId), sql`${attendanceRecords.workDate} >= ${start}`))
    .groupBy(sql`to_char(${attendanceRecords.workDate}, 'YYYY-MM')`);

  const byMonth = new Map(rows.map((row) => [row.month, row]));

  return keys.map((key) => summarise(byMonth.get(key), key));
}

function buildFilters(filters: AttendanceFilters) {
  const conditions = [];

  if (filters.query) {
    conditions.push(ilike(searchBlob, likePattern(filters.query)));
  }
  if (filters.date) {
    conditions.push(eq(attendanceRecords.workDate, filters.date));
  } else if (filters.month && filters.month !== "all") {
    const { start, end } = monthRange(filters.month);
    conditions.push(
      sql`${attendanceRecords.workDate} >= ${start}`,
      sql`${attendanceRecords.workDate} < ${end}`,
    );
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(attendanceRecords.status, filters.status));
  }
  if (filters.department && filters.department !== "all") {
    conditions.push(eq(departments.name, filters.department));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getAllAttendance(filters: AttendanceFilters = {}): Promise<AttendanceRecord[]> {
  const rows = await db
    .select(attendanceSelection)
    .from(attendanceRecords)
    .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(buildFilters(filters))
    .orderBy(desc(attendanceRecords.workDate), asc(employees.fullName));

  return rows.map(toAttendanceRecord);
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

export async function getTodaysAttendance(): Promise<AttendanceRecord[]> {
  return getAllAttendance({ date: today() });
}

export async function getTodaysAttendanceStats() {
  const rows = await db
    .select({
      present: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'present')`,
      late: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'late')`,
      absent: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'absent')`,
      halfDay: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'half_day')`,
      leave: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'leave')`,
      total: count(),
    })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.workDate, today()));

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

export async function getDepartmentAttendanceBreakdown(date: string = today()) {
  const rows = await db
    .select({
      department: departments.name,
      present: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'present')`,
      absent: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'absent')`,
      late: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'late')`,
      leave: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'leave')`,
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

  const [rows, breakdown] = await Promise.all([
    db
      .select(summarySelection())
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
        presentDays: sql<number>`count(*) filter (where ${attendanceRecords.status} in ('present', 'late'))`,
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

export async function correctAttendance(input: CorrectAttendanceInput): Promise<AttendanceRecord | null> {
  await requireActionRole("admin");

  const checkIn = toInstant(input.checkIn);
  const checkOut = toInstant(input.checkOut);

  let workingHours: number | null = null;
  if (checkIn && checkOut) {
    const hours = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3_600_000;
    workingHours = hours > 0 ? Number(hours.toFixed(2)) : null;
  }

  const updated = await db
    .update(attendanceRecords)
    .set({
      status: input.status,
      checkIn,
      checkOut,
      workingHours: workingHours === null ? null : String(workingHours),
      remarks: input.remarks?.trim() || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(attendanceRecords.id, input.recordId))
    .returning({ id: attendanceRecords.id });

  if (updated.length === 0) return null;

  const rows = await db
    .select(attendanceSelection)
    .from(attendanceRecords)
    .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(attendanceRecords.id, input.recordId))
    .limit(1);

  const row = rows[0];
  return row ? toAttendanceRecord(row) : null;
}
