import { sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  announcementReads,
  announcements,
  attendanceRecords,
  departments,
  employees,
  leaveRequests,
  salaryRecords,
  tasks,
} from "./schema";
import type { TaskStatus } from "@/types/task";

/**
 * Reusable select projections and join targets.
 *
 * Every service module in `src/lib/api` selects through these so that the
 * denormalised fields the UI displays — `employeeName`, `department`,
 * `authorName`, `reviewedByName` — are always resolved by a join and can
 * never drift out of sync the way the mock's copied strings did.
 *
 * A task, a leave request and an announcement each reference `employees` more
 * than once, so those references use table aliases. An alias is a distinct
 * table object, which is what lets a single query join `employees` twice.
 */

export const taskAssignee = alias(employees, "task_assignee");
export const taskAssigner = alias(employees, "task_assigner");
export const leaveReviewer = alias(employees, "leave_reviewer");
export const announcementAuthor = alias(employees, "announcement_author");

/** Employees joined to their department. Always use this instead of `employees.*`. */
export const employeeSelection = {
  id: employees.id,
  employeeCode: employees.employeeCode,
  fullName: employees.fullName,
  username: employees.username,
  email: employees.email,
  phone: employees.phone,
  address: employees.address,
  department: departments.name,
  position: employees.position,
  joiningDate: employees.joiningDate,
  role: employees.role,
  status: employees.status,
  avatarUrl: employees.avatarUrl,
  basicSalary: employees.basicSalary,
};

/** A task with both parties' display names, and `overdue` derived in SQL. */
export const taskSelection = {
  id: tasks.id,
  title: tasks.title,
  description: tasks.description,
  assignedToId: tasks.assignedToId,
  assignedToName: taskAssignee.fullName,
  // The column is nullable so that deleting the assigning employee keeps the
  // task; the domain type is a plain string, so NULL reads as "".
  assignedById: sql<string>`coalesce(${tasks.assignedById}, '')`,
  assignedByName: sql<string>`coalesce(${taskAssigner.fullName}, 'Unknown')`.as("assigned_by_name"),
  createdAt: tasks.createdAt,
  startDate: tasks.startDate,
  dueDate: tasks.dueDate,
  priority: tasks.priority,
  // A past-due task that is not completed always reads as overdue, exactly as
  // the mock's `withEffectiveStatus` derived it.
  status:
    sql<TaskStatus>`case when ${tasks.status} <> 'completed' and ${tasks.dueDate} < current_date then 'overdue' else ${tasks.status} end`.as(
      "status",
    ),
  completedAt: tasks.completedAt,
};

export const attendanceSelection = {
  id: attendanceRecords.id,
  employeeId: attendanceRecords.employeeId,
  employeeName: employees.fullName,
  // The admin register searches and reports by username as well as by name,
  // and attendance is recorded for admins as well as for staff.
  employeeUsername: employees.username,
  employeeRole: employees.role,
  department: departments.name,
  workDate: attendanceRecords.workDate,
  checkIn: attendanceRecords.checkIn,
  checkOut: attendanceRecords.checkOut,
  workingHours: attendanceRecords.workingHours,
  status: attendanceRecords.status,
  remarks: attendanceRecords.remarks,
  createdAt: attendanceRecords.createdAt,
  updatedAt: attendanceRecords.updatedAt,
};

export const salarySelection = {
  id: salaryRecords.id,
  employeeId: salaryRecords.employeeId,
  employeeName: employees.fullName,
  department: departments.name,
  month: salaryRecords.month,
  basicSalary: salaryRecords.basicSalary,
  allowances: salaryRecords.allowances,
  bonus: salaryRecords.bonus,
  deductions: salaryRecords.deductions,
  netSalary: salaryRecords.netSalary,
  paymentStatus: salaryRecords.paymentStatus,
  paidAt: salaryRecords.paidAt,
  remarks: salaryRecords.remarks,
};

export const leaveSelection = {
  id: leaveRequests.id,
  employeeId: leaveRequests.employeeId,
  employeeName: employees.fullName,
  department: departments.name,
  leaveType: leaveRequests.leaveType,
  startDate: leaveRequests.startDate,
  endDate: leaveRequests.endDate,
  totalDays: leaveRequests.totalDays,
  reason: leaveRequests.reason,
  appliedAt: leaveRequests.appliedAt,
  status: leaveRequests.status,
  adminComment: leaveRequests.adminComment,
  reviewedAt: leaveRequests.reviewedAt,
  // NULL until an admin reviews the request (LEFT JOIN).
  reviewedByName: leaveReviewer.fullName,
};

export const announcementSelection = {
  id: announcements.id,
  title: announcements.title,
  description: announcements.description,
  body: announcements.body,
  // Nullable in the schema (an announcement outlives its author) but the
  // domain type is a plain string, so NULL reads as "".
  authorId: sql<string>`coalesce(${announcements.authorId}, '')`,
  authorName: sql<string>`coalesce(${announcementAuthor.fullName}, 'Unknown')`.as("author_name"),
  priority: announcements.priority,
  status: announcements.status,
  publishedAt: announcements.publishedAt,
  expiresAt: announcements.expiresAt,
  // Replaces the mock's `readBy: string[]` array with a real aggregate over
  // the junction table. `AnnouncementManagement` renders `.length`.
  readBy: sql<string[]>`coalesce((
    select array_agg(${announcementReads.employeeId})
    from ${announcementReads}
    where ${announcementReads.announcementId} = ${announcements.id}
  ), '{}'::text[])`.as("read_by"),
};
