import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/service";
import {
  getEmployeeAttendance,
  getEmployeeMonthlySummary,
  getTodayRecordForEmployee,
  getAttendanceTrend,
} from "@/lib/api/attendance";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { SectionCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LineChart } from "@/components/charts/LineChart";
import { AttendanceTable } from "@/components/employee/AttendanceTable";
import { monthLabel, currentMonth, formatDate, formatTime, formatHours, formatNumber } from "@/lib/format";
import { ATTENDANCE_STATUS_META } from "@/lib/status";
import { CheckCircle2, Clock, CalendarOff, CalendarX2, Timer } from "lucide-react";

export const metadata: Metadata = { title: "Attendance" };

export default async function EmployeeAttendancePage() {
  const user = await requireRole("employee");
  const month = currentMonth();

  const [todayRecord, summary, records, trend] = await Promise.all([
    getTodayRecordForEmployee(user.id),
    getEmployeeMonthlySummary(user.id, month),
    getEmployeeAttendance(user.id, month),
    getAttendanceTrend(user.id, 6),
  ]);

  const status = todayRecord ? ATTENDANCE_STATUS_META[todayRecord.status] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description={`Your attendance record for ${monthLabel(month)}.`}
      />

      <SectionCard title="Today's Attendance" description={formatDate(new Date().toISOString(), { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}>
        {todayRecord ? (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            <Metric label="Status" value={<Badge tone={status!.tone} icon={status!.icon}>{status!.label}</Badge>} />
            <Metric label="Check-in" value={formatTime(todayRecord.checkIn)} />
            <Metric label="Check-out" value={formatTime(todayRecord.checkOut)} />
            <Metric label="Working hours" value={formatHours(todayRecord.workingHours)} />
          </div>
        ) : (
          <EmptyState
            icon={CalendarOff}
            title="No attendance recorded today"
            description="Your check-in has not been recorded yet. Contact your administrator if you believe this is an error."
            className="py-8"
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Present Days" value={summary.present} icon={CheckCircle2} tone="success" />
        <DashboardCard label="Late Days" value={summary.late} icon={Clock} tone="orange" />
        <DashboardCard label="Leave Days" value={summary.leave} icon={CalendarOff} tone="info" />
        <DashboardCard label="Absent Days" value={summary.absent} icon={CalendarX2} tone="danger" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <SectionCard
          className="lg:col-span-3"
          title="Monthly Summary"
          description={summary.monthLabel}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Metric label="Total working days" value={formatNumber(summary.totalWorkingDays)} />
            <Metric label="Total hours" value={`${summary.totalHours} hrs`} />
            <Metric label="Average hours / day" value={formatHours(summary.averageHours)} />
            <Metric label="Half days" value={summary.halfDay} />
            <Metric label="Attendance rate" value={`${summary.totalWorkingDays ? Math.round(((summary.present + summary.late) / summary.totalWorkingDays) * 100) : 0}%`} />
            <Metric label="Period" value={monthLabel(month, "short")} />
          </div>
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title="Attendance Trend"
          description="Days attended over the last 6 months"
        >
          <LineChart
            data={trend.map((item) => ({ label: monthLabel(item.month, "short").split(" ")[0] ?? item.month, value: item.present + item.late }))}
            valueFormat="days"
            height={200}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Attendance History"
        description={`Daily records for ${monthLabel(month)}`}
        bodyClassName="p-0"
      >
        {records.length === 0 ? (
          <EmptyState
            icon={Timer}
            title="No attendance records"
            description="There are no attendance entries for this month yet."
            className="py-12"
          />
        ) : (
          <AttendanceTable records={records} />
        )}
      </SectionCard>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
