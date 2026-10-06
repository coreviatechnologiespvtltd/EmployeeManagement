"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select, DateField } from "@/components/ui/Select";
import { Input, Textarea } from "@/components/ui/Input";
import { EmployeeAvatar } from "@/components/ui/EmployeeAvatar";
import { FormField } from "@/components/forms/FormField";
import { FormActions, FormErrorMessage, SubmitButton } from "@/components/forms/FormActions";
import { Pagination, paginate, pageCountFor } from "@/components/ui/Pagination";
import { updateTaskFromAdminAction, deleteTaskAction } from "@/app/admin/actions";
import { editTaskSchema } from "@/lib/validations/task";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { TASK_PRIORITY_META, TASK_STATUS_META } from "@/lib/status";
import { formatDate, formatRelative } from "@/lib/format";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Task } from "@/types/task";

const PAGE_SIZE = 8;

export function TaskManagementTable({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "in_progress" | "completed" | "overdue">("all");
  const [priority, setPriority] = useState<"all" | "low" | "medium" | "high" | "urgent">("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Task | null>(null);
  const [confirm, setConfirm] = useState<Task | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (q && ![task.title, task.description, task.assignedToName].join(" ").toLowerCase().includes(q)) return false;
      if (status !== "all" && task.status !== status) return false;
      if (priority !== "all" && task.priority !== priority) return false;
      return true;
    });
  }, [tasks, query, status, priority]);

  const totalPages = pageCountFor(filtered.length, PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const visible = paginate(filtered, safePage, PAGE_SIZE);
  const hasFilters = query !== "" || status !== "all" || priority !== "all";

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setPriority("all");
    setPage(1);
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:max-w-2xl">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search by title or assignee"
            label="Search tasks"
          />
          <Select
            id="task-status"
            label="Status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setPage(1);
            }}
            options={[{ value: "all", label: "All statuses" }, ...TASK_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
          />
          <Select
            id="task-priority"
            label="Priority"
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value as typeof priority);
              setPage(1);
            }}
            options={[{ value: "all", label: "All priorities" }, ...TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))]}
          />
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-500">
              <span className="font-medium text-ink-800">{filtered.length}</span> of {tasks.length}
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-card border border-ink-100 bg-white py-14 text-center shadow-card">
          <p className="text-sm font-semibold text-ink-900">No tasks found</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
            {hasFilters ? "Try adjusting your search or filters." : "Assign your first task to see it listed here."}
          </p>
          {hasFilters && (
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <caption className="sr-only">All staff tasks</caption>
              <thead>
                <tr className="border-b border-ink-100 bg-surface-subtle text-left text-xs text-ink-500">
                  <th scope="col" className="px-5 py-3 font-medium">Task</th>
                  <th scope="col" className="px-4 py-3 font-medium">Assignee</th>
                  <th scope="col" className="px-4 py-3 font-medium">Priority</th>
                  <th scope="col" className="px-4 py-3 font-medium">Due</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {visible.map((task) => {
                  const statusMeta = TASK_STATUS_META[task.status];
                  const priorityMeta = TASK_PRIORITY_META[task.priority];

                  return (
                    <tr key={task.id} className="transition-colors duration-150 hover:bg-surface-subtle">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink-900">{task.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-ink-500">{task.description}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <EmployeeAvatar name={task.assignedToName} size="xs" />
                          <span className="whitespace-nowrap text-ink-700">{task.assignedToName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={priorityMeta.tone} dot>
                          {priorityMeta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="text-ink-700">{formatDate(task.dueDate)}</p>
                        {task.status !== "completed" && (
                          <p className="text-xs text-ink-400">{formatRelative(task.dueDate)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end">
                          <DropdownMenu
                            trigger={
                              <Button variant="ghost" size="icon" aria-label={`Actions for ${task.title}`}>
                                <MoreHorizontal aria-hidden className="h-4 w-4" />
                              </Button>
                            }
                            items={[
                              {
                                label: "Edit task",
                                icon: <Pencil aria-hidden className="h-4 w-4" />,
                                onSelect: () => setEditing(task),
                              },
                              {
                                label: "Delete",
                                icon: <Trash2 aria-hidden className="h-4 w-4" />,
                                danger: true,
                                onSelect: () => setConfirm(task),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

      <EditTaskModal task={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="Delete task"
        message={confirm ? `"${confirm.title}" will be removed permanently.` : "This cannot be undone."}
        confirmLabel="Delete"
        isPending={pending}
        onConfirm={() => {
          if (!confirm) return;
          startTransition(async () => {
            const result = await deleteTaskAction(confirm.id);
            toast(result.message, result.success ? "success" : "error");
            if (result.success) {
              setConfirm(null);
              router.refresh();
            }
          });
        }}
      />
    </>
  );
}

type Values = z.infer<typeof editTaskSchema>;
type FormValues = z.input<typeof editTaskSchema>;

function EditTaskModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | undefined>();
  const [seededFor, setSeededFor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      taskId: "",
      title: "",
      description: "",
      priority: "medium",
      dueDate: "",
      status: "pending",
    },
  });

  if (task && seededFor !== task.id) {
    setSeededFor(task.id);
    reset({
      taskId: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      status: task.status,
    });
  }
  if (!task && seededFor !== null) setSeededFor(null);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    const result = await updateTaskFromAdminAction(task?.id ?? values.taskId, values);

    if (result.success) {
      toast(result.message, "success");
      onClose();
      router.refresh();
      return;
    }

    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages?.[0]) setError(field as keyof FormValues, { message: messages[0] });
      }
    }
    setServerError(result.message);
    toast(result.message, "error");
  });

  return (
    <Modal
      open={task !== null}
      onClose={onClose}
      title="Edit Task"
      description={task ? `Update "${task.title}".` : undefined}
      size="lg"
      footer={
        <FormActions>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="edit-task-form" isLoading={isSubmitting} loadingText="Saving…">
            Save Changes
          </Button>
        </FormActions>
      }
    >
      <form id="edit-task-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormErrorMessage message={serverError} />
        <input type="hidden" {...register("taskId")} />

        <FormField label="Title" htmlFor="edit-task-title" error={errors.title?.message} required>
          <Input id="edit-task-title" error={errors.title?.message} {...register("title")} />
        </FormField>

        <FormField label="Description" htmlFor="edit-task-description" error={errors.description?.message} required>
          <Textarea id="edit-task-description" rows={5} error={errors.description?.message} {...register("description")} />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-3">
          <FormField label="Priority" htmlFor="edit-task-priority" error={errors.priority?.message} required>
            <Select
              id="edit-task-priority"
              options={TASK_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
              error={errors.priority?.message}
              {...register("priority")}
            />
          </FormField>
          <FormField label="Due Date" htmlFor="edit-task-due" error={errors.dueDate?.message} required>
            <DateField id="edit-task-due" error={errors.dueDate?.message} {...register("dueDate")} />
          </FormField>
          <FormField label="Status" htmlFor="edit-task-status" error={errors.status?.message} required>
            <Select
              id="edit-task-status"
              options={TASK_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              error={errors.status?.message}
              {...register("status")}
            />
          </FormField>
        </div>

        <SubmitButton className="sr-only" loadingText="Saving…">
          Save
        </SubmitButton>
      </form>
    </Modal>
  );
}
