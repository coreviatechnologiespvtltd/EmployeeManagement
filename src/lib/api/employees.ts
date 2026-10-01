import "server-only";

import { and, asc, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { employeeSelection } from "@/lib/db/selects";
import { likePattern } from "@/lib/db/query-helpers";
import {
  attendanceRecords,
  departments,
  employees,
  leaveRequests,
  salaryRecords,
  tasks,
  userCredentials,
} from "@/lib/db/schema";
import { toEmployee, toNumber } from "@/lib/db/mappers";
import { hashPassword } from "@/lib/auth/password";
import { destroyAllSessionsForUser, destroyOtherSessionsForUser } from "@/lib/auth/session";
import { getCurrentSessionToken } from "@/lib/auth/service";
import { requireActionRole } from "@/lib/auth/actions";
import type { AuthUser } from "@/types/auth";
import type { Employee, EmployeeStatus } from "@/types/employee";

export interface EmployeeFilters {
  query?: string;
  department?: string;
  status?: EmployeeStatus | "all";
  role?: "employee" | "admin" | "all";
  sort?: "name" | "joiningDate" | "department";
  order?: "asc" | "desc";
}

export interface CreateEmployeeInput {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  position: string;
  joiningDate: string;
  basicSalary: number;
  role: "employee" | "admin";
  password: string;
  avatarUrl?: string;
}

export interface UpdateEmployeeInput extends Partial<Omit<CreateEmployeeInput, "password">> {
  /** Account status. Separate from the rest so a role change and a status change
   *  can be reasoned about independently by the guards below. */
  status?: EmployeeStatus;
}

/** The searchable blob behind the staff search box. */
const searchBlob = sql`concat_ws(' ', ${employees.fullName}, ${employees.username}, ${employees.email}, ${employees.position}, ${employees.employeeCode})`;

function buildFilters(filters: EmployeeFilters) {
  const conditions = [];

  if (filters.query) {
    conditions.push(ilike(searchBlob, likePattern(filters.query)));
  }
  if (filters.department && filters.department !== "all") {
    conditions.push(eq(departments.name, filters.department));
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(employees.status, filters.status));
  }
  if (filters.role && filters.role !== "all") {
    conditions.push(eq(employees.role, filters.role));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function orderFor(sort: EmployeeFilters["sort"], order: "asc" | "desc" | undefined) {
  const direction = order === "desc" ? desc : asc;
  if (sort === "joiningDate") return [direction(employees.joiningDate)];
  if (sort === "department") return [direction(departments.name), asc(employees.fullName)];
  return [asc(employees.fullName)];
}

export async function listEmployees(filters: EmployeeFilters = {}): Promise<Employee[]> {
  const rows = await db
    .select(employeeSelection)
    .from(employees)
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(buildFilters(filters))
    .orderBy(...orderFor(filters.sort, filters.order));

  return rows.map(toEmployee);
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const rows = await db
    .select(employeeSelection)
    .from(employees)
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(employees.id, id))
    .limit(1);

  const row = rows[0];
  return row ? toEmployee(row) : null;
}

/** Departments that currently have at least one employee. */
export async function listDepartmentsInUse(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: departments.name })
    .from(departments)
    .innerJoin(employees, eq(employees.departmentId, departments.id))
    .orderBy(asc(departments.name));

  return rows.map((row) => row.name);
}

/**
 * Every department in the `departments` table, for the registration and edit
 * forms. This is what replaced the hardcoded `DEPARTMENTS` constant.
 */
export async function listDepartments(): Promise<string[]> {
  const rows = await db
    .select({ name: departments.name })
    .from(departments)
    .orderBy(asc(departments.name));

  return rows.map((row) => row.name);
}

export async function getEmployeeProfile(id: string) {
  const employee = await getEmployeeById(id);
  if (!employee) return null;

  const [taskStats, leaveStats, attendanceStats, earnings, latest] = await Promise.all([
    db
      .select({
        total: count(),
        completed: sql<number>`count(*) filter (where ${tasks.status} = 'completed')`,
        pending: sql<number>`count(*) filter (where ${tasks.status} in ('pending', 'in_progress'))`,
      })
      .from(tasks)
      .where(eq(tasks.assignedToId, id)),

    db
      .select({
        total: count(),
        approved: sql<number>`count(*) filter (where ${leaveRequests.status} = 'approved')`,
        pending: sql<number>`count(*) filter (where ${leaveRequests.status} = 'pending')`,
      })
      .from(leaveRequests)
      .where(eq(leaveRequests.employeeId, id)),

    db
      .select({
        present: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'present')`,
        late: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'late')`,
        absent: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'absent')`,
      })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.employeeId, id)),

    db
      .select({ total: sql<string>`coalesce(sum(${salaryRecords.netSalary}), 0)` })
      .from(salaryRecords)
      .where(eq(salaryRecords.employeeId, id)),

    db
      .select({ netSalary: salaryRecords.netSalary })
      .from(salaryRecords)
      .where(eq(salaryRecords.employeeId, id))
      .orderBy(desc(salaryRecords.month))
      .limit(1),
  ]);

  return {
    employee,
    stats: {
      totalTasks: taskStats[0]?.total ?? 0,
      completedTasks: taskStats[0]?.completed ?? 0,
      pendingTasks: taskStats[0]?.pending ?? 0,
      totalLeaves: leaveStats[0]?.total ?? 0,
      approvedLeaves: leaveStats[0]?.approved ?? 0,
      pendingLeaves: leaveStats[0]?.pending ?? 0,
      presentDays: attendanceStats[0]?.present ?? 0,
      lateDays: attendanceStats[0]?.late ?? 0,
      absentDays: attendanceStats[0]?.absent ?? 0,
      totalEarnings: toNumber(earnings[0]?.total),
      latestNetSalary: toNumber(latest[0]?.netSalary),
    },
  };
}

export async function getRecentStaff(limit = 5): Promise<Employee[]> {
  const rows = await db
    .select(employeeSelection)
    .from(employees)
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .orderBy(desc(employees.joiningDate), asc(employees.fullName))
    .limit(limit);

  return rows.map(toEmployee);
}

export async function getStaffCountByStatus(): Promise<{
  active: number;
  inactive: number;
  total: number;
}> {
  const rows = await db
    .select({
      active: sql<number>`count(*) filter (where ${employees.status} = 'active')`,
      total: count(),
    })
    .from(employees);

  const total = rows[0]?.total ?? 0;
  const active = rows[0]?.active ?? 0;
  return { active, inactive: total - active, total };
}

export async function isUsernameAvailable(username: string, excludeId?: string): Promise<boolean> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return true;

  const conditions = [
    sql`lower(${employees.username}) = ${normalized}`,
    sql`lower(${employees.email}) = ${normalized}`,
  ];

  const rows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      and(
        or(...conditions),
        excludeId ? ne(employees.id, excludeId) : undefined,
      ),
    )
    .limit(1);

  return rows.length === 0;
}

/** Resolves a department name to its id, case-insensitively. */
async function requireDepartmentId(name: string): Promise<string> {
  const rows = await db
    .select({ id: departments.id })
    .from(departments)
    .where(sql`lower(${departments.name}) = lower(${name.trim()})`)
    .limit(1);

  const row = rows[0];
  if (!row) throw new Error(`Unknown department: ${name}`);
  return row.id;
}

/** Counts active admins, optionally excluding one. Guards against locking everyone out. */
async function countActiveAdmins(excludeId?: string): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(employees)
    .where(
      and(
        eq(employees.role, "admin"),
        eq(employees.status, "active"),
        excludeId ? ne(employees.id, excludeId) : undefined,
      ),
    );

  return rows[0]?.total ?? 0;
}

export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  await requireActionRole("admin");

  const departmentId = await requireDepartmentId(input.department);

  if (!(await isUsernameAvailable(input.username))) {
    throw new Error("That username or email address is already registered.");
  }

  // Hash before the transaction opens: bcrypt at cost 12 is deliberately slow
  // and should not hold a database connection while it runs.
  const passwordHash = await hashPassword(input.password);

  const employeeId = await db.transaction(async (tx) => {
    // The id comes from a sequence, and the employee code is derived from it, so
    // the row is inserted with a temporary placeholder code and rewritten in the
    // same transaction. Two concurrent registrations cannot collide: both
    // sequence values and both placeholder codes are unique.
    const inserted = await tx
      .insert(employees)
      .values({
        employeeCode: `pending-${randomUUID()}`,
        fullName: input.fullName.trim(),
        username: input.username.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        address: input.address.trim(),
        departmentId,
        position: input.position.trim(),
        joiningDate: input.joiningDate,
        role: input.role,
        status: "active",
        avatarUrl: input.avatarUrl ?? null,
        basicSalary: String(Number(input.basicSalary) || 0),
      })
      .returning({ id: employees.id });

    const id = inserted[0]!.id;

    // The id comes from a sequence, so the employee code is derived from it
    // after insertion. Doing it here keeps `employee_code` a real stored,
    // unique column rather than a value only the UI knows how to compute.
    await tx
      .update(employees)
      .set({ employeeCode: id.toUpperCase(), updatedAt: new Date().toISOString() })
      .where(eq(employees.id, id));

    await tx.insert(userCredentials).values({ employeeId: id, passwordHash });

    return id;
  });

  revalidatePath("/admin/staff");
  revalidatePath("/admin/dashboard");

  const created = await getEmployeeById(employeeId);
  if (!created) throw new Error("The staff member could not be read back after creation.");
  return created;
}

/**
 * Sets a new password on behalf of a staff member.
 *
 * The administrator chooses the value and passes it on out of band; there is no
 * email delivery in this application, so this is the recovery path for anyone
 * locked out of their account. Every session for the target is destroyed so a
 * password handed over in chat cannot leave an old session alive, and the
 * lockout counters are cleared so a locked account becomes usable again.
 *
 * An administrator resetting their *own* password keeps their current session,
 * otherwise they would be signed out of the console by their own action.
 */
export async function resetPasswordByAdmin(id: string, newPassword: string): Promise<Employee> {
  const actor = await requireActionRole("admin");

  const target = await getEmployeeById(id);
  if (!target) throw new Error("Staff member not found.");

  // Hashed before the write, matching `createEmployee`.
  const passwordHash = await hashPassword(newPassword);
  const now = new Date().toISOString();

  // An upsert rather than an update: a staff member registered without a
  // credential row — the seeded inactive account does exactly this — can still
  // be given their first password here.
  await db
    .insert(userCredentials)
    .values({ employeeId: id, passwordHash, passwordUpdatedAt: now, failedAttempts: 0, lockedUntil: null, updatedAt: now })
    .onConflictDoUpdate({
      target: userCredentials.employeeId,
      set: { passwordHash, passwordUpdatedAt: now, failedAttempts: 0, lockedUntil: null, updatedAt: now },
    });

  if (actor.id === id) {
    await destroyOtherSessionsForUser(id, await getCurrentSessionToken());
  } else {
    await destroyAllSessionsForUser(id);
  }

  revalidatePath("/admin/staff");

  return target;
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee | null> {
  await requireActionRole("admin");

  const current = await getEmployeeById(id);
  if (!current) return null;

  // Losing the last active admin would lock everyone out of the console.
  if (current.role === "admin" && input.role === "employee" && (await countActiveAdmins(id)) === 0) {
    throw new Error("This is the only active administrator and cannot be demoted.");
  }

  const patch: Partial<typeof employees.$inferInsert> = { updatedAt: new Date().toISOString() };

  if (input.fullName !== undefined) patch.fullName = input.fullName.trim();
  if (input.email !== undefined) patch.email = input.email.trim().toLowerCase();
  if (input.username !== undefined) patch.username = input.username.trim();
  if (input.phone !== undefined) patch.phone = input.phone.trim();
  if (input.address !== undefined) patch.address = input.address.trim();
  if (input.position !== undefined) patch.position = input.position.trim();
  if (input.joiningDate !== undefined) patch.joiningDate = input.joiningDate;
  if (input.role !== undefined) patch.role = input.role;
  if (input.status !== undefined) patch.status = input.status;
  if (input.avatarUrl !== undefined) patch.avatarUrl = input.avatarUrl;
  if (input.basicSalary !== undefined) patch.basicSalary = String(Number(input.basicSalary) || 0);
  if (input.department !== undefined) patch.departmentId = await requireDepartmentId(input.department);

  try {
    await db.update(employees).set(patch).where(eq(employees.id, id));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "23505") {
      throw new Error("That username or email address is already in use.");
    }
    throw error;
  }

  // A role change must not leave the old privilege level live in an existing
  // session, so every session for this user is invalidated.
  if (input.role !== undefined && input.role !== current.role) {
    await destroyAllSessionsForUser(id);
  }

  revalidatePath("/admin/staff");
  revalidatePath("/admin/dashboard");

  return getEmployeeById(id);
}

export async function setEmployeeStatus(id: string, status: EmployeeStatus): Promise<boolean> {
  await requireActionRole("admin");

  const current = await getEmployeeById(id);
  if (!current) return false;

  if (
    status === "inactive" &&
    current.role === "admin" &&
    (await countActiveAdmins(id)) === 0
  ) {
    throw new Error("This is the only active administrator and cannot be deactivated.");
  }

  const updated = await db
    .update(employees)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(employees.id, id))
    .returning({ id: employees.id });

  if (updated.length === 0) return false;

  // A deactivated account must lose its live sessions immediately.
  if (status === "inactive") {
    await destroyAllSessionsForUser(id);
  }

  revalidatePath("/admin/staff");
  return true;
}

export async function deleteEmployee(id: string, actingUser: AuthUser): Promise<boolean> {
  await requireActionRole("admin");

  if (id === actingUser.id) {
    throw new Error("You cannot delete your own account.");
  }

  const current = await getEmployeeById(id);
  if (!current) return false;

  if (current.role === "admin" && (await countActiveAdmins(id)) === 0) {
    throw new Error("This is the only active administrator and cannot be removed.");
  }

  // Tasks, attendance, payroll, leave, sessions and credentials all cascade.
  // Announcements and historical reviewer references are preserved with the
  // author/reviewer set to NULL, so deleting a person never deletes the record
  // of decisions they made.
  const deleted = await db.delete(employees).where(eq(employees.id, id)).returning({ id: employees.id });

  if (deleted.length === 0) return false;

  await destroyAllSessionsForUser(id);

  revalidatePath("/admin/staff");
  revalidatePath("/admin/dashboard");
  return true;
}

export async function getEmployeeOptions(): Promise<Array<Pick<Employee, "id" | "fullName" | "department">>> {
  const rows = await db
    .select({
      id: employees.id,
      fullName: employees.fullName,
      department: departments.name,
    })
    .from(employees)
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(employees.status, "active"))
    .orderBy(asc(employees.fullName));

  return rows;
}
