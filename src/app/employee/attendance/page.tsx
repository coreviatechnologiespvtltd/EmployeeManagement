import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/service";
import {
  getEmployeeAttendance,
  getAttendanceMonths,
  getAttendanceTrend,
  getEmployeeMonthlySummary,
  getTodayRecordForEmployee,
} from "@/lib/api/attendance";
import { AttendanceOverview } from "@/components/attendance/AttendanceOverview";
import { currentMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Attendance" };

export default async function EmployeeAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireRole("employee");
  const { month: requestedMonth } = await searchParams;
  const month = requestedMonth ?? currentMonth();

  const [todayRecord, summary, records, trend, months] = await Promise.all([
    getTodayRecordForEmployee(user.id),
    getEmployeeMonthlySummary(user.id, month),
    getEmployeeAttendance(user.id, month),
    getAttendanceTrend(user.id, 6),
    getAttendanceMonths(user.id),
  ]);

  return (
    <AttendanceOverview
      month={month}
      months={months}
      todayRecord={todayRecord}
      summary={summary}
      records={records}
      trend={trend}
      serverNow={new Date().toISOString()}
    />
  );
}