import "server-only";
import { db } from "@/lib/db/store";
import { requireActionRole } from "@/lib/auth/actions";
import { simulateLatency } from "./latency";
import { buildSummary } from "@/lib/db/seed/attendance";
import { currentMonth, monthLabel, today } from "@/lib/format";
import type { AttendanceRecord, AttendanceStatus, MonthlyAttendanceSummary } from "@/types/attendance";

export interface AttendanceFilters {
  query?: string;
  date?: string;
  month?: string;
  status?: AttendanceStatus | "all";
  department?: string;
}

function summarise(records: AttendanceRecord[], month: string): MonthlyAttendanceSummary {
  return buildSummary(records, month);
}

export async function getTodayRecordForEmployee(employeeId: string): Promise<AttendanceRecord | null> {
  await simulateLatency(120);
  return (
    db.attendance.find((r) => r.employeeId === employeeId && r.date === today()) ?? null
  );
}

export async function getEmployeeAttendance(
  employeeId: string,
  month: string = currentMonth(),
): Promise<AttendanceRecord[]> {
  await simulateLatency(200);
  return db.attendance
    .filter((r) => r.employeeId === employeeId && r.date.startsWith(month))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getEmployeeMonthlySummary(
  employeeId: string,
  month: string = currentMonth(),
): Promise<MonthlyAttendanceSummary> {
  await simulateLatency(140);
  const records = db.attendance.filter((r) => r.employeeId === employeeId && r.date.startsWith(month));
  return summarise(records, month);
}

export async function getAttendanceTrend(
  employeeId: string,
  months: number,
): Promise<MonthlyAttendanceSummary[]> {
  await simulateLatency(180);
  const out: MonthlyAttendanceSummary[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const records = db.attendance.filter((r) => r.employeeId === employeeId && r.date.startsWith(key));
    out.push(summarise(records, key));
  }
  return out;
}

export async function getAllAttendance(filters: AttendanceFilters = {}): Promise<AttendanceRecord[]> {
  await simulateLatency(220);
  let result = [...db.attendance];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter((r) =>
      [r.employeeName, r.employeeId, r.department].join(" ").toLowerCase().includes(q),
    );
  }
  const dateFilter = filters.date;
  const monthFilter = filters.month;
  if (dateFilter) {
    result = result.filter((r) => r.date === dateFilter);
  } else if (monthFilter) {
    result = result.filter((r) => r.date.startsWith(monthFilter));
  }
  if (filters.status && filters.status !== "all") {
    result = result.filter((r) => r.status === filters.status);
  }
  if (filters.department && filters.department !== "all") {
    result = result.filter((r) => r.department === filters.department);
  }

  return result.sort(
    (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.employeeName.localeCompare(b.employeeName)),
  );
}

export async function getTodaysAttendance(): Promise<AttendanceRecord[]> {
  await simulateLatency(160);
  return db.attendance
    .filter((r) => r.date === today())
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export async function getTodaysAttendanceStats() {
  const records = await getTodaysAttendance();
  return {
    present: records.filter((r) => r.status === "present").length,
    late: records.filter((r) => r.status === "late").length,
    absent: records.filter((r) => r.status === "absent").length,
    halfDay: records.filter((r) => r.status === "half_day").length,
    leave: records.filter((r) => r.status === "leave").length,
    total: records.length,
  };
}

export async function getDepartmentAttendanceBreakdown(date: string = today()) {
  const records = await getAllAttendance({ date });
  const map = new Map<string, { present: number; absent: number; late: number; leave: number; total: number }>();
  for (const r of records) {
    const entry = map.get(r.department) ?? { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
    if (r.status === "present") entry.present += 1;
    else if (r.status === "late") entry.late += 1;
    else if (r.status === "absent") entry.absent += 1;
    else if (r.status === "leave") entry.leave += 1;
    entry.total += 1;
    map.set(r.department, entry);
  }
  return Array.from(map, ([department, stats]) => ({ department, ...stats }));
}

export async function getMonthlySummaryForAll(month: string = currentMonth()) {
  const records = await getAllAttendance({ month });
  const summary = summarise(records, month);
  return { ...summary, monthLabel: monthLabel(month), byDepartment: await getDepartmentBreakdown(month) };
}

async function getDepartmentBreakdown(month: string) {
  const records = await getAllAttendance({ month });
  const map = new Map<string, number>();
  for (const r of records) {
    if (r.status === "present" || r.status === "late") {
      map.set(r.department, (map.get(r.department) ?? 0) + 1);
    }
  }
  return Array.from(map, ([department, presentDays]) => ({ department, presentDays }));
}

export interface CorrectAttendanceInput {
  recordId: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  remarks?: string;
}

export async function correctAttendance(input: CorrectAttendanceInput): Promise<AttendanceRecord | null> {
  await requireActionRole("admin");
  await simulateLatency(320);

  const record = db.attendance.find((r) => r.id === input.recordId);
  if (!record) return null;

  record.status = input.status;
  record.checkIn = input.checkIn ? new Date(input.checkIn).toISOString() : null;
  record.checkOut = input.checkOut ? new Date(input.checkOut).toISOString() : null;
  record.remarks = input.remarks?.trim() || undefined;

  if (record.checkIn && record.checkOut) {
    const hours = (new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / 3_600_000;
    record.workingHours = hours > 0 ? Number(hours.toFixed(2)) : null;
  } else {
    record.workingHours = null;
  }

  return record;
}
