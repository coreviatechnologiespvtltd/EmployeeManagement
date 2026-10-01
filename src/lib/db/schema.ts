import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Typed PostgreSQL schema.
 *
 * This file is the single source of truth for the query layer. The canonical
 * DDL lives in `supabase/migrations/`; the two are kept in sync by hand and
 * verified with `npm run db:check`.
 *
 * Conventions
 * - Primary keys are `text` so that the public identifiers keep the shape the
 *   app already uses (`emp-1001`, `tsk-3001`, ...). Values come from
 *   per-table sequences declared in the migration, never from the client.
 * - Money and hours are `numeric`. node-postgres returns them as strings, so
 *   every read goes through `toNumber()` in `./mappers`.
 * - `date` columns are plain calendar dates and come back as `YYYY-MM-DD`
 *   strings; `timestamp` columns are `timestamptz` and come back as ISO
 *   strings. Both shapes are exactly what the UI helpers in `@/lib/format`
 *   already expect, so no formatting changes are needed anywhere.
 * - Password hashes live in `user_credentials`, never on `employees`, so that
 *   no employee query can accidentally select a credential.
 */

const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();

/* -------------------------------------------------------------------------- */
/* Reference data                                                             */
/* -------------------------------------------------------------------------- */

export const departments = pgTable(
  "departments",
  {
    id: text("id").primaryKey().default(sql`'dept-' || nextval('departments_id_seq')`),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("departments_name_key").on(table.name)],
);

export const companySettings = pgTable("company_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  label: text("label").notNull(),
  updatedAt: updatedAt(),
});

export const salaryComponentTemplates = pgTable(
  "salary_component_templates",
  {
    id: text("id")
      .primaryKey()
      .default(sql`'sct-' || nextval('salary_component_templates_id_seq')`),
    kind: text("kind", { enum: ["allowance", "deduction"] }).notNull(),
    label: text("label").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [uniqueIndex("salary_component_templates_kind_label_key").on(table.kind, table.label)],
);

/* -------------------------------------------------------------------------- */
/* Identity                                                                   */
/* -------------------------------------------------------------------------- */

export const employees = pgTable(
  "employees",
  {
    id: text("id").primaryKey().default(sql`'emp-' || nextval('employees_id_seq')`),
    employeeCode: text("employee_code").notNull(),
    fullName: text("full_name").notNull(),
    username: text("username").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    position: text("position").notNull(),
    joiningDate: date("joining_date").notNull(),
    role: text("role", { enum: ["employee", "admin"] }).notNull().default("employee"),
    status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
    avatarUrl: text("avatar_url"),
    basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull().default("0"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("employees_employee_code_key").on(table.employeeCode),
    // Case-insensitive uniqueness mirrors the lookup performed at sign-in.
    uniqueIndex("employees_username_key").on(sql`lower(${table.username})`),
    uniqueIndex("employees_email_key").on(sql`lower(${table.email})`),
    index("employees_department_id_idx").on(table.departmentId),
    index("employees_status_idx").on(table.status),
    index("employees_role_idx").on(table.role),
    index("employees_joining_date_idx").on(table.joiningDate),
  ],
);

/** One credential row per employee. Selected only by the auth layer. */
export const userCredentials = pgTable("user_credentials", {
  employeeId: text("employee_id")
    .primaryKey()
    .references(() => employees.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  passwordUpdatedAt: timestamp("password_updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "string" }),
  updatedAt: updatedAt(),
});

/**
 * Sessions are keyed by `sha256(rawToken)`, never the raw token, so that a
 * database leak cannot be replayed as a live session.
 */
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sessions_employee_id_idx").on(table.employeeId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Work                                                                       */
/* -------------------------------------------------------------------------- */

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey().default(sql`'tsk-' || nextval('tasks_id_seq')`),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    assignedToId: text("assigned_to_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    assignedById: text("assigned_by_id").references(() => employees.id, { onDelete: "set null" }),
    startDate: date("start_date").notNull(),
    dueDate: date("due_date").notNull(),
    priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
    // `overdue` is normally derived (see `withEffectiveStatus` in lib/api/tasks)
    // but is accepted as a stored value so the existing status controls and
    // the `updateTaskStatusSchema` validator keep working unchanged.
    status: text("status", { enum: ["pending", "in_progress", "completed", "overdue"] })
      .notNull()
      .default("pending"),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("tasks_assigned_to_id_idx").on(table.assignedToId, table.dueDate),
    index("tasks_status_idx").on(table.status),
    index("tasks_due_date_idx").on(table.dueDate),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    status: text("status", { enum: ["present", "absent", "late", "half_day", "leave"] }).notNull(),
    checkIn: timestamp("check_in", { withTimezone: true, mode: "string" }),
    checkOut: timestamp("check_out", { withTimezone: true, mode: "string" }),
    workingHours: numeric("working_hours", { precision: 5, scale: 2 }),
    remarks: text("remarks"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // One row per employee per day: the basis for the admin correction upsert.
    uniqueIndex("attendance_records_employee_id_work_date_key").on(table.employeeId, table.workDate),
    index("attendance_records_work_date_idx").on(table.workDate),
  ],
);

/* -------------------------------------------------------------------------- */
/* Payroll                                                                    */
/* -------------------------------------------------------------------------- */

export const salaryRecords = pgTable(
  "salary_records",
  {
    id: text("id").primaryKey().default(sql`'sal-' || nextval('salary_records_id_seq')`),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    /** Always normalised to the first day of the month; rendered as `YYYY-MM`. */
    month: date("month").notNull(),
    basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull(),
    allowances: numeric("allowances", { precision: 12, scale: 2 }).notNull().default("0"),
    bonus: numeric("bonus", { precision: 12, scale: 2 }).notNull().default("0"),
    deductions: numeric("deductions", { precision: 12, scale: 2 }).notNull().default("0"),
    netSalary: numeric("net_salary", { precision: 12, scale: 2 }).notNull(),
    paymentStatus: text("payment_status", { enum: ["paid", "pending", "processing"] })
      .notNull()
      .default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "string" }),
    remarks: text("remarks"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // Turns `upsertSalary` into a single ON CONFLICT statement.
    uniqueIndex("salary_records_employee_id_month_key").on(table.employeeId, table.month),
    index("salary_records_month_idx").on(table.month),
    index("salary_records_payment_status_idx").on(table.paymentStatus),
  ],
);

/* -------------------------------------------------------------------------- */
/* Leave                                                                      */
/* -------------------------------------------------------------------------- */

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: text("id").primaryKey().default(sql`'lv-' || nextval('leave_requests_id_seq')`),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    leaveType: text("leave_type", { enum: ["casual", "sick", "annual", "unpaid", "maternity"] }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    totalDays: integer("total_days").notNull(),
    reason: text("reason").notNull(),
    status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
    adminComment: text("admin_comment"),
    reviewedById: text("reviewed_by_id").references(() => employees.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }),
    appliedAt: timestamp("applied_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("leave_requests_employee_id_idx").on(table.employeeId, table.appliedAt),
    index("leave_requests_status_idx").on(table.status),
  ],
);

/* -------------------------------------------------------------------------- */
/* Notices                                                                    */
/* -------------------------------------------------------------------------- */

export const announcements = pgTable(
  "announcements",
  {
    id: text("id").primaryKey().default(sql`'ann-' || nextval('announcements_id_seq')`),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    body: text("body").notNull().default(""),
    authorId: text("author_id").references(() => employees.id, { onDelete: "set null" }),
    priority: text("priority", { enum: ["low", "normal", "high", "urgent"] })
      .notNull()
      .default("normal"),
    status: text("status", { enum: ["published", "draft", "archived"] }).notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("announcements_status_published_at_idx").on(table.status, table.publishedAt),
  ],
);

/** Replaces the `readBy: string[]` array that the mock kept on each announcement. */
export const announcementReads = pgTable(
  "announcement_reads",
  {
    announcementId: text("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.announcementId, table.employeeId] }),
    index("announcement_reads_employee_id_idx").on(table.employeeId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Inferred row types                                                          */
/* -------------------------------------------------------------------------- */

export type DepartmentRow = typeof departments.$inferSelect;
export type CompanySettingRow = typeof companySettings.$inferSelect;
export type EmployeeRow = typeof employees.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type AttendanceRow = typeof attendanceRecords.$inferSelect;
export type SalaryRow = typeof salaryRecords.$inferSelect;
export type LeaveRow = typeof leaveRequests.$inferSelect;
export type AnnouncementRow = typeof announcements.$inferSelect;
