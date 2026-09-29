import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/cn";
import { TASK_PRIORITY_META, TASK_STATUS_META } from "@/lib/status";
import { formatDate, formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { EmployeeAvatar } from "@/components/ui/EmployeeAvatar";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { Task } from "@/types/task";

export function TaskCard({
  task,
  href,
  compact = false,
  showAssignee = false,
  actions,
}: {
  task: Task;
  href?: Route | `/employee/todo/${string}`;
  compact?: boolean;
  showAssignee?: boolean;
  actions?: React.ReactNode;
}) {
  const status = TASK_STATUS_META[task.status];
  const priority = TASK_PRIORITY_META[task.priority];

  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge tone={status.tone} icon={status.icon}>
            {status.label}
          </Badge>
          <Badge tone={priority.tone}>{priority.label}</Badge>
        </div>
        {!compact && href && <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-ink-300" />}
      </div>

      <h3 className={cn("mt-3 text-sm font-semibold text-ink-900", compact ? "truncate" : "line-clamp-2")}>
        {task.title}
      </h3>

      {!compact && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">{task.description}</p>}

      <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500", compact ? "mt-2" : "mt-4")}>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays aria-hidden className="h-3.5 w-3.5 text-ink-400" />
          Due {formatDate(task.dueDate)} · {formatRelative(task.dueDate)}
        </span>
        {!showAssignee && (
          <span className="inline-flex items-center gap-1.5">
            <EmployeeAvatar name={task.assignedByName} size="xs" />
            By {task.assignedByName}
          </span>
        )}
      </div>

      {actions && <div className="mt-4 border-t border-ink-100 pt-3">{actions}</div>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-card border border-ink-100 bg-white p-4 shadow-card transition-all duration-150 hover:border-brand-200 hover:shadow-card-hover"
      >
        {content}
      </Link>
    );
  }

  return <div className="rounded-card border border-ink-100 bg-white p-4 shadow-card">{content}</div>;
}
