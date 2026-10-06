import type { Metadata } from "next";
import Link from "next/link";
import { getEmployeeDashboardData, greetingForHour } from "@/lib/api/dashboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable, FLUSH_IN_CARD } from "@/components/ui/DataTable";
import { AnnouncementList } from "@/components/employee/AnnouncementList";
import { TaskCard } from "@/components/employee/TaskCard";
import { CheckCircle2, ListTodo, Plane, Wallet, TrendingUp, CalendarCheck2, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatDate, formatTime, formatNumber } from "@/lib/format";
import { LEAVE_STATUS_META, PAYMENT_STATUS_META, LEAVE_TYPE_LABELS } from "@/lib/status";
import type { LeaveRequest } from "@/types/leave";
import type { PaymentStatus } from "@/types/salary";

export const metadata: Metadata = { title: "Dashboard" };

export default async function EmployeeDashboardPage() {
  const data = await getEmployeeDashboardData();
  const greeting = greetingForHour(new Date().getHours());
  const firstName = data.user.name.split(" ")[0];
  const payment = PAYMENT_STATUS_META[data.salary.paymentStatus as PaymentStatus] ?? PAYMENT_STATUS_META.pending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description="Here's what's happening with your work today."
        action={
          <Link
            href="/employee/todo"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 transition-colors hover:text-brand-800"
          >
            View all tasks
            <ArrowUpRight aria-hidden className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Today's Status"
          value={data.attendance.statusLabel}
          sublabel={data.attendance.checkIn ? `Checked in at ${formatTime(data.attendance.checkIn)}` : "No check-in recorded"}
          icon={CheckCircle2}
          tone={data.attendance.tone}
        />
        <DashboardCard
          label="Pending Tasks"
          value={formatNumber(data.taskCounts.pending + data.taskCounts.inProgress)}
          sublabel={`${data.taskCounts.overdue} overdue · ${data.taskCounts.completed} completed`}
          icon={ListTodo}
          tone="info"
          href="/employee/todo"
        />
        <DashboardCard
          label="Leave Balance"
          value={`${data.leaveBalance.remaining} Days`}
          sublabel={`${data.leaveBalance.used} used of ${data.leaveBalance.total} · ${data.leaveBalance.pending} pending`}
          icon={Plane}
          tone="warning"
          href="/employee/leaves"
        />
        <DashboardCard
          label="Earnings Till Date"
          value={formatCurrency(data.earnings.total)}
          sublabel={`${formatCurrency(data.earnings.currentMonth)} this month`}
          icon={TrendingUp}
          tone="success"
          href="/employee/earnings"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Announcements"
          description="Latest company updates"
          bodyClassName="p-0"
          action={
            <Link href="/employee/notices" className="text-xs font-medium text-brand-700 hover:text-brand-800">
              View all
            </Link>
          }
        >
          {data.notices.latest.length === 0 ? (
            <EmptyState
              title="No announcements"
              description="Company announcements will appear here once published."
              className="py-10"
            />
          ) : (
            <AnnouncementList notices={data.notices.latest} />
          )}
        </SectionCard>

        <SectionCard title="This Month" description="Your salary and attendance at a glance">
          <div className="space-y-5">
            <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-ink-800">
                  <Wallet aria-hidden className="h-4 w-4 text-brand-600" />
                  Current month salary
                </div>
                <Badge tone={payment.tone}>{payment.label}</Badge>
              </div>
              <p className="mt-2 text-xl font-semibold text-ink-900">{formatCurrency(data.salary.netSalary)}</p>
              <Link href="/employee/salary" className="mt-1 inline-block text-xs text-brand-700 hover:text-brand-800">
                View salary breakdown
              </Link>
            </div>

            <div className="space-y-3">
              <AttendanceRow icon={<CalendarCheck2 aria-hidden className="h-4 w-4 text-success-600" />} label="Present days" value={data.attendance.presentDays} />
              <AttendanceRow icon={<CalendarCheck2 aria-hidden className="h-4 w-4 text-orange-500" />} label="Late days" value={data.attendance.lateDays} />
              <AttendanceRow icon={<CalendarCheck2 aria-hidden className="h-4 w-4 text-brand-500" />} label="Leave days" value={data.attendance.leaveDays} />
              <AttendanceRow icon={<CalendarCheck2 aria-hidden className="h-4 w-4 text-danger-500" />} label="Absent days" value={data.attendance.absentDays} />
            </div>

            <ProgressBar
              value={data.attendance.presentDays + data.attendance.lateDays}
              max={Math.max(data.attendance.totalLoggedDays, 1)}
              label="Days attended"
              tone="brand"
            />
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Recent Tasks"
          description="Your latest assigned work"
          action={
            <Link href="/employee/todo" className="text-xs font-medium text-brand-700 hover:text-brand-800">
              View all
            </Link>
          }
        >
          {data.recentTasks.length === 0 ? (
            <EmptyState icon={ListTodo} title="No tasks assigned" description="You have nothing on your plate right now." className="py-8" />
          ) : (
            <ul className="space-y-3">
              {data.recentTasks.map((task) => (
                <li key={task.id}>
                  <TaskCard task={task} href={`/employee/todo/${task.id}`} compact />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Leave Requests"
          description="Your most recent applications"
          action={
            <Link href="/employee/leaves" className="text-xs font-medium text-brand-700 hover:text-brand-800">
              View all
            </Link>
          }
          bodyClassName="p-0"
        >
          {data.recentLeaves.length === 0 ? (
            <EmptyState icon={Plane} title="No leave requests" description="Submitted requests will be listed here." className="py-10" />
          ) : (
            <DataTable
              rows={data.recentLeaves}
              getRowKey={(row: LeaveRequest) => row.id}
              className={FLUSH_IN_CARD}
              columns={[
                {
                  key: "type",
                  header: "Type",
                  render: (row: LeaveRequest) => (
                    <span className="font-medium whitespace-nowrap text-ink-800">
                      {LEAVE_TYPE_LABELS[row.leaveType]}
                    </span>
                  ),
                },
                {
                  key: "dates",
                  header: "Dates",
                  render: (row: LeaveRequest) => (
                    <span className="whitespace-nowrap">
                      {formatDate(row.startDate, { day: "2-digit", month: "short" })} – {formatDate(row.endDate, { day: "2-digit", month: "short" })}
                    </span>
                  ),
                },
                { key: "days", header: "Days", render: (row: LeaveRequest) => row.totalDays },
                {
                  key: "status",
                  header: "Status",
                  render: (row: LeaveRequest) => (
                    <Badge tone={LEAVE_STATUS_META[row.status].tone}>{LEAVE_STATUS_META[row.status].label}</Badge>
                  ),
                },
              ]}
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function AttendanceRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-ink-600">
        {icon}
        {label}
      </span>
      <span className="font-medium text-ink-900">{value}</span>
    </div>
  );
}
