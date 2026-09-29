import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth/service";
import { listTasksForEmployee, getTaskCountsForEmployee } from "@/lib/api/tasks";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { TaskListView } from "@/components/employee/TaskListView";
import { ListPageSkeleton } from "@/components/ui/page-skeletons";
import { ListTodo, Clock, CheckCircle2, AlertTriangle, Hourglass } from "lucide-react";

export const metadata: Metadata = { title: "To-Do List" };

export default async function EmployeeTodoPage() {
  const user = await requireRole("employee");

  return (
    <div className="space-y-6">
      <PageHeader
        title="To-Do List"
        description="Tasks assigned to you by your administrator."
      />

      <Suspense fallback={<ListPageSkeleton rows={4} columns={2} />}>
        <TodoContent employeeId={user.id} />
      </Suspense>
    </div>
  );
}

async function TodoContent({ employeeId }: { employeeId: string }) {
  const [tasks, counts] = await Promise.all([listTasksForEmployee(employeeId), getTaskCountsForEmployee(employeeId)]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Total Tasks" value={counts.total} icon={ListTodo} tone="info" />
        <DashboardCard label="In Progress" value={counts.inProgress} icon={Hourglass} tone="info" />
        <DashboardCard label="Overdue" value={counts.overdue} icon={AlertTriangle} tone="danger" />
        <DashboardCard label="Completed" value={counts.completed} icon={CheckCircle2} tone="success" />
      </div>

      <TaskListView tasks={tasks} />
    </div>
  );
}

export { Clock };
