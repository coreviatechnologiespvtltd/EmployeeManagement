import "server-only";

import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leaveReviewer, leaveSelection } from "@/lib/db/selects";
import { likePattern } from "@/lib/db/query-helpers";
import { departments, employees, leaveRequests } from "@/lib/db/schema";
import { toLeaveRequest, toNumber } from "@/lib/db/mappers";
import { requireActionRole } from "@/lib/auth/actions";
import { getLeaveAllocationDays } from "./settings";
import { daysBetween, today } from "@/lib/format";
import type { AuthUser } from "@/types/auth";
import type { LeaveBalance, LeaveRequest, LeaveStatus, LeaveType } from "@/types/leave";

export interface LeaveFilters {
  query?: string;
  status?: LeaveStatus | "all";
  leaveType?: LeaveType | "all";
  department?: string;
  sort?: "appliedAt" | "startDate" | "totalDays";
  order?: "asc" | "desc";
}

const searchBlob = sql`concat_ws(' ', ${employees.fullName}, ${departments.name}, ${leaveRequests.reason}, ${employees.id})`;

export async function getLeaveBalance(employeeId: string): Promise<LeaveBalance> {
  const [total, rows] = await Promise.all([
    getLeaveAllocationDays(),
    db
      .select({
        used: sql<string>`coalesce(sum(${leaveRequests.totalDays}) filter (where ${leaveRequests.status} = 'approved'), 0)`,
        pending: sql<string>`coalesce(sum(${leaveRequests.totalDays}) filter (where ${leaveRequests.status} = 'pending'), 0)`,
      })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.employeeId, employeeId),
          // Unpaid and maternity leave sit outside the annual allocation.
          sql`${leaveRequests.leaveType} <> 'unpaid'`,
        ),
      ),
  ]);

  const used = toNumber(rows[0]?.used);
  const pending = toNumber(rows[0]?.pending);

  return { total, used, pending, remaining: Math.max(total - used - pending, 0) };
}

export async function listLeavesForEmployee(employeeId: string): Promise<LeaveRequest[]> {
  const rows = await db
    .select(leaveSelection)
    .from(leaveRequests)
    .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(leaveReviewer, eq(leaveRequests.reviewedById, leaveReviewer.id))
    .where(eq(leaveRequests.employeeId, employeeId))
    .orderBy(desc(leaveRequests.appliedAt));

  return rows.map(toLeaveRequest);
}

function buildFilters(filters: LeaveFilters) {
  const conditions = [];

  if (filters.query) {
    conditions.push(ilike(searchBlob, likePattern(filters.query)));
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(leaveRequests.status, filters.status));
  }
  if (filters.leaveType && filters.leaveType !== "all") {
    conditions.push(eq(leaveRequests.leaveType, filters.leaveType));
  }
  if (filters.department && filters.department !== "all") {
    conditions.push(eq(departments.name, filters.department));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function orderFor(sort: LeaveFilters["sort"], order: "asc" | "desc" | undefined) {
  const direction = order === "desc" ? desc : asc;
  if (sort === "startDate") return [direction(leaveRequests.startDate)];
  if (sort === "totalDays") return [direction(leaveRequests.totalDays)];
  return [direction(leaveRequests.appliedAt)];
}

export async function listAllLeaves(filters: LeaveFilters = {}): Promise<LeaveRequest[]> {
  const rows = await db
    .select(leaveSelection)
    .from(leaveRequests)
    .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(leaveReviewer, eq(leaveRequests.reviewedById, leaveReviewer.id))
    .where(buildFilters(filters))
    .orderBy(...orderFor(filters.sort, filters.order));

  return rows.map(toLeaveRequest);
}

export async function getLeaveById(id: string): Promise<LeaveRequest | null> {
  const rows = await db
    .select(leaveSelection)
    .from(leaveRequests)
    .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(leaveReviewer, eq(leaveRequests.reviewedById, leaveReviewer.id))
    .where(eq(leaveRequests.id, id))
    .limit(1);

  const row = rows[0];
  return row ? toLeaveRequest(row) : null;
}

export async function getPendingLeaveCount(): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(leaveRequests)
    .where(eq(leaveRequests.status, "pending"));

  return rows[0]?.total ?? 0;
}

export async function getRecentLeaves(limit = 5): Promise<LeaveRequest[]> {
  const rows = await db
    .select(leaveSelection)
    .from(leaveRequests)
    .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(leaveReviewer, eq(leaveRequests.reviewedById, leaveReviewer.id))
    .orderBy(desc(leaveRequests.appliedAt))
    .limit(limit);

  return rows.map(toLeaveRequest);
}

export interface SubmitLeaveInput {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export async function submitLeave(input: SubmitLeaveInput, actor: AuthUser): Promise<LeaveRequest> {
  await requireActionRole("employee", "admin");

  const employeeRows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.id, actor.id))
    .limit(1);

  if (employeeRows.length === 0) throw new Error("Employee record not found.");

  const totalDays = daysBetween(input.startDate, input.endDate);
  if (totalDays < 1) throw new Error("The end date must be on or after the start date.");

  const inserted = await db
    .insert(leaveRequests)
    .values({
      employeeId: actor.id,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      totalDays,
      reason: input.reason.trim(),
      status: "pending",
    })
    .returning({ id: leaveRequests.id });

  const created = await getLeaveById(inserted[0]!.id);
  if (!created) throw new Error("The leave request could not be read back after creation.");
  return created;
}

export async function decideLeave(
  leaveId: string,
  status: Extract<LeaveStatus, "approved" | "rejected">,
  comment: string,
  reviewer: AuthUser,
): Promise<LeaveRequest | null> {
  await requireActionRole("admin");

  const updated = await db
    .update(leaveRequests)
    .set({
      status,
      adminComment: comment.trim() || null,
      reviewedById: reviewer.id,
      reviewedAt: new Date().toISOString(),
    })
    .where(eq(leaveRequests.id, leaveId))
    .returning({ id: leaveRequests.id });

  if (updated.length === 0) return null;

  return getLeaveById(leaveId);
}

export async function cancelLeave(leaveId: string, actor: AuthUser): Promise<boolean> {
  await requireActionRole("employee", "admin");

  const rows = await db
    .select({ employeeId: leaveRequests.employeeId, status: leaveRequests.status, startDate: leaveRequests.startDate })
    .from(leaveRequests)
    .where(eq(leaveRequests.id, leaveId))
    .limit(1);

  const request = rows[0];
  if (!request) return false;
  // Only the applicant can cancel, only while it is still pending, and only
  // before the leave has started.
  if (request.employeeId !== actor.id || request.status !== "pending") return false;
  if (request.startDate < today()) return false;

  const deleted = await db
    .delete(leaveRequests)
    .where(eq(leaveRequests.id, leaveId))
    .returning({ id: leaveRequests.id });

  return deleted.length > 0;
}
