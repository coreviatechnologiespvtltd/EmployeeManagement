"use client";

import { useMemo, useState } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination, paginate, pageCountFor } from "@/components/ui/Pagination";
import { TaskCard } from "@/components/employee/TaskCard";
import { TaskStatusControl } from "@/components/employee/TaskStatusControl";
import { ListTodo, ArrowUpDown } from "lucide-react";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { updateTaskStatusAction } from "@/app/employee/actions";
import type { ActionResult } from "@/types/common";
import type { Task, TaskPriority, TaskStatus } from "@/types/task";

const PAGE_SIZE = 6;

const SORTS = [
  { value: "dueDate", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "createdAt", label: "Assigned date" },
  { value: "title", label: "Title" },
] as const;

const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

export function TaskListView({ tasks }: { tasks: Task[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [priority, setPriority] = useState<TaskPriority | "all">("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("dueDate");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = [...tasks];

    if (q) {
      result = result.filter((t) => [t.title, t.description, t.assignedByName].join(" ").toLowerCase().includes(q));
    }
    if (status !== "all") result = result.filter((t) => t.status === status);
    if (priority !== "all") result = result.filter((t) => t.priority === priority);

    const direction = order === "desc" ? -1 : 1;
    result.sort((a, b) => {
      if (sort === "priority") return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * direction;
      if (sort === "createdAt") return (a.createdAt < b.createdAt ? -1 : 1) * direction;
      if (sort === "title") return a.title.localeCompare(b.title) * direction;
      return (a.dueDate < b.dueDate ? -1 : 1) * direction;
    });

    return result;
  }, [tasks, query, status, priority, sort, order]);

  const totalPages = pageCountFor(filtered.length, PAGE_SIZE);
  const safePage = Math.min(page, totalPages);
  const visible = paginate(filtered, safePage, PAGE_SIZE);

  const handleStatusChange = (taskId: string, nextStatus: TaskStatus): Promise<ActionResult> =>
    updateTaskStatusAction(taskId, nextStatus);

  const hasFilters = query.trim() !== "" || status !== "all" || priority !== "all";

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
    setPriority("all");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-ink-100 bg-white p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search tasks…"
            label="Search tasks"
          />
          <Select
            label="Status"
            name="status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as TaskStatus | "all");
              setPage(1);
            }}
            options={[
              { value: "all", label: "All statuses" },
              ...TASK_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            ]}
          />
          <Select
            label="Priority"
            name="priority"
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value as TaskPriority | "all");
              setPage(1);
            }}
            options={[
              { value: "all", label: "All priorities" },
              ...TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label })),
            ]}
          />
          <div className="space-y-1.5">
            <label htmlFor="task-sort" className="block text-sm font-medium text-ink-700">
              Sort by
            </label>
            <div className="flex gap-2">
              <Select
                id="task-sort"
                name="sort"
                className="h-10 flex-1"
                value={sort}
                onChange={(event) => setSort(event.target.value as (typeof SORTS)[number]["value"])}
                options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setOrder((value) => (value === "asc" ? "desc" : "asc"))}
                aria-label={order === "asc" ? "Sort ascending, switch to descending" : "Sort descending, switch to ascending"}
                title={order === "asc" ? "Ascending" : "Descending"}
              >
                <ArrowUpDown aria-hidden className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
            <p className="text-xs text-ink-500">
              Showing <span className="font-medium text-ink-800">{filtered.length}</span> of {tasks.length} tasks
            </p>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-ink-100 bg-white shadow-card">
          <EmptyState
            icon={ListTodo}
            title={hasFilters ? "No matching tasks" : "No tasks assigned yet"}
            description={
              hasFilters
                ? "Try adjusting your search or filter criteria."
                : "When your administrator assigns a task, it will appear here."
            }
            action={hasFilters ? <Button variant="outline" onClick={resetFilters}>Clear filters</Button> : undefined}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
          <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
            {visible.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                href={`/employee/todo/${task.id}`}
                actions={
                  <TaskStatusControl taskId={task.id} currentStatus={task.status} onChange={(next) => handleStatusChange(task.id, next)} />
                }
              />
            ))}
          </div>
          <Pagination
            page={safePage}
            pageCount={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}
    </div>
  );
}
