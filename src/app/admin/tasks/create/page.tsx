import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssignTaskForm } from "@/components/admin/AssignTaskForm";
import { getEmployeeOptions } from "@/lib/api/employees";

export const metadata: Metadata = { title: "Assign Task" };

export default async function CreateTaskPage() {
  const staff = await getEmployeeOptions();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Admin Console", href: "/admin/dashboard" },
          { label: "Staff To-Do Lists", href: "/admin/tasks" },
          { label: "Assign Task" },
        ]}
        title="Assign Task"
        description="Create a task and assign it to one or more staff members."
      />
      <AssignTaskForm staff={staff} />
    </div>
  );
}
