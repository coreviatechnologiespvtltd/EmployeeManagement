import type { Metadata } from "next";
import { getAllAttendance } from "@/lib/api/attendance";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { AttendanceManagementTable } from "@/components/admin/AttendanceManagementTable";
import { CheckCircle2, Clock, CalendarMinus2, UserX } from "lucide-react";
import { today, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Attendance Management" };

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: requestedDate } = await searchParams;
  const date = requestedDate ?? today();

  // The register needs every known date for the picker, but only one day of rows.
  const [allRecords, records] = await Promise.all([
    getAllAttendance(),
    getAllAttendance({ date }),
  ]);
  const availableDates = Array.from(new Set(allRecords.map((r) => r.date))).sort().reverse();

  const count = (status: string) => records.filter((r) => r.status === status).length;
  const total = records.length;
  const rate = total > 0 ? Math.round(((count("present") + count("late")) / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Management"
        description={`Daily attendance register for ${formatDate(date, { day: "2-digit", month: "long", year: "numeric" })}.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Present"
          value={count("present")}
          sublabel={`${rate}% attendance rate`}
          icon={CheckCircle2}
          tone="success"
        />
        <DashboardCard label="Late" value={count("late")} icon={Clock} tone="warning" />
        <DashboardCard
          label="Half Day"
          value={count("half_day")}
          sublabel={`${count("leave")} on approved leave`}
          icon={CalendarMinus2}
          tone="info"
        />
        <DashboardCard label="Absent" value={count("absent")} icon={UserX} tone="danger" />
      </div>

      {total === 0 && availableDates.length === 0 ? (
        <div className="rounded-card border border-ink-100 bg-white py-14 text-center shadow-card">
          <p className="text-sm font-semibold text-ink-900">No attendance recorded yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
            Attendance records will appear here once staff check-in data is available.
          </p>
        </div>
      ) : (
        <AttendanceManagementTable
          records={records}
          availableDates={availableDates.length > 0 ? availableDates : [date]}
          selectedDate={date}
        />
      )}
    </div>
  );
}
