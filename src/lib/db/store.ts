import { seedEmployees, seedUsers, type StoredUser } from "./seed/employees";
import { seedTasks } from "./seed/tasks";
import { seedAttendance, seedLeaveRequests } from "./seed/attendance";
import { seedSalaryRecords } from "./seed/salary";
import { seedAnnouncements } from "./seed/announcements";
import type { Employee } from "@/types/employee";
import type { Task } from "@/types/task";
import type { AttendanceRecord } from "@/types/attendance";
import type { LeaveRequest } from "@/types/leave";
import type { SalaryRecord } from "@/types/salary";
import type { Announcement } from "@/types/announcement";

/**
 * In-memory datastore.
 *
 * The store is a module-scoped singleton seeded on first import. Mutations made
 * through Server Actions survive client-side navigation and page reloads, and
 * reset when the server process restarts.
 *
 * To move to a real backend, delete this file and the `seed/` directory, then
 * reimplement the exported accessors in `lib/api/*` against HTTP or a database.
 * No page or component imports this module directly.
 */
export interface Database {
  users: StoredUser[];
  employees: Employee[];
  tasks: Task[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  salaries: SalaryRecord[];
  announcements: Announcement[];
  sequence: number;
}

function createDatabase(): Database {
  return {
    users: structuredClone(seedUsers),
    employees: structuredClone(seedEmployees),
    tasks: structuredClone(seedTasks),
    attendance: structuredClone(seedAttendance),
    leaves: structuredClone(seedLeaveRequests),
    salaries: structuredClone(seedSalaryRecords),
    announcements: structuredClone(seedAnnouncements),
    sequence: 1,
  };
}

const globalForDb = globalThis as unknown as { __coreviaDb?: Database };

export const db: Database = globalForDb.__coreviaDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__coreviaDb = db;
}

/** Monotonic id generator scoped per collection prefix. */
export function nextId(prefix: string): string {
  db.sequence += 1;
  return `${prefix}-${db.sequence}`;
}
