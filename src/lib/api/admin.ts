import "server-only";
import { requireRole } from "@/lib/auth/service";
import { getStaffCountByStatus } from "./employees";
import { getTodaysAttendanceStats, getDepartmentAttendanceBreakdown } from "./attendance";
import { getPendingLeaveCount, getRecentLeaves } from "./leaves";
import { getPayrollTotals } from "./salary";
import { getGlobalTaskCounts, getRecentTasks } from "./tasks";
import { getRecentAnnouncements } from "./announcements";
import { currentMonth } from "@/lib/format";

export async function getAdminDashboardData() {
  await requireRole("admin");

  const month = currentMonth();
  const [staff, todayStats, departments, pendingLeaves, recentLeaves, payroll, taskCounts, recentTasks, announcements] =
    await Promise.all([
      getStaffCountByStatus(),
      getTodaysAttendanceStats(),
      getDepartmentAttendanceBreakdown(),
      getPendingLeaveCount(),
      getRecentLeaves(6),
      getPayrollTotals(month),
      getGlobalTaskCounts(),
      getRecentTasks(5),
      getRecentAnnouncements(4),
    ]);

  return {
    staff,
    todayStats,
    departments,
    pendingLeaves,
    recentLeaves,
    payroll,
    taskCounts,
    recentTasks,
    announcements,
  };
}
