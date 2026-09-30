import "server-only";
import { requireRole } from "@/lib/auth/service";
import { getStaffCountByStatus } from "./employees";
import { getTodaysAttendanceStats, getDepartmentAttendanceBreakdown } from "./attendance";
import { getPendingLeaveCount, getRecentLeaves } from "./leaves";
import { getPayrollTotals } from "./salary";
import { getGlobalTaskCounts, getRecentTasks } from "./tasks";
import { getRecentAnnouncementsWithRead } from "./announcements";
import { currentMonth } from "@/lib/format";

export async function getAdminDashboardData() {
  await requireRole("admin");

  const user = await requireRole("admin");
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
      // Read state is per person, so it is resolved for the signed-in admin
      // rather than hardcoded to "read" in the view.
      getRecentAnnouncementsWithRead(user.id, 4),
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
