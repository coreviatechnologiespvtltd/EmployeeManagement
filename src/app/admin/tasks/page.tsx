import type { Metadata } from "next";
import Link from "next/link";
import { listAllTasks, getGlobalTaskCounts } from "@/lib/api/tasks";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { Button } from "@/components/ui/Button";
import { TaskManagementTable } from "@/components/admin/TaskManagementTable";
import { ListTodo, Clock, Loader2, CheckCircle2, AlertTriangle, ListPlus } from "lucide-react";

export const metadata: Metadata = { title: "Staff To-Do Lists" };

export default async function AdminTasksPage() {
  const [tasks, counts] = await Promise.all([listAllTasks(), getGlobalTaskCounts()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff To-Do Lists"
        description="Track and manage every task assigned across the organisation."
        action={
          <Link href="/admin/tasks/create">
            <Button>
              <ListPlus aria-hidden className="h-4 w-4" />
              Assign Task
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Total Tasks" value={counts.total} icon={ListTodo} tone="info" />
        <DashboardCard label="Pending" value={counts.pending} icon={Clock} tone="neutral" />
        <DashboardCard label="In Progress" value={counts.inProgress} icon={Loader2} tone="warning" />
        <DashboardCard
          label={counts.overdue > 0 ? "Overdue" : "Completed"}
          value={counts.overdue > 0 ? counts.overdue : counts.completed}
          sublabel={counts.overdue > 0 ? "Past due date" : "Finished tasks"}
          icon={counts.overdue > 0 ? AlertTriangle : CheckCircle2}
          tone={counts.overdue > 0 ? "danger" : "success"}
        />
      </div>

      <TaskManagementTable tasks={tasks} />
    </div>
  );
}
