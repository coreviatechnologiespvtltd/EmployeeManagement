import "server-only";
import { db, nextId } from "@/lib/db/store";
import { requireActionRole } from "@/lib/auth/actions";
import { simulateLatency } from "./latency";
import { daysBetween, today } from "@/lib/format";
import { LEAVE_ALLOCATION_DAYS } from "@/lib/constants";
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

export async function getLeaveBalance(employeeId: string): Promise<LeaveBalance> {
  await simulateLatency(90);
  const approved = db.leaves
    .filter((l) => l.employeeId === employeeId && l.status === "approved" && l.leaveType !== "unpaid")
    .reduce((sum, l) => sum + l.totalDays, 0);
  const pending = db.leaves
    .filter((l) => l.employeeId === employeeId && l.status === "pending" && l.leaveType !== "unpaid")
    .reduce((sum, l) => sum + l.totalDays, 0);

  return {
    total: LEAVE_ALLOCATION_DAYS,
    used: approved,
    pending,
    remaining: Math.max(LEAVE_ALLOCATION_DAYS - approved - pending, 0),
  };
}

export async function listLeavesForEmployee(employeeId: string): Promise<LeaveRequest[]> {
  await simulateLatency(150);
  return db.leaves
    .filter((l) => l.employeeId === employeeId)
    .sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
}

export async function listAllLeaves(filters: LeaveFilters = {}): Promise<LeaveRequest[]> {
  await simulateLatency(200);
  let result = [...db.leaves];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter((l) =>
      [l.employeeName, l.department, l.reason, l.employeeId].join(" ").toLowerCase().includes(q),
    );
  }
  if (filters.status && filters.status !== "all") {
    result = result.filter((l) => l.status === filters.status);
  }
  if (filters.leaveType && filters.leaveType !== "all") {
    result = result.filter((l) => l.leaveType === filters.leaveType);
  }
  if (filters.department && filters.department !== "all") {
    result = result.filter((l) => l.department === filters.department);
  }

  const key = filters.sort ?? "appliedAt";
  const direction = filters.order === "desc" ? -1 : 1;
  result.sort((a, b) => {
    if (key === "startDate") return (a.startDate < b.startDate ? -1 : 1) * direction;
    if (key === "totalDays") return (a.totalDays - b.totalDays) * direction;
    return (a.appliedAt < b.appliedAt ? 1 : -1) * direction;
  });

  return result;
}

export async function getLeaveById(id: string): Promise<LeaveRequest | null> {
  await simulateLatency(80);
  return db.leaves.find((l) => l.id === id) ?? null;
}

export async function getPendingLeaveCount(): Promise<number> {
  await simulateLatency(80);
  return db.leaves.filter((l) => l.status === "pending").length;
}

export async function getRecentLeaves(limit = 5): Promise<LeaveRequest[]> {
  await simulateLatency(120);
  return [...db.leaves].sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1)).slice(0, limit);
}

export interface SubmitLeaveInput {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export async function submitLeave(input: SubmitLeaveInput, actor: AuthUser): Promise<LeaveRequest> {
  await requireActionRole("employee", "admin");
  await simulateLatency(340);

  const employee = db.employees.find((e) => e.id === actor.id);
  if (!employee) throw new Error("Employee record not found.");

  const totalDays = daysBetween(input.startDate, input.endDate);
  const request: LeaveRequest = {
    id: nextId("lv"),
    employeeId: employee.id,
    employeeName: employee.fullName,
    department: employee.department,
    leaveType: input.leaveType,
    startDate: input.startDate,
    endDate: input.endDate,
    totalDays,
    reason: input.reason.trim(),
    appliedAt: new Date().toISOString(),
    status: "pending",
  };

  db.leaves.unshift(request);
  return request;
}

export async function decideLeave(
  leaveId: string,
  status: Extract<LeaveStatus, "approved" | "rejected">,
  comment: string,
  reviewer: AuthUser,
): Promise<LeaveRequest | null> {
  await requireActionRole("admin");
  await simulateLatency(340);

  const request = db.leaves.find((l) => l.id === leaveId);
  if (!request) return null;

  request.status = status;
  request.adminComment = comment.trim() || undefined;
  request.reviewedAt = new Date().toISOString();
  request.reviewedByName = reviewer.name;

  return request;
}

export async function cancelLeave(leaveId: string, actor: AuthUser): Promise<boolean> {
  await requireActionRole("employee", "admin");
  await simulateLatency(260);

  const index = db.leaves.findIndex((l) => l.id === leaveId);
  if (index === -1) return false;
  const request = db.leaves[index]!;
  if (request.employeeId !== actor.id || request.status !== "pending") return false;
  if (new Date(`${request.startDate}T00:00:00`) < new Date(`${today()}T00:00:00`)) return false;

  db.leaves.splice(index, 1);
  return true;
}
