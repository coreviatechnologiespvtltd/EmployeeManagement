import type { Metadata } from "next";
import {
  countAttendance,
  getAllAttendance,
  getTodaysAttendanceStats,
  listAttendancePeople,
} from "@/lib/api/attendance";
import { getCompanyPolicy, getStandardShift } from "@/lib/api/settings";
import { requireRole } from "@/lib/auth/service";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import {
  AttendanceManagementTable,
  type AttendanceRegisterFilters,
} from "@/components/admin/AttendanceManagementTable";
import { ATTENDANCE_STATUSES } from "@/lib/constants";
import { lateCutoffLabel } from "@/lib/attendance-policy";
import { formatDate, localToday } from "@/lib/format";
import { CheckCircle2, Clock, CalendarMinus2, UserX } from "lucide-react";
import type { AttendanceStatus } from "@/types/attendance";

export const metadata: Metadata = { title: "Attendance Management" };

const STATUS_VALUES = new Set<string>(ATTENDANCE_STATUSES.map((s) => s.value));

/** First and last day of the current month, the register's default range. */
function currentMonthRange(): { from: string; to: string } {
  const today = localToday();
  const month = today.slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year!, monthNumber!, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export default async function AdminAttendanceManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; employee?: string; status?: string }>;
}) {
  await requireRole("admin");

  const params = await searchParams;
  const defaults = currentMonthRange();

  // Anything missing or unparseable falls back to the default range, and an
  // unrecognised status is treated as "all" rather than passed to the database.
  const filters: AttendanceRegisterFilters = {
    query: params.q?.trim() ?? "",
    from: isDate(params.from) ? params.from : defaults.from,
    to: isDate(params.to) ? params.to : defaults.to,
    employeeId: params.employee ?? "all",
    status: STATUS_VALUES.has(params.status ?? "") ? (params.status as AttendanceStatus) : "all",
  };

  const [records, totalCount, people, shift, policy, todayStats] = await Promise.all([
    getAllAttendance(filters),
    // Same date range, every other filter dropped, for the "x of y" line.
    countAttendance({ from: filters.from, to: filters.to }),
    listAttendancePeople(),
    getStandardShift(),
    getCompanyPolicy(),
    getTodaysAttendanceStats(),
  ]);

  const today = localToday();
  const attendanceRate =
    todayStats.total > 0
      ? Math.round(((todayStats.present + todayStats.late) / todayStats.total) * 100)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Management"
        description={`Company-wide attendance register covering ${formatDate(filters.from)} – ${formatDate(filters.to)}.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="On Time Today"
          value={todayStats.present}
          sublabel={
            attendanceRate === null
              ? "No attendance recorded today"
              : `${attendanceRate}% attendance rate`
          }
          icon={CheckCircle2}
          tone="success"
        />
        <DashboardCard
          label="Late Today"
          value={todayStats.late}
          sublabel={`Arrived after ${lateCutoffLabel(policy)}`}
          icon={Clock}
          tone="warning"
        />
        <DashboardCard
          label="Half Day"
          value={todayStats.halfDay}
          sublabel={`${todayStats.leave} on approved leave`}
          icon={CalendarMinus2}
          tone="info"
        />
        <DashboardCard
          label="Absent"
          value={todayStats.absent}
          sublabel={today}
          icon={UserX}
          tone="danger"
        />
      </div>

      {/* Remounting on the filter signature re-seeds the table's inputs from the
          URL, which is what the server actually used to build `records`. */}
      <AttendanceManagementTable
        key={filterSignature(filters)}
        records={records}
        people={people}
        filters={filters}
        totalCount={totalCount}
        defaultCheckIn={shift.checkIn}
        defaultCheckOut={shift.checkOut}
        policy={policy}
      />
    </div>
  );
}

/** `YYYY-MM-DD`, and a real date rather than something a browser produced. */
function isDate(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function filterSignature(filters: AttendanceRegisterFilters): string {
  return [filters.query, filters.from, filters.to, filters.employeeId, filters.status].join("|");
}