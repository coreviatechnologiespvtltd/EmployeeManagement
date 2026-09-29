import { CheckCircle2, AlertTriangle, CircleDashed, XCircle, Clock, Plane, Ban, FileEdit, Send, Hourglass } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AttendanceStatus } from "@/types/attendance";
import type { AnnouncementPriority, AnnouncementStatus } from "@/types/announcement";
import type { LeaveStatus } from "@/types/leave";
import type { PaymentStatus } from "@/types/salary";
import type { TaskPriority, TaskStatus } from "@/types/task";
import type { EmployeeStatus } from "@/types/employee";

export type Tone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "orange"
  | "indigo";

export const toneClasses: Record<Tone, string> = {
  success: "bg-success-50 text-success-700 ring-success-500/20",
  warning: "bg-warning-50 text-warning-700 ring-warning-500/20",
  danger: "bg-danger-50 text-danger-700 ring-danger-500/20",
  info: "bg-brand-50 text-brand-700 ring-brand-500/20",
  neutral: "bg-ink-50 text-ink-600 ring-ink-300/30",
  orange: "bg-orange-50 text-orange-700 ring-orange-500/20",
  indigo: "bg-indigo-soft text-indigo-700 ring-indigo-500/20",
};

export interface StatusMeta {
  label: string;
  tone: Tone;
  icon: LucideIcon;
}

export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, StatusMeta> = {
  present: { label: "Present", tone: "success", icon: CheckCircle2 },
  absent: { label: "Absent", tone: "danger", icon: XCircle },
  late: { label: "Late", tone: "orange", icon: Clock },
  half_day: { label: "Half Day", tone: "indigo", icon: Hourglass },
  leave: { label: "Leave", tone: "info", icon: Plane },
};

export const TASK_STATUS_META: Record<TaskStatus, StatusMeta> = {
  pending: { label: "Pending", tone: "warning", icon: CircleDashed },
  in_progress: { label: "In Progress", tone: "info", icon: Hourglass },
  completed: { label: "Completed", tone: "success", icon: CheckCircle2 },
  overdue: { label: "Overdue", tone: "danger", icon: AlertTriangle },
};

export const TASK_PRIORITY_META: Record<TaskPriority, StatusMeta> = {
  low: { label: "Low", tone: "neutral", icon: CircleDashed },
  medium: { label: "Medium", tone: "info", icon: CircleDashed },
  high: { label: "High", tone: "orange", icon: AlertTriangle },
  urgent: { label: "Urgent", tone: "danger", icon: AlertTriangle },
};

export const LEAVE_STATUS_META: Record<LeaveStatus, StatusMeta> = {
  pending: { label: "Pending", tone: "warning", icon: Hourglass },
  approved: { label: "Approved", tone: "success", icon: CheckCircle2 },
  rejected: { label: "Rejected", tone: "danger", icon: Ban },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  paid: { label: "Paid", tone: "success", icon: CheckCircle2 },
  pending: { label: "Pending", tone: "warning", icon: Hourglass },
  processing: { label: "Processing", tone: "info", icon: CircleDashed },
};

export const ANNOUNCEMENT_PRIORITY_META: Record<AnnouncementPriority, StatusMeta> = {
  low: { label: "Low", tone: "neutral", icon: CircleDashed },
  normal: { label: "Normal", tone: "info", icon: CircleDashed },
  high: { label: "High", tone: "orange", icon: AlertTriangle },
  urgent: { label: "Urgent", tone: "danger", icon: AlertTriangle },
};

export const ANNOUNCEMENT_STATUS_META: Record<AnnouncementStatus, StatusMeta> = {
  published: { label: "Published", tone: "success", icon: Send },
  draft: { label: "Draft", tone: "neutral", icon: FileEdit },
  archived: { label: "Archived", tone: "warning", icon: Ban },
};

export const EMPLOYEE_STATUS_META: Record<EmployeeStatus, StatusMeta> = {
  active: { label: "Active", tone: "success", icon: CheckCircle2 },
  inactive: { label: "Inactive", tone: "neutral", icon: Ban },
};

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  annual: "Annual Leave",
  unpaid: "Unpaid Leave",
  maternity: "Maternity Leave",
};
