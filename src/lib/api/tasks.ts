import "server-only";
import { db, nextId } from "@/lib/db/store";
import { requireActionRole } from "@/lib/auth/actions";
import { simulateLatency } from "./latency";
import { today } from "@/lib/format";
import type { Task, TaskFilters, TaskPriority, TaskStatus } from "@/types/task";

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

const byNewest = (a: Task, b: Task) => (a.createdAt < b.createdAt ? 1 : -1);

/** Derives the effective status so past-due open tasks always read as overdue. */
export function withEffectiveStatus(task: Task): Task {
  if (task.status === "completed" || task.status === "overdue") return task;
  return task.dueDate < today() ? { ...task, status: "overdue" } : task;
}

function applyFilters(tasks: Task[], filters: TaskFilters): Task[] {
  let result = tasks;

  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter((t) =>
      [t.title, t.description, t.assignedToName, t.assignedByName].join(" ").toLowerCase().includes(q),
    );
  }
  if (filters.status && filters.status !== "all") {
    result = result.filter((t) => t.status === filters.status);
  }
  if (filters.priority && filters.priority !== "all") {
    result = result.filter((t) => t.priority === filters.priority);
  }

  const key = filters.sort ?? "dueDate";
  const direction = filters.order === "desc" ? -1 : 1;
  result.sort((a, b) => {
    if (key === "priority") return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * direction;
    if (key === "title") return a.title.localeCompare(b.title) * direction;
    if (key === "createdAt") return (a.createdAt < b.createdAt ? -1 : 1) * direction;
    return (a.dueDate < b.dueDate ? -1 : 1) * direction;
  });

  return result;
}

export async function listTasksForEmployee(
  employeeId: string,
  filters: TaskFilters = {},
): Promise<Task[]> {
  await simulateLatency(150);
  const own = db.tasks.filter((t) => t.assignedToId === employeeId).map(withEffectiveStatus);
  return applyFilters(own, filters);
}

export async function listAllTasks(filters: TaskFilters = {}): Promise<Task[]> {
  await simulateLatency(180);
  return applyFilters(db.tasks.map(withEffectiveStatus), filters);
}

export async function getTaskById(id: string): Promise<Task | null> {
  await simulateLatency(80);
  const task = db.tasks.find((t) => t.id === id);
  return task ? withEffectiveStatus(task) : null;
}

export interface TaskCounts {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export async function getTaskCountsForEmployee(employeeId: string): Promise<TaskCounts> {
  await simulateLatency(100);
  const own = db.tasks.filter((t) => t.assignedToId === employeeId).map(withEffectiveStatus);
  return {
    total: own.length,
    pending: own.filter((t) => t.status === "pending").length,
    inProgress: own.filter((t) => t.status === "in_progress").length,
    completed: own.filter((t) => t.status === "completed").length,
    overdue: own.filter((t) => t.status === "overdue").length,
  };
}

export async function getGlobalTaskCounts(): Promise<TaskCounts> {
  await simulateLatency(120);
  const all = db.tasks.map(withEffectiveStatus);
  return {
    total: all.length,
    pending: all.filter((t) => t.status === "pending").length,
    inProgress: all.filter((t) => t.status === "in_progress").length,
    completed: all.filter((t) => t.status === "completed").length,
    overdue: all.filter((t) => t.status === "overdue").length,
  };
}

export async function getRecentTasksForEmployee(employeeId: string, limit = 5): Promise<Task[]> {
  await simulateLatency(120);
  return db.tasks
    .filter((t) => t.assignedToId === employeeId)
    .map(withEffectiveStatus)
    .sort(byNewest)
    .slice(0, limit);
}

export async function getRecentTasks(limit = 5): Promise<Task[]> {
  await simulateLatency(120);
  return db.tasks.map(withEffectiveStatus).sort(byNewest).slice(0, limit);
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
  await simulateLatency(360);

  const assigneeIds = input.assignedToIds.length > 0 ? input.assignedToIds : [actor.id];
  const created: Task[] = [];

  for (const employeeId of assigneeIds) {
    const employee = db.employees.find((e) => e.id === employeeId);
    if (!employee) continue;

    created.push({
      id: nextId("tsk"),
      title: input.title.trim(),
      description: input.description.trim(),
      assignedToId: employee.id,
      assignedToName: employee.fullName,
      assignedById: assignedById || actor.id,
      assignedByName: actor.name,
      createdAt: new Date().toISOString(),
      startDate: input.startDate,
      dueDate: input.dueDate,
      priority: input.priority,
      status: input.startDate > today() ? "pending" : "in_progress",
    });
  }

  db.tasks.push(...created);
  return created.length;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, actingUserId: string, isAdmin: boolean): Promise<Task | null> {
  if (!isAdmin) await requireActionRole("employee", "admin");
  else await requireActionRole("admin");
  await simulateLatency(220);

  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  if (!isAdmin && task.assignedToId !== actingUserId) return null;

  task.status = status;
  task.completedAt = status === "completed" ? new Date().toISOString() : undefined;
  return withEffectiveStatus(task);
}

export async function updateTaskFromAdmin(
  taskId: string,
  input: Partial<Pick<Task, "title" | "description" | "priority" | "dueDate" | "status" | "assignedToId">>,
): Promise<Task | null> {
  await requireActionRole("admin");
  await simulateLatency(280);

  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  if (input.assignedToId) {
    const employee = db.employees.find((e) => e.id === input.assignedToId);
    if (employee) {
      task.assignedToId = employee.id;
      task.assignedToName = employee.fullName;
    }
  }
  if (input.title) task.title = input.title.trim();
  if (input.description !== undefined) task.description = input.description.trim();
  if (input.priority) task.priority = input.priority;
  if (input.dueDate) task.dueDate = input.dueDate;
  if (input.status) {
    task.status = input.status;
    task.completedAt = input.status === "completed" ? new Date().toISOString() : undefined;
  }

  return withEffectiveStatus(task);
}

export async function deleteTask(taskId: string): Promise<boolean> {
  await requireActionRole("admin");
  await simulateLatency(240);
  const index = db.tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return false;
  db.tasks.splice(index, 1);
  return true;
}
