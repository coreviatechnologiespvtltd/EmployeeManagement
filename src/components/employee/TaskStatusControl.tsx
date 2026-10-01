"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import { TASK_STATUSES } from "@/lib/constants";
import { updateTaskStatusAction } from "@/app/employee/actions";
import type { TaskStatus } from "@/types/task";

export function TaskStatusControl({
  taskId,
  currentStatus,
  showLabel = true,
}: {
  taskId: string;
  currentStatus: TaskStatus;
  showLabel?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showLabel && (
        <label htmlFor={`status-${taskId}`} className="text-xs font-medium text-ink-500">
          Update status
        </label>
      )}
      <Select
        id={`status-${taskId}`}
        name={`status-${taskId}`}
        className="h-9 w-40 text-xs"
        value={currentStatus}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as TaskStatus;
          startTransition(async () => {
            const result = await updateTaskStatusAction(taskId, next);
            toast(result.message, result.success ? "success" : "error");
            if (result.success) router.refresh();
          });
        }}
        options={TASK_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
      />
    </div>
  );
}
