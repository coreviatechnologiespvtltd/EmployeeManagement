import "server-only";
import { db, nextId } from "@/lib/db/store";
import { createSession, destroyAllSessionsForUser } from "@/lib/auth/session";
import { simulateLatency } from "./latency";
import { requireActionRole } from "@/lib/auth/actions";
import type { AuthUser } from "@/types/auth";
import type { Employee, EmployeeStatus } from "@/types/employee";
import { revalidatePath } from "next/cache";

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

export type UpdateEmployeeInput = Partial<Omit<CreateEmployeeInput, "password">>;

export async function listEmployees(filters: EmployeeFilters = {}): Promise<Employee[]> {
  await simulateLatency();
  let result = [...db.employees];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter((e) =>
      [e.fullName, e.username, e.email, e.department, e.position, e.employeeCode]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  if (filters.department && filters.department !== "all") {
    result = result.filter((e) => e.department === filters.department);
  }
  if (filters.status && filters.status !== "all") {
    result = result.filter((e) => e.status === filters.status);
  }
  if (filters.role && filters.role !== "all") {
    result = result.filter((e) => e.role === filters.role);
  }

  const key = filters.sort ?? "name";
  const direction = filters.order === "desc" ? -1 : 1;
  result.sort((a, b) => {
    if (key === "joiningDate") return (a.joiningDate < b.joiningDate ? -1 : 1) * direction;
    if (key === "department") {
      return a.department.localeCompare(b.department) * direction || a.fullName.localeCompare(b.fullName);
    }
    return a.fullName.localeCompare(b.fullName) * direction;
  });

  return result;
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  await simulateLatency(80);
  return db.employees.find((e) => e.id === id) ?? null;
}

export async function listDepartmentsInUse(): Promise<string[]> {
  await simulateLatency(60);
  return Array.from(new Set(db.employees.map((e) => e.department))).sort();
}

export async function getEmployeeProfile(id: string) {
  const employee = await getEmployeeById(id);
  if (!employee) return null;

  const salaries = db.salaries.filter((s) => s.employeeId === id);
  const tasks = db.tasks.filter((t) => t.assignedToId === id);
  const leaves = db.leaves.filter((l) => l.employeeId === id);
  const records = db.attendance.filter((r) => r.employeeId === id);

  return {
    employee,
    stats: {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === "completed").length,
      pendingTasks: tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length,
      totalLeaves: leaves.length,
      approvedLeaves: leaves.filter((l) => l.status === "approved").length,
      pendingLeaves: leaves.filter((l) => l.status === "pending").length,
      presentDays: records.filter((r) => r.status === "present").length,
      lateDays: records.filter((r) => r.status === "late").length,
      absentDays: records.filter((r) => r.status === "absent").length,
      totalEarnings: salaries.reduce((sum, s) => sum + s.netSalary, 0),
      latestNetSalary: salaries.length
        ? salaries.reduce((max, s) => (s.month > max.month ? s : max)).netSalary
        : 0,
    },
  };
}

export async function getRecentStaff(limit = 5): Promise<Employee[]> {
  await simulateLatency(120);
  return [...db.employees]
    .sort((a, b) => (a.joiningDate < b.joiningDate ? 1 : -1))
    .slice(0, limit);
}

export async function getStaffCountByStatus(): Promise<{ active: number; inactive: number; total: number }> {
  await simulateLatency(100);
  const active = db.employees.filter((e) => e.status === "active").length;
  return { active, inactive: db.employees.length - active, total: db.employees.length };
}

export async function isUsernameAvailable(username: string, excludeId?: string): Promise<boolean> {
  const normalized = username.trim().toLowerCase();
  return !db.employees.some(
    (e) => e.id !== excludeId && (e.username.toLowerCase() === normalized || e.email.toLowerCase() === normalized),
  );
}

export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  await requireActionRole("admin");
  await simulateLatency(320);

  const id = nextId("emp");
  const employee: Employee = {
    id,
    employeeCode: id.toUpperCase(),
    fullName: input.fullName.trim(),
    username: input.username.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    department: input.department,
    position: input.position.trim(),
    joiningDate: input.joiningDate,
    role: input.role,
    status: "active",
    avatarUrl: input.avatarUrl,
    basicSalary: input.basicSalary,
  };

  db.employees.push(employee);
  db.users.push({ userId: id, username: employee.username, password: input.password, employee });

  revalidatePath("/admin/staff");
  revalidatePath("/admin/dashboard");
  return employee;
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee | null> {
  await requireActionRole("admin");
  await simulateLatency(320);

  const employee = db.employees.find((e) => e.id === id);
  if (!employee) return null;

  const previousRole = employee.role;

  Object.assign(employee, {
    ...input,
    ...(input.fullName ? { fullName: input.fullName.trim() } : {}),
    ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
    ...(input.basicSalary !== undefined ? { basicSalary: Number(input.basicSalary) } : {}),
  });

  const user = db.users.find((u) => u.userId === id);
  if (user && input.username) user.username = input.username;

  // Role changes must invalidate existing sessions so privileges are not stale.
  if (previousRole !== employee.role) {
    destroyAllSessionsForUser(id);
    createSession(id);
  }

  revalidatePath("/admin/staff");
  revalidatePath("/admin/dashboard");
  return employee;
}

export async function setEmployeeStatus(id: string, status: EmployeeStatus): Promise<boolean> {
  await requireActionRole("admin");
  await simulateLatency(280);

  const employee = db.employees.find((e) => e.id === id);
  if (!employee) return false;

  employee.status = status;
  if (status === "inactive") destroyAllSessionsForUser(id);

  revalidatePath("/admin/staff");
  return true;
}

export async function deleteEmployee(id: string, actingUser: AuthUser): Promise<boolean> {
  await requireActionRole("admin");
  await simulateLatency(320);

  if (id === actingUser.id) return false;

  const index = db.employees.findIndex((e) => e.id === id);
  if (index === -1) return false;

  db.employees.splice(index, 1);
  const userIndex = db.users.findIndex((u) => u.userId === id);
  if (userIndex !== -1) db.users.splice(userIndex, 1);
  destroyAllSessionsForUser(id);

  revalidatePath("/admin/staff");
  revalidatePath("/admin/dashboard");
  return true;
}

export async function getEmployeeOptions(): Promise<Array<Pick<Employee, "id" | "fullName" | "department">>> {
  await simulateLatency(90);
  return db.employees
    .filter((e) => e.status === "active")
    .map(({ id, fullName, department }) => ({ id, fullName, department }));
}
