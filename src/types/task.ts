export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedToId: string;
  assignedToName: string;
  assignedById: string;
  assignedByName: string;
  createdAt: string;
  startDate: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: string;
}

export interface TaskFilters {
  query?: string;
  status?: TaskStatus | "all";
  priority?: TaskPriority | "all";
  sort?: "dueDate" | "priority" | "createdAt" | "title";
  order?: "asc" | "desc";
}
