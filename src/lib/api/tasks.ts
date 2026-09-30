import "server-only";

import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { taskAssigner, taskAssignee, taskSelection } from "@/lib/db/selects";
import { likePattern } from "@/lib/db/query-helpers";
import { employees, tasks } from "@/lib/db/schema";
import { toTask } from "@/lib/db/mappers";
import { requireActionRole } from "@/lib/auth/actions";
import { today } from "@/lib/format";
import type { Task, TaskFilters, TaskPriority, TaskStatus } from "@/types/task";

/**
 * The status a task *reads* as, as opposed to the status it is *stored* as.
 *
 * A past-due task that has not been completed is shown as overdue. This is
 * computed in SQL rather than in JavaScript so that filtering by "overdue"
 * and counting overdue tasks use exactly the same rule as the list view.
 */
const effectiveStatus = sql<TaskStatus>`case
  when ${tasks.status} <> 'completed' and ${tasks.dueDate} < current_date then 'overdue'
  else ${tasks.status}
end`;

const searchBlob = sql`concat_ws(' ', ${tasks.title}, ${tasks.description}, ${taskAssignee.fullName}, ${taskAssigner.fullName})`;

/** Orders by urgency rather than alphabetically, so "urgent" sorts first. */
function priorityRank() {
  return sql<number>`case ${tasks.priority}
    when 'urgent' then 4
    when 'high' then 3
    when 'medium' then 2
    else 1
  end`;
}

function buildFilters(filters: TaskFilters, extra?: ReturnType<typeof and>) {
  const conditions = [extra];

  if (filters.query) {
    conditions.push(ilike(searchBlob, likePattern(filters.query)));
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(sql`${effectiveStatus} = ${filters.status}`);
  }
  if (filters.priority && filters.priority !== "all") {
    conditions.push(eq(tasks.priority, filters.priority));
  }

  return and(...conditions.filter(Boolean));
}

function orderFor(sort: TaskFilters["sort"], order: "asc" | "desc" | undefined) {
  const direction = order === "desc" ? desc : asc;
  if (sort === "priority") return [direction(priorityRank()), asc(tasks.dueDate)];
  if (sort === "title") return [direction(tasks.title)];
  if (sort === "createdAt") return [direction(tasks.createdAt)];
  return [direction(tasks.dueDate)];
}

export async function listTasksForEmployee(
  employeeId: string,
  filters: TaskFilters = {},
): Promise<Task[]> {
  const rows = await db
    .select(taskSelection)
    .from(tasks)
    .innerJoin(taskAssignee, eq(tasks.assignedToId, taskAssignee.id))
    .leftJoin(taskAssigner, eq(tasks.assignedById, taskAssigner.id))
    .where(buildFilters(filters, eq(tasks.assignedToId, employeeId)))
    .orderBy(...orderFor(filters.sort, filters.order));

  return rows.map(toTask);
}

export async function listAllTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const rows = await db
    .select(taskSelection)
    .from(tasks)
    .innerJoin(taskAssignee, eq(tasks.assignedToId, taskAssignee.id))
    .leftJoin(taskAssigner, eq(tasks.assignedById, taskAssigner.id))
    .where(buildFilters(filters))
    .orderBy(...orderFor(filters.sort, filters.order));

  return rows.map(toTask);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const rows = await db
    .select(taskSelection)
    .from(tasks)
    .innerJoin(taskAssignee, eq(tasks.assignedToId, taskAssignee.id))
    .leftJoin(taskAssigner, eq(tasks.assignedById, taskAssigner.id))
    .where(eq(tasks.id, id))
    .limit(1);

  const row = rows[0];
  return row ? toTask(row) : null;
}

export interface TaskCounts {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

function countsFromRow(row: {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}): TaskCounts {
  return {
    total: row.total,
    pending: row.pending,
    inProgress: row.inProgress,
    completed: row.completed,
    overdue: row.overdue,
  };
}

function countSelection() {
  return {
    total: count(),
    pending: sql<number>`count(*) filter (where ${effectiveStatus} = 'pending')`,
    inProgress: sql<number>`count(*) filter (where ${effectiveStatus} = 'in_progress')`,
    completed: sql<number>`count(*) filter (where ${effectiveStatus} = 'completed')`,
    overdue: sql<number>`count(*) filter (where ${effectiveStatus} = 'overdue')`,
  };
}

export async function getTaskCountsForEmployee(employeeId: string): Promise<TaskCounts> {
  const rows = await db
    .select(countSelection())
    .from(tasks)
    .where(eq(tasks.assignedToId, employeeId));

  return countsFromRow(rows[0] ?? { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 });
}

export async function getGlobalTaskCounts(): Promise<TaskCounts> {
  const rows = await db.select(countSelection()).from(tasks);

  return countsFromRow(rows[0] ?? { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 });
}

export async function getRecentTasksForEmployee(employeeId: string, limit = 5): Promise<Task[]> {
  const rows = await db
    .select(taskSelection)
    .from(tasks)
    .innerJoin(taskAssignee, eq(tasks.assignedToId, taskAssignee.id))
    .leftJoin(taskAssigner, eq(tasks.assignedById, taskAssigner.id))
    .where(eq(tasks.assignedToId, employeeId))
    .orderBy(desc(tasks.createdAt))
    .limit(limit);

  return rows.map(toTask);
}

export async function getRecentTasks(limit = 5): Promise<Task[]> {
  const rows = await db
    .select(taskSelection)
    .from(tasks)
    .innerJoin(taskAssignee, eq(tasks.assignedToId, taskAssignee.id))
    .leftJoin(taskAssigner, eq(tasks.assignedById, taskAssigner.id))
    .orderBy(desc(tasks.createdAt))
    .limit(limit);

  return rows.map(toTask);
}

export interface CreateTaskInput {
  assignedToIds: string[];
  title: string;
  description: string;
  priority: TaskPriority;
  startDate: string;
  dueDate: string;
}

export async function createTasks(input: CreateTaskInput, assignedById: string): Promise<number> {
  const actor = await requireActionRole("admin");

  const assigneeIds = input.assignedToIds.length > 0 ? input.assignedToIds : [actor.id];

  // Resolve the assignees up front so an unknown id fails loudly instead of
  // silently creating fewer tasks than the admin asked for.
  const assignees = await db
    .select({ id: employees.id })
    .from(employees)
    .where(sql`${employees.id} in ${assigneeIds}`);

  if (assignees.length === 0) {
    throw new Error("None of the selected staff members could be found.");
  }

  const status: TaskStatus = input.startDate > today() ? "pending" : "in_progress";

  const created = await db
    .insert(tasks)
    .values(
      assignees.map((assignee) => ({
        title: input.title.trim(),
        description: input.description.trim(),
        assignedToId: assignee.id,
        assignedById: assignedById || actor.id,
        startDate: input.startDate,
        dueDate: input.dueDate,
        priority: input.priority,
        status,
      })),
    )
    .returning({ id: tasks.id });

  return created.length;
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  actingUserId: string,
  isAdmin: boolean,
): Promise<Task | null> {
  if (isAdmin) await requireActionRole("admin");
  else await requireActionRole("employee", "admin");

  const existing = await db
    .select({ id: tasks.id, assignedToId: tasks.assignedToId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  const task = existing[0];
  if (!task) return null;
  // An employee may only move their own tasks.
  if (!isAdmin && task.assignedToId !== actingUserId) return null;

  await db
    .update(tasks)
    .set({
      status,
      completedAt: status === "completed" ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tasks.id, taskId));

  return getTaskById(taskId);
}

export async function updateTaskFromAdmin(
  taskId: string,
  input: Partial<Pick<Task, "title" | "description" | "priority" | "dueDate" | "status" | "assignedToId">>,
): Promise<Task | null> {
  await requireActionRole("admin");

  const existing = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (existing.length === 0) return null;

  const patch: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date().toISOString() };

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
  if (input.assignedToId !== undefined) patch.assignedToId = input.assignedToId;
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.completedAt = input.status === "completed" ? new Date().toISOString() : null;
  }

  try {
    await db.update(tasks).set(patch).where(eq(tasks.id, taskId));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "23503") {
      throw new Error("That staff member could not be found.");
    }
    throw error;
  }

  return getTaskById(taskId);
}

export async function deleteTask(taskId: string): Promise<boolean> {
  await requireActionRole("admin");

  const deleted = await db.delete(tasks).where(eq(tasks.id, taskId)).returning({ id: tasks.id });
  return deleted.length > 0;
}
