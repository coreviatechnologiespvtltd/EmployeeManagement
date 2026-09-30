export const APP_NAME = "Corevia Technologies";
export const APP_SYSTEM_NAME = "Employee Management System";
export const SESSION_COOKIE_NAME = "corevia_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

// Departments are database records, not a constant — see the `departments`
// table and `listDepartments()` in `lib/api/employees`. Positions stay here
// because they are job titles rather than managed rows.
export const POSITIONS = [
  "Software Engineer",
  "Senior Software Engineer",
  "Team Lead",
  "QA Engineer",
  "HR Executive",
  "Accountant",
  "Sales Executive",
  "Marketing Specialist",
  "Support Agent",
  "Operations Manager",
] as const;

export const LEAVE_TYPES = [
  { value: "casual", label: "Casual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "annual", label: "Annual Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "maternity", label: "Maternity Leave" },
] as const;

export const TASK_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export const TASK_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
] as const;

export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half Day" },
  { value: "leave", label: "Leave" },
] as const;

export const ANNOUNCEMENT_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export const ANNOUNCEMENT_STATUSES = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
] as const;

export const PAYMENT_STATUSES = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
] as const;

// Company policy lives in the `company_settings` table so it can be changed with
// an UPDATE instead of a redeploy. These values are the fallback used when the
// settings rows are missing — read them through `getCompanyPolicy()` in
// `lib/api/settings`, never directly.
export const LEAVE_ALLOCATION_DAYS = 18;
export const WORKDAY_START = "09:00";
export const LATE_THRESHOLD_MINUTES = 15;
export const STANDARD_WORKING_HOURS = 8;

export const COMPANY_EMAIL_DOMAIN = "corevia.com";
