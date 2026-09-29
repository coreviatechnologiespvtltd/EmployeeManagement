import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/service";
import { getTaskById } from "@/lib/api/tasks";
import { getEmployeeById } from "@/lib/api/employees";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmployeeAvatar } from "@/components/ui/EmployeeAvatar";
import { TaskStatusControl } from "@/components/employee/TaskStatusControl";
import { updateTaskStatusAction } from "@/app/employee/actions";
import { TASK_PRIORITY_META, TASK_STATUS_META } from "@/lib/status";
import { formatDate, formatRelative } from "@/lib/format";
import { CalendarDays, User2, Flag, FileText, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Task details" };

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("employee");
  const task = await getTaskById(id);

  if (!task) notFound();

  // Employees may only open their own tasks.
  if (task.assignedToId !== user.id) notFound();

  const status = TASK_STATUS_META[task.status];
  const priority = TASK_PRIORITY_META[task.priority];
  const assigner = await getEmployeeById(task.assignedById);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Employee Portal", href: "/employee/dashboard" },
          { label: "To-Do List", href: "/employee/todo" },
          { label: "Task details" },
        ]}
        title={task.title}
        description={`Assigned by ${task.assignedByName} on ${formatDate(task.createdAt)}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="Task details">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={status.tone} icon={status.icon}>
                {status.label}
              </Badge>
              <Badge tone={priority.tone} icon={priority.icon}>
                {priority.label} priority
              </Badge>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-500 uppercase">
                <FileText aria-hidden className="h-3.5 w-3.5" />
                Description
              </h3>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-700">{task.description}</p>
            </div>

            <div className="border-t border-ink-100 pt-4">
              <TaskStatusControl
                taskId={task.id}
                currentStatus={task.status}
                showLabel
                onChange={(next) => updateTaskStatusAction(task.id, next)}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Details">
          <dl className="space-y-4">
            <Detail icon={User2} label="Assigned to">
              <span className="flex items-center gap-2">
                <EmployeeAvatar name={task.assignedToName} size="xs" />
                <span className="text-sm font-medium text-ink-900">{task.assignedToName}</span>
              </span>
            </Detail>

            <Detail icon={User2} label="Assigned by">
              <span className="flex items-center gap-2">
                <EmployeeAvatar name={task.assignedByName} size="xs" />
                <span className="text-sm font-medium text-ink-900">{task.assignedByName}</span>
              </span>
              {assigner && <p className="mt-1 text-xs text-ink-400">{assigner.department}</p>}
            </Detail>

            <Detail icon={CalendarDays} label="Start date">
              <span className="text-sm text-ink-800">{formatDate(task.startDate)}</span>
            </Detail>

            <Detail icon={Clock} label="Due date">
              <span className="text-sm text-ink-800">{formatDate(task.dueDate)}</span>
              <span className="ml-1.5 text-xs text-ink-400">({formatRelative(task.dueDate)})</span>
            </Detail>

            <Detail icon={Flag} label="Priority">
              <Badge tone={priority.tone}>{priority.label}</Badge>
            </Detail>

            {task.completedAt && (
              <Detail icon={CheckCircleIcon} label="Completed on">
                <span className="text-sm text-ink-800">{formatDate(task.completedAt)}</span>
              </Detail>
            )}
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
        <Icon aria-hidden className="h-3.5 w-3.5 text-ink-400" />
        {label}
      </dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="m9 12 2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
