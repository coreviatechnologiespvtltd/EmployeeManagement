import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { SectionCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LineChart } from "@/components/charts/LineChart";
import { AttendanceClock } from "@/components/attendance/AttendanceClock";
import { AttendanceMonthSelect } from "@/components/attendance/AttendanceMonthSelect";
import { AttendanceTable } from "@/components/attendance/AttendanceTable";
import { formatDate, formatHours, formatNumber, monthLabel } from "@/lib/format";
import { CheckCircle2, Clock, CalendarOff, CalendarX2, Timer } from "lucide-react";
import type { AttendanceRecord, MonthlyAttendanceSummary } from "@/types/attendance";

/**
 * One person's attendance: clock in/out for today, a monthly summary, a trend
 * and the full history for the selected month.
 *
 * The employee page and the admin's own Attendance tab render this with the
 * signed-in user's records, so the two are identical by construction and an
 * admin sees exactly what their staff see.
 */
export function AttendanceOverview({
  month,
  months,
  todayRecord,
  summary,
  records,
  trend,
  serverNow,
}: {
  month: string;
  months: string[];
  todayRecord: AttendanceRecord | null;
  summary: MonthlyAttendanceSummary;
  records: AttendanceRecord[];
  trend: MonthlyAttendanceSummary[];
  /** Server-rendered "now", handed to the clock so hydration matches. */
  serverNow: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description={`Your attendance record for ${monthLabel(month)}.`}
      />

      <SectionCard
        title="Today's Attendance"
        description={formatDate(serverNow, {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
      >
        <AttendanceClock record={todayRecord} serverNow={serverNow} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="On-Time Days" value={summary.present} icon={CheckCircle2} tone="success" />
        <DashboardCard label="Late Days" value={summary.late} icon={Clock} tone="orange" />
        <DashboardCard label="Leave Days" value={summary.leave} icon={CalendarOff} tone="info" />
        <DashboardCard label="Absent Days" value={summary.absent} icon={CalendarX2} tone="danger" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <SectionCard className="lg:col-span-3" title="Monthly Summary" description={summary.monthLabel}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Metric label="Total working days" value={formatNumber(summary.totalWorkingDays)} />
            <Metric label="Total hours" value={`${summary.totalHours} hrs`} />
            <Metric label="Average hours / day" value={formatHours(summary.averageHours)} />
            <Metric label="Half days" value={summary.halfDay} />
            <Metric
              label="Attendance rate"
              value={`${summary.totalWorkingDays ? Math.round(((summary.present + summary.late) / summary.totalWorkingDays) * 100) : 0}%`}
            />
            <Metric label="Period" value={monthLabel(month, "short")} />
          </div>
        </SectionCard>

        <SectionCard
          className="lg:col-span-2"
          title="Attendance Trend"
          description="Days attended over the last 6 months"
        >
          <LineChart
            data={trend.map((item) => ({
              label: monthLabel(item.month, "short").split(" ")[0] ?? item.month,
              value: item.present + item.late,
            }))}
            valueFormat="days"
            height={200}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Attendance History"
        description={`Daily records for ${monthLabel(month)}`}
        bodyClassName="p-0"
        action={<AttendanceMonthSelect months={months} month={month} />}
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