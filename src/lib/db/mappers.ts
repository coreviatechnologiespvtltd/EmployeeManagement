/**
 * Row -> domain type mappers.
 *
 * The database stores snake_case columns, `numeric` values and nullable
 * foreign keys. The rest of the app expects the camelCase domain types in
 * `src/types/*` with real numbers and no nulls. Every query that feeds the UI
 * passes through this file so those two worlds stay separated.
 *
 * `date` columns arrive as `YYYY-MM-DD` strings and `timestamptz` columns as
 * ISO strings, which is exactly what `formatDate` / `formatTime` already take.
 */

import type { Role } from "@/types/auth";
import type { Employee, EmployeeStatus } from "@/types/employee";
import type { Task, TaskPriority, TaskStatus } from "@/types/task";
import type { AttendanceRecord, AttendanceStatus } from "@/types/attendance";
import type { LeaveRequest, LeaveStatus, LeaveType } from "@/types/leave";
import type { PaymentStatus, SalaryRecord } from "@/types/salary";
import type {
  Announcement,
  AnnouncementPriority,
  AnnouncementStatus,
} from "@/types/announcement";

/** `numeric` comes back from node-postgres as a string; the app wants a number. */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** `date` -> the `YYYY-MM` key the whole app uses to address a payroll month. */
export function toMonthKey(value: string): string {
  return value.slice(0, 7);
}

/** `YYYY-MM` -> the first of that month, which is how the column is stored. */
export function toMonthStart(month: string): string {
  return `${month}-01`;
}

/** Drops `undefined` so an optional column is genuinely absent, not `null`. */
function optional<T>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined ? undefined : value;
}

/* -------------------------------------------------------------------------- */
/* Employees                                                                  */
/* -------------------------------------------------------------------------- */

/** An employee row with the department name joined in. */
export interface EmployeeSource {
  id: string;
  employeeCode: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  position: string;
  joiningDate: string;
  role: Role;
  status: EmployeeStatus;
  avatarUrl: string | null;
  basicSalary: string | number | null;
}

export function toEmployee(row: EmployeeSource): Employee {
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    username: row.username,
    email: row.email,
    phone: row.phone,
    address: row.address,
    department: row.department,
    position: row.position,
    joiningDate: row.joiningDate,
    role: row.role,
    status: row.status,
    avatarUrl: optional(row.avatarUrl),
    basicSalary: toNumber(row.basicSalary),
  };
}

/* -------------------------------------------------------------------------- */
/* Tasks                                                                      */
/* -------------------------------------------------------------------------- */

export interface TaskSource {
  id: string;
  title: string;
  description: string;
  assignedToId: string;
  assignedToName: string;
  assignedById: string;
  assignedByName: string;
  createdAt: string;
  startDate: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt: string | null;
}

export function toTask(row: TaskSource): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assignedToId: row.assignedToId,
    assignedToName: row.assignedToName,
    assignedById: row.assignedById,
    assignedByName: row.assignedByName,
    createdAt: row.createdAt,
    startDate: row.startDate,
    dueDate: row.dueDate,
    priority: row.priority,
    status: row.status,
    completedAt: optional(row.completedAt),
  };
}

/* -------------------------------------------------------------------------- */
/* Attendance                                                                 */
/* -------------------------------------------------------------------------- */

export interface AttendanceSource {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: string | number | null;
  status: AttendanceStatus;
  remarks: string | null;
}

export function toAttendanceRecord(row: AttendanceSource): AttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    department: row.department,
    date: row.workDate,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    workingHours: row.workingHours === null ? null : toNumber(row.workingHours),
    status: row.status,
    remarks: optional(row.remarks),
  };
}

/* -------------------------------------------------------------------------- */
/* Salary                                                                     */
/* -------------------------------------------------------------------------- */

export interface SalarySource {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  month: string;
  basicSalary: string | number | null;
  allowances: string | number | null;
  bonus: string | number | null;
  deductions: string | number | null;
  netSalary: string | number | null;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  remarks: string | null;
}

export function toSalaryRecord(row: SalarySource): SalaryRecord {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    department: row.department,
    month: toMonthKey(row.month),
    basicSalary: toNumber(row.basicSalary),
    allowances: toNumber(row.allowances),
    bonus: toNumber(row.bonus),
    deductions: toNumber(row.deductions),
    netSalary: toNumber(row.netSalary),
    paymentStatus: row.paymentStatus,
    paidAt: optional(row.paidAt),
    remarks: optional(row.remarks),
  };
}

/* -------------------------------------------------------------------------- */
/* Leave                                                                      */
/* -------------------------------------------------------------------------- */

export interface LeaveSource {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  appliedAt: string;
  status: LeaveStatus;
  adminComment: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
}

export function toLeaveRequest(row: LeaveSource): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    department: row.department,
    leaveType: row.leaveType,
    startDate: row.startDate,
    endDate: row.endDate,
    totalDays: row.totalDays,
    reason: row.reason,
    appliedAt: row.appliedAt,
    status: row.status,
    adminComment: optional(row.adminComment),
    reviewedAt: optional(row.reviewedAt),
    reviewedByName: optional(row.reviewedByName),
  };
}

/* -------------------------------------------------------------------------- */
/* Announcements                                                              */
/* -------------------------------------------------------------------------- */

export interface AnnouncementSource {
  id: string;
  title: string;
  description: string;
  body: string;
  authorId: string;
  authorName: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  publishedAt: string;
  expiresAt: string | null;
  readBy: string[];
}

export function toAnnouncement(row: AnnouncementSource): Announcement {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    body: row.body,
    authorId: row.authorId,
    authorName: row.authorName,
    priority: row.priority,
    status: row.status,
    publishedAt: row.publishedAt,
    expiresAt: row.expiresAt,
    readBy: row.readBy ?? [],
  };
}
