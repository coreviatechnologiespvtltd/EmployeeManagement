import "server-only";

import { getTaskCountsForEmployee, getRecentTasksForEmployee, type TaskCounts } from "./tasks";
import { getTodayRecordForEmployee, getEmployeeMonthlySummary } from "./attendance";
import { getSalaryForMonth, getEarningsSummary } from "./salary";
import { getLeaveBalance, listLeavesForEmployee } from "./leaves";
import { listNoticesForEmployee, getUnreadNoticeCount } from "./announcements";
import { getEmployeeById } from "./employees";
import { currentMonth } from "@/lib/format";
import { requireRole } from "@/lib/auth/service";
import type { AuthUser } from "@/types/auth";
import type { Employee } from "@/types/employee";

export interface EmployeeDashboardData {
  user: AuthUser;
  attendance: {
    statusLabel: string;
    tone: "success" | "orange" | "danger" | "info" | "neutral";
    checkIn: string | null;
    workingHours: number | null;
    presentDays: number;
    lateDays: number;
    leaveDays: number;
    absentDays: number;
    totalLoggedDays: number;
  };
  taskCounts: TaskCounts;
  leaveBalance: Awaited<ReturnType<typeof getLeaveBalance>>;
  salary: { month: string; netSalary: number; paymentStatus: string };
  earnings: { total: number; currentMonth: number };
  notices: { unread: number; latest: Awaited<ReturnType<typeof listNoticesForEmployee>> };
  recentTasks: Awaited<ReturnType<typeof getRecentTasksForEmployee>>;
  recentLeaves: Awaited<ReturnType<typeof listLeavesForEmployee>>;
}

const STATUS_PRESENTATION: Record<
  string,
  { label: string; tone: EmployeeDashboardData["attendance"]["tone"] }
> = {
  present: { label: "Present", tone: "success" },
  late: { label: "Late", tone: "orange" },
  absent: { label: "Absent", tone: "danger" },
  half_day: { label: "Half Day", tone: "info" },
  leave: { label: "On Leave", tone: "info" },
};

/**
 * Assembles the employee dashboard.
 *
 * This module orchestrates and joins nothing itself — every figure comes from a
 * service in `src/lib/api/*`, which keeps the queries in one place and means
 * the dashboard and the detail pages can never disagree. The fan-out below
 * issues its queries concurrently against a single pooled connection.
 */
export async function getEmployeeDashboardData(): Promise<EmployeeDashboardData> {
  const user = await requireRole("employee");

  const month = currentMonth();
  const [todayRecord, summary, taskCounts, recentTasks, leaveBalance, recentLeaves, salary, earnings, notices, unread] =
    await Promise.all([
      getTodayRecordForEmployee(user.id),
      getEmployeeMonthlySummary(user.id, month),
      getTaskCountsForEmployee(user.id),
      getRecentTasksForEmployee(user.id, 4),
      getLeaveBalance(user.id),
      listLeavesForEmployee(user.id),
      getSalaryForMonth(user.id, month),
      getEarningsSummary(user.id),
      listNoticesForEmployee(user.id),
      getUnreadNoticeCount(user.id),
    ]);

  const presentation = todayRecord
    ? (STATUS_PRESENTATION[todayRecord.status] ?? { label: "Not Marked", tone: "neutral" as const })
    : { label: "Not Marked", tone: "neutral" as const };

  return {
    user,
    attendance: {
      statusLabel: presentation.label,
      tone: presentation.tone,
      checkIn: todayRecord?.checkIn ?? null,
      workingHours: todayRecord?.workingHours ?? null,
      presentDays: summary.present,
      lateDays: summary.late,
      leaveDays: summary.leave,
      absentDays: summary.absent,
      totalLoggedDays: summary.totalWorkingDays,
    },
    taskCounts,
    leaveBalance,
    salary: {
      month,
      netSalary: salary?.netSalary ?? 0,
      paymentStatus: salary?.paymentStatus ?? "pending",
    },
    earnings: { total: earnings.total, currentMonth: earnings.current?.netSalary ?? 0 },
    notices: { unread, latest: notices.slice(0, 3) },
    recentTasks,
    recentLeaves: recentLeaves.slice(0, 4),
  };
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export async function getEmployeeRecord(employeeId: string): Promise<Employee | null> {
  return getEmployeeById(employeeId);
}