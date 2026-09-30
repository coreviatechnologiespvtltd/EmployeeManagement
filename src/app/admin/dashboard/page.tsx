import type { Metadata } from "next";
import Link from "next/link";
import { getAdminDashboardData } from "@/lib/api/admin";
import { getRecentStaff } from "@/lib/api/employees";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { SectionCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmployeeAvatar } from "@/components/ui/EmployeeAvatar";
import { DonutChart } from "@/components/charts/DonutChart";
import { BarChart } from "@/components/charts/BarChart";
import { AnnouncementCard } from "@/components/employee/AnnouncementCard";
import { LEAVE_STATUS_META, TASK_STATUS_META, TASK_PRIORITY_META } from "@/lib/status";
import { formatCurrency, formatDate, monthLabel, currentMonth, formatRelative } from "@/lib/format";
import { Users, CalendarCheck2, Plane, WalletCards, ListTodo, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();
  const recentStaff = await getRecentStaff(5);

  const { staff, todayStats, departments, pendingLeaves, recentLeaves, payroll, taskCounts, recentTasks, announcements } =
    data;

  // With nobody recorded today there is no rate to report, so the cards fall back
// to "no records" rather than dividing by an invented denominator.
const attendanceTotal = todayStats.total;
const attendanceRate =
  attendanceTotal > 0 ? Math.round(((todayStats.present + todayStats.late) / attendanceTotal) * 100) : null;
  const attendanceChart = [
    { label: "Present", value: todayStats.present, color: "var(--color-success-500)" },
    { label: "Late", value: todayStats.late, color: "var(--color-warning-500)" },
    { label: "Half Day", value: todayStats.halfDay, color: "var(--color-brand-400)" },
    { label: "Leave", value: todayStats.leave, color: "var(--color-ink-400)" },
    { label: "Absent", value: todayStats.absent, color: "var(--color-danger-500)" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Workforce overview for ${monthLabel(currentMonth())}.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/staff/register">
              <Button>
                <Users aria-hidden className="h-4 w-4" />
                Register Staff
              </Button>
            </Link>
            <Link href="/admin/tasks/create">
              <Button variant="outline">
                <ListTodo aria-hidden className="h-4 w-4" />
                Assign Task
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Total Staff"
          value={staff.total}
          sublabel={`${staff.active} active · ${staff.inactive} inactive`}
          icon={Users}
          tone="info"
          href="/admin/staff"
        />
        <DashboardCard
          label="Present Today"
          value={
            attendanceTotal > 0
              ? `${todayStats.present}/${attendanceTotal}`
              : `${todayStats.present}/0`
          }
          sublabel={
            attendanceRate === null
              ? "No attendance recorded today"
              : `${attendanceRate}% attendance rate`
          }
          icon={CalendarCheck2}
          tone="success"
          href="/admin/attendance"
        />
        <DashboardCard
          label="Pending Leaves"
          value={pendingLeaves}
          sublabel="Awaiting your decision"
          icon={Plane}
          tone={pendingLeaves > 0 ? "warning" : "neutral"}
          href="/admin/leaves"
        />
        <DashboardCard
          label="Payroll (This Month)"
          value={formatCurrency(payroll.net)}
          sublabel={`${payroll.paid} of ${payroll.employees} paid`}
          icon={WalletCards}
          tone="info"
          href="/admin/salary"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard title="Today's Attendance" description="Live status across all departments">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <DonutChart
              size={160}
              centerLabel="Present"
              centerValue={`${todayStats.present}/${todayStats.total}`}
              data={attendanceChart.filter((item) => item.value > 0)}
            />
            <ul className="w-full space-y-2">
              {attendanceChart.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-ink-600">
                    <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
                    {item.label}
                  </span>
                  <span className="font-medium text-ink-900">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="Department Attendance" description="Present days recorded today">
          <BarChart
            data={departments
              .slice(0, 6)
              .map((d) => ({ label: d.department, value: d.present }))}
            height={220}
          />
        </SectionCard>

        <SectionCard title="Task Overview" description="All staff tasks" className="lg:col-span-1">
          <ul className="space-y-3">
            {(["pending", "in_progress", "completed", "overdue"] as const).map((status) => {
              const meta = TASK_STATUS_META[status];
              const count =
                status === "in_progress" ? taskCounts.inProgress : taskCounts[status];
              const total = taskCounts.total || 1;
              return (
                <li key={status}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink-600">{meta.label}</span>
                    <span className="text-sm font-semibold text-ink-900">{count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round((count / total) * 100))}%`,
                        background: `var(--color-${meta.tone === "neutral" ? "ink-400" : `${meta.tone}-500`})`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <Link
            href="/admin/tasks"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            Manage all tasks
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Recent Leave Requests"
          description="Latest applications from staff"
          action={
            <Link href="/admin/leaves" className="text-xs font-medium text-brand-700 hover:text-brand-800">
              View all
            </Link>
          }
          bodyClassName="p-0"
        >
          {recentLeaves.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-500">No leave requests yet.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {recentLeaves.slice(0, 5).map((leave) => {
                const meta = LEAVE_STATUS_META[leave.status];
                return (
                  <li key={leave.id} className="flex items-center gap-3 px-5 py-3.5">
                    <EmployeeAvatar name={leave.employeeName} size="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{leave.employeeName}</p>
                      <p className="truncate text-xs text-ink-500">
                        {formatDate(leave.startDate)}
                        {leave.endDate !== leave.startDate && ` – ${formatDate(leave.endDate)}`} · {leave.totalDays}d
                      </p>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Recently Joined Staff"
          description="Latest additions to the team"
          action={
            <Link href="/admin/staff" className="text-xs font-medium text-brand-700 hover:text-brand-800">
              View all
            </Link>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-ink-100">
            {recentStaff.map((employee) => (
              <li key={employee.id} className="flex items-center gap-3 px-5 py-3.5">
                <EmployeeAvatar name={employee.fullName} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{employee.fullName}</p>
                  <p className="truncate text-xs text-ink-500">
                    {employee.position} · {employee.department}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone={employee.status === "active" ? "success" : "neutral"}>{employee.status}</Badge>
                  <p className="mt-1 text-[11px] text-ink-400">{formatRelative(employee.joiningDate)}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Recently Assigned Tasks"
        description="Latest activity across staff to-do lists"
        action={
          <Link href="/admin/tasks" className="text-xs font-medium text-brand-700 hover:text-brand-800">
            View all
          </Link>
        }
        bodyClassName="p-0"
      >
        {recentTasks.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-500">No tasks have been assigned yet.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {recentTasks.map((task) => {
              const statusMeta = TASK_STATUS_META[task.status];
              const priorityMeta = TASK_PRIORITY_META[task.priority];
              return (
                <li key={task.id} className="flex items-center gap-3 px-5 py-3.5">
                  <EmployeeAvatar name={task.assignedToName} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{task.title}</p>
                    <p className="truncate text-xs text-ink-500">
                      {task.assignedToName} · due {formatDate(task.dueDate)}
                    </p>
                  </div>
                  <Badge tone={priorityMeta.tone} className="hidden sm:inline-flex">
                    {priorityMeta.label}
                  </Badge>
                  <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Latest Announcements"
        description="Most recent published notices"
        action={
          <Link href="/admin/announcements" className="text-xs font-medium text-brand-700 hover:text-brand-800">
            Manage
          </Link>
        }
      >
        {announcements.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">No published announcements yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {announcements.map((notice) => (
              <AnnouncementCard
                key={notice.id}
                notice={{
                  id: notice.id,
                  title: notice.title,
                  description: notice.description,
                  publishedAt: notice.publishedAt,
                  authorName: notice.authorName,
                  priority: notice.priority,
                  isRead: notice.isRead,
                }}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
